const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Work = require('../models/Work');
const Collaboration = require('../models/Collaboration');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { createDiskStorage } = require('../services/storage');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedDocumentTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const allowedRoles = ['artist', 'writer', 'editor', 'admin', 'consumer'];

const profileUpload = multer({
    storage: createDiskStorage('profiles'),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only images are allowed for profile pictures'));
        }
        cb(null, true);
    }
});

const collaborationFileUpload = multer({
    storage: createDiskStorage('collaborations'),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(req, file, cb) {
        if (!allowedDocumentTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'));
        }
        cb(null, true);
    }
});

const workUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(req, file, cb) {
        if (!allowedDocumentTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'));
        }
        cb(null, true);
    }
});

function parseArrayField(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        try {
            const parsedValue = JSON.parse(value);
            return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [];
        } catch (error) {
            return value
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);
        }
    }

    return [];
}

function sanitizeUser(user) {
    return {
        _id: user._id,
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        about: user.about || '',
        bio: user.bio || '',
        role: user.role,
        genres: user.genres || [],
        skills: user.skills || [],
        profileCompletion: user.profileCompletion || 0,
        createdAt: user.createdAt
    };
}

function sanitizeWork(work) {
    return {
        _id: work._id,
        title: work.title,
        description: work.description,
        mimeType: work.mimeType,
        fileType: work.fileType,
        createdAt: work.createdAt,
        fileUrl: `/api/users/works/${work._id}/file`
    };
}

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        await user.updateLastActive();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, name, role } = req.body;

        if (!username || !email || !password || !name || !role) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const normalizedRole = String(role).toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role selected'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            name,
            role: normalizedRole,
            profilePicture: 'images/default-avatar.png'
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please login.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error during registration'
        });
    }
});

// Get current user's profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Error in /me endpoint:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, about, bio, role } = req.body;
        const genres = parseArrayField(req.body.genres);
        const skills = parseArrayField(req.body.skills);
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (typeof name === 'string' && name.trim()) {
            user.name = name.trim();
        }
        if (about !== undefined) {
            user.about = String(about).trim();
        }
        if (bio !== undefined) {
            user.bio = String(bio).trim();
        }
        if (role) {
            const normalizedRole = String(role).toLowerCase();
            if (!allowedRoles.includes(normalizedRole)) {
                return res.status(400).json({ error: 'Invalid role selected' });
            }
            user.role = normalizedRole;
        }

        user.genres = genres;
        user.skills = skills;

        await user.save();

        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user settings
router.put('/settings', auth, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { settings: req.body } },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error updating settings' });
    }
});

// Get user's works
router.get('/works', auth, async (req, res) => {
    try {
        const works = await Work.find({ user: req.user.id }).sort('-createdAt');
        res.json(works.map(sanitizeWork));
    } catch (error) {
        console.error('Error fetching works:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's collaborations
router.get('/collaborations', auth, async (req, res) => {
    try {
        const collaborations = await Collaboration.find({
            $or: [
                { artist: req.user.id },
                { writer: req.user.id }
            ]
        })
        .populate('artist', 'name profilePicture')
        .populate('writer', 'name profilePicture')
        .sort('-createdAt');

        res.json(collaborations);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching collaborations' });
    }
});

// Update collaboration progress
router.put('/collaborations/:id/progress', auth, async (req, res) => {
    try {
        const collaboration = await Collaboration.findById(req.params.id);
        
        if (!collaboration) {
            return res.status(404).json({ error: 'Collaboration not found' });
        }

        // Check if user is part of the collaboration
        if (collaboration.artist.toString() !== req.user.id && 
            collaboration.writer.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        collaboration.progress = req.body.progress;
        await collaboration.save();

        res.json(collaboration);
    } catch (error) {
        res.status(500).json({ error: 'Error updating progress' });
    }
});

// Add file to collaboration
router.post('/collaborations/:id/files', auth, collaborationFileUpload.single('file'), async (req, res) => {
    try {
        const collaboration = await Collaboration.findById(req.params.id);
        
        if (!collaboration) {
            return res.status(404).json({ error: 'Collaboration not found' });
        }

        // Check if user is part of the collaboration
        if (collaboration.artist.toString() !== req.user.id && 
            collaboration.writer.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        collaboration.files.push({
            name: req.file.originalname,
            url: `/uploads/collaborations/${req.file.filename}`,
            type: req.file.mimetype,
            uploadedBy: req.user.id
        });

        await collaboration.save();
        res.json(collaboration);
    } catch (error) {
        res.status(500).json({ error: 'Error adding file' });
    }
});

// Get user matches
router.get('/matches', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('matches.user', 'name profilePicture role');
        res.json(user.matches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update match status
router.put('/matches/:userId', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findById(req.user.id);
        
        const matchIndex = user.matches.findIndex(
            match => match.user.toString() === req.params.userId
        );

        if (matchIndex === -1) {
            return res.status(404).json({ message: 'Match not found' });
        }

        user.matches[matchIndex].status = status;
        await user.save();

        res.json(user.matches[matchIndex]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create test user if no users exist
router.post('/create-test-user', async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: 'test@example.com' });
        if (existingUser) {
            return res.json({ message: 'Test user already exists' });
        }

        const testUser = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            role: 'artist'
        });

        await testUser.save();
        res.json({ message: 'Test user created successfully' });
    } catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({ message: error.message });
    }
});

// Check if any users exist
router.get('/check-users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ count: users.length, users: users.map(user => ({ email: user.email, name: user.name })) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get profile picture
router.get('/profile-picture', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.profilePicture) {
            return res.status(404).json({ error: 'Profile picture not found' });
        }

        res.json({ profilePicture: user.profilePicture });
    } catch (error) {
        console.error('Error fetching profile picture:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload profile picture
router.post('/profile-picture', auth, profileUpload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.profilePicture && user.profilePicture.startsWith('/uploads/profiles/')) {
            const previousFilePath = path.join(__dirname, '..', 'public', user.profilePicture);
            await fsPromises.unlink(previousFilePath).catch(() => {});
        }

        user.profilePicture = `/uploads/profiles/${req.file.filename}`;

        await user.save();

        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get work file
router.get('/works/:id/file', auth, async (req, res) => {
    try {
        const work = await Work.findOne({ _id: req.params.id, user: req.user.id });
        if (!work || !work.fileData) {
            return res.status(404).json({ error: 'Work not found' });
        }

        res.set('Content-Type', work.mimeType);
        res.send(work.fileData);
    } catch (error) {
        console.error('Error fetching work file:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload work
router.post('/works', auth, workUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const work = new Work({
            user: req.user.id,
            title,
            description,
            fileData: req.file.buffer,
            mimeType: req.file.mimetype,
            fileType: req.file.mimetype.startsWith('image/') ? 'image' : 'document'
        });

        await work.save();

        const user = await User.findById(req.user.id);
        if (user) {
            user.works.push(work._id);
            await user.save();
        }

        res.json(sanitizeWork(work));
    } catch (error) {
        console.error('Error uploading work:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete work
router.delete('/works/:id', auth, async (req, res) => {
    try {
        const work = await Work.findOne({ _id: req.params.id, user: req.user.id });
        if (!work) {
            return res.status(404).json({ error: 'Work not found' });
        }

        const user = await User.findById(req.user.id);
        if (user) {
            user.works = user.works.filter(w => w.toString() !== req.params.id);
            await user.save();
        }

        await Work.deleteOne({ _id: req.params.id });
        res.json({ message: 'Work deleted successfully' });
    } catch (error) {
        console.error('Error deleting work:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 

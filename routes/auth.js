const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, genres } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email or username already exists'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            role,
            genres
        });

        await user.save();

        res.status(201).json({
            message: 'Registration successful! Please login to continue.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            message: 'Error during registration'
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'pixelscript_secret_key_2024_secure_token',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic,
                genres: user.genres
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Error during login'
        });
    }
});

// Verify token route
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: 'Invalid token'
            });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic,
                genres: user.genres
            }
        });
    } catch (error) {
        res.status(401).json({
            message: 'Invalid token'
        });
    }
});

module.exports = router; 
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET environment variable');
}

const AUTH_COOKIE_NAME = 'ps_auth';
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
};

function extractCookieValue(cookieHeader, key) {
    if (!cookieHeader || !key) {
        return null;
    }

    const parts = String(cookieHeader).split(';');
    for (const part of parts) {
        const [rawName, ...rawValue] = part.trim().split('=');
        if (rawName === key) {
            return decodeURIComponent(rawValue.join('='));
        }
    }

    return null;
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts. Please try again later.' }
});

// Register route
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password, name, role, genres } = req.body;

        // Validate required fields
        if (!username || !email || !password || !name) {
            return res.status(400).json({
                message: 'Please provide username, email, password, and name'
            });
        }

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
            name,
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
router.post('/login', authLimiter, async (req, res) => {
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
            jwtSecret,
            { expiresIn: '24h' }
        );

        res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
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

router.post('/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
        secure: AUTH_COOKIE_OPTIONS.secure,
        sameSite: AUTH_COOKIE_OPTIONS.sameSite,
        path: AUTH_COOKIE_OPTIONS.path
    });

    res.json({ message: 'Logged out' });
});

// Verify token route
router.get('/verify', async (req, res) => {
    try {
        const bearerToken = req.headers.authorization?.split(' ')[1];
        const cookieToken = extractCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
        const token = cookieToken || bearerToken;
        if (!token) {
            return res.status(401).json({
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, jwtSecret);
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
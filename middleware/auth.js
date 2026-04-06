const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Extract token from Bearer format
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Invalid token format' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Find user by ID
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Normalize identity fields so all routes can safely use
        // req.user.id, req.user.userId, or req.user._id.
        req.user = user;
        req.user.id = user._id.toString();
        req.user.userId = user._id.toString();
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(401).json({ message: 'Authentication failed' });
    }
}; 

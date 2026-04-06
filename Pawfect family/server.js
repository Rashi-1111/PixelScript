require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data
app.use('/images', express.static('images')); // Serve uploaded images
app.use(express.static('.')); // Serve HTML files

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pawfect_family')
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/adoption', require('./routes/adoption'));

// Basic route - redirect to home page
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
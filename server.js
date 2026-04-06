require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

// Import routes
const userRoutes = require('./routes/user');
const collabRoutes = require('./routes/collab');
const storyRoutes = require('./routes/story');
const purchaseRoutes = require('./routes/purchase');
const contactRoutes = require('./routes/contact');
const workspaceRoutes = require('./routes/workspace');

// Import middleware
const errorHandler = require('./middleware/error');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/pixelscript',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax'
    }
}));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/collab', collabRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Public routes that don't require authentication
app.get('/collaborations/:page', (req, res) => {
    const filePath = path.join(__dirname, 'public/collaborations', req.params.page);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.redirect('/login.html');
    }
});

// Handle all other routes by serving the appropriate HTML file
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath)) {
        if (req.path.startsWith('/collaborations/')) {
            // For collaboration pages, check if user is authenticated
            if (req.session && req.session.userId) {
                res.sendFile(filePath);
            } else {
                res.redirect('/login.html');
            }
        } else {
            res.sendFile(filePath);
        }
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Store active collaborations
const activeCollaborations = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join collaboration room
    socket.on('joinRoom', ({ room, isPrimaryUser }) => {
        socket.join(room);
        if (!activeCollaborations.has(room)) {
            activeCollaborations.set(room, {
                users: new Map(), // Changed to Map to store user type
                canvasState: null,
                chat: [],
                primaryUser: isPrimaryUser ? socket.id : null
            });
        }
        const collab = activeCollaborations.get(room);
        
        // Always ensure the room has a primary user. Prefer the claimed host,
        // but fall back to the first user who joins if needed.
        if (!collab.primaryUser) {
            collab.primaryUser = socket.id;
        } else if (isPrimaryUser) {
            collab.primaryUser = socket.id;
        }
        
        // Store user type
        collab.users.set(socket.id, {
            isPrimary: socket.id === collab.primaryUser
        });
        
        // Send current canvas state to new user
        if (collab.canvasState) {
            socket.emit('canvasState', collab.canvasState);
        }
        
        // Notify all users in the room about new user
        io.to(room).emit('userJoined', { 
            userCount: collab.users.size,
            isPrimaryUser: socket.id === collab.primaryUser
        });
    });

    // Handle chat messages
    socket.on('chatMessage', ({ room, message, sender }) => {
        socket.to(room).emit('chatMessage', { message, sender });
    });

    // Handle drawing events - only allow from primary user
    socket.on('draw', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            socket.to(data.room).emit('draw', data);
        }
    });

    // Handle canvas state updates - only allow from primary user
    socket.on('canvasState', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            collab.canvasState = data.state;
            socket.to(data.room).emit('canvasState', data.state);
        }
    });

    // Handle clear canvas - only allow from primary user
    socket.on('clear', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            socket.to(data.room).emit('clear');
        }
    });

    // Handle undo/redo - only allow from primary user
    socket.on('undo', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            socket.to(data.room).emit('undo');
        }
    });

    socket.on('redo', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            socket.to(data.room).emit('redo');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        activeCollaborations.forEach((collab, room) => {
            if (collab.users.has(socket.id)) {
                collab.users.delete(socket.id);
                // If primary user left, clear that status
                if (collab.primaryUser === socket.id) {
                    collab.primaryUser = null;
                }
                // Notify remaining users about the disconnection
                io.to(room).emit('userLeft', { 
                    userCount: collab.users.size
                });
                if (collab.users.size === 0) {
                    activeCollaborations.delete(room);
                }
            }
        });
    });
});

// Error handling middleware
app.use(errorHandler);

// Only start server if MongoDB connects successfully
mongoose.connection.once('open', () => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(1);
});

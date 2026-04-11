require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
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
const aiRoutes = require('./routes/ai');

// Import middleware
const errorHandler = require('./middleware/error');

const app = express();
const server = http.createServer(app);
const sessionSecret = process.env.SESSION_SECRET;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const publicRoot = path.resolve(__dirname, 'public');
const socketAllowedOrigins = (process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const ROOM_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

if (!sessionSecret) {
    throw new Error('Missing SESSION_SECRET environment variable');
}

if (!mongoUri) {
    throw new Error('Missing MONGO_URI (or MONGODB_URI) environment variable');
}

function resolveSafePublicPath(requestPath = '') {
    const normalized = path.posix.normalize(`/${String(requestPath || '')}`).replace(/^\/+/, '');
    const resolved = path.resolve(publicRoot, normalized);
    if (resolved === publicRoot || resolved.startsWith(`${publicRoot}${path.sep}`)) {
        return resolved;
    }
    return null;
}

const io = socketIo(server, {
    cors: {
        origin: socketAllowedOrigins,
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
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUri,
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
app.use('/api/ai', aiRoutes);

// Public routes that don't require authentication
app.get('/collaborations/:page', (req, res) => {
    const safePath = resolveSafePublicPath(`collaborations/${req.params.page}`);
    if (!safePath) {
        return res.status(400).send('Invalid path');
    }

    return res.sendFile(safePath, error => {
        if (error) {
            return res.redirect('/login.html');
        }
    });
});

// Handle all other routes by serving the appropriate HTML file
app.get('*', (req, res) => {
    const safePath = resolveSafePublicPath(req.path);
    const indexPath = path.join(publicRoot, 'index.html');

    if (!safePath) {
        return res.status(400).send('Invalid path');
    }

    if (req.path.startsWith('/collaborations/') && !(req.session && req.session.userId)) {
        return res.redirect('/login.html');
    }

    return res.sendFile(safePath, error => {
        if (error) {
            return res.sendFile(indexPath);
        }
    });
});

// Store active collaborations
const activeCollaborations = new Map();

function touchCollaboration(collaboration) {
    if (collaboration) {
        collaboration.lastActivity = Date.now();
    }
}

setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL_MS;
    activeCollaborations.forEach((collaboration, room) => {
        if ((collaboration.lastActivity || 0) < cutoff) {
            activeCollaborations.delete(room);
        }
    });
}, ROOM_CLEANUP_INTERVAL_MS);

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
                primaryUser: isPrimaryUser ? socket.id : null,
                lastActivity: Date.now()
            });
        }
        const collab = activeCollaborations.get(room);
        touchCollaboration(collab);

        // Only a client that explicitly joins as primary can become the drawer.
        if (isPrimaryUser) {
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
    socket.on('chatMessage', payload => {
        const room = payload?.room;
        if (!room || !activeCollaborations.has(room)) {
            return;
        }

        const collab = activeCollaborations.get(room);
        touchCollaboration(collab);

        socket.to(room).emit('chatMessage', {
            message: String(payload?.message || ''),
            sender: String(payload?.sender || 'Collaborator'),
            sentAt: payload?.sentAt || new Date().toISOString(),
            attachment: payload?.attachment || null
        });
    });

    // Handle drawing events - only allow from primary user
    socket.on('draw', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            touchCollaboration(collab);
            socket.to(data.room).emit('draw', data);
        }
    });

    // Handle canvas state updates - only allow from primary user
    socket.on('canvasState', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            touchCollaboration(collab);
            collab.canvasState = data.state;
            socket.to(data.room).emit('canvasState', data.state);
        }
    });

    // Handle clear canvas - only allow from primary user
    socket.on('clear', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            touchCollaboration(collab);
            if (typeof data.state === 'string') {
                collab.canvasState = data.state;
            }
            socket.to(data.room).emit('clear', { state: data.state || '' });
        }
    });

    // Handle undo/redo - only allow from primary user
    socket.on('undo', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            touchCollaboration(collab);
            if (typeof data.state === 'string') {
                collab.canvasState = data.state;
            }
            socket.to(data.room).emit('undo', { state: data.state || '' });
        }
    });

    socket.on('redo', (data) => {
        const collab = activeCollaborations.get(data.room);
        if (collab && socket.id === collab.primaryUser) {
            touchCollaboration(collab);
            if (typeof data.state === 'string') {
                collab.canvasState = data.state;
            }
            socket.to(data.room).emit('redo', { state: data.state || '' });
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

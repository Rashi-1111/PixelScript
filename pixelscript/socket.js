const socketIO = require('socket.io');

function initializeSocket(server) {
    const io = socketIO(server);
    const rooms = new Map(); // Store room data

    io.on('connection', (socket) => {
        console.log('New client connected');

        // Handle joining a room
        socket.on('join-room', (roomId) => {
            socket.join(roomId);
            console.log(`User joined room: ${roomId}`);

            // Initialize room if it doesn't exist
            if (!rooms.has(roomId)) {
                rooms.set(roomId, {
                    users: new Set(),
                    canvasData: null
                });
            }
            rooms.get(roomId).users.add(socket.id);

            // Notify others in the room
            socket.to(roomId).emit('user-joined', { userId: socket.id });
        });

        // Handle drawing events
        socket.on('draw-start', (data) => {
            socket.to(data.roomId).emit('draw-start', data);
        });

        socket.on('draw', (data) => {
            socket.to(data.roomId).emit('draw', data);
        });

        socket.on('draw-end', (data) => {
            socket.to(data.roomId).emit('draw-end', data);
        });

        socket.on('draw-shape', (data) => {
            socket.to(data.roomId).emit('draw-shape', data);
        });

        // Handle tool changes
        socket.on('tool-change', (data) => {
            socket.to(data.roomId).emit('tool-change', data);
        });

        socket.on('color-change', (data) => {
            socket.to(data.roomId).emit('color-change', data);
        });

        socket.on('size-change', (data) => {
            socket.to(data.roomId).emit('size-change', data);
        });

        // Handle chat messages
        socket.on('chat-message', (data) => {
            socket.to(data.roomId).emit('chat-message', data);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Client disconnected');
            // Remove user from all rooms
            rooms.forEach((room, roomId) => {
                if (room.users.has(socket.id)) {
                    room.users.delete(socket.id);
                    socket.to(roomId).emit('user-left', { userId: socket.id });
                    
                    // Clean up empty rooms
                    if (room.users.size === 0) {
                        rooms.delete(roomId);
                    }
                }
            });
        });
    });

    return io;
}

module.exports = initializeSocket; 
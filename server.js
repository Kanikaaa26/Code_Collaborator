const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const authRouter = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { processClient: false }); // To prevent multiple socket instances from creating duplicate loops

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', authRouter);

// Demo Run Code endpoint
app.post('/run', (req, res) => {
    // In a real application, you would use a secured sandbox or a service like Judge0
    // For this college project demo we'll use a very simple and potentially unsafe eval() implementation for JS only
    // or just return a mock run. We'll do a mock or simple child_process
    const { code, language } = req.body;

    if (language === 'javascript') {
        try {
            // Very unsafe, only for demo purposes! Use child_process in a real scenario
            let logOutput = [];
            const originalLog = console.log;
            console.log = (...args) => logOutput.push(args.join(' '));

            // eslint-disable-next-line no-eval
            eval(code);

            console.log = originalLog;
            res.json({ output: logOutput.join('\n') });
        } catch (error) {
            res.json({ output: error.message });
        }
    } else {
        res.json({ output: `Execution for ${language} is simulated in this demo.\nCode received successfully.` });
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId, username) => {
        socket.join(roomId);
        socket.username = username;
        socket.roomId = roomId;

        // Notify others in the room
        socket.to(roomId).emit('user-connected', { username, id: socket.id });
        console.log(`${username} joined room ${roomId}`);
    });

    socket.on('code-change', (data) => {
        // Broadcast the generated code back to everyone else in the room
        socket.to(socket.roomId).emit('code-change', data);
    });

    socket.on('cursor-move', (data) => {
        // Broadcast cursor position
        socket.to(socket.roomId).emit('cursor-move', { ...data, id: socket.id, username: socket.username });
    });

    socket.on('typing-start', () => {
        socket.to(socket.roomId).emit('typing-start', { username: socket.username });
    });

    socket.on('typing-stop', () => {
        socket.to(socket.roomId).emit('typing-stop', { username: socket.username });
    });

    socket.on('chat-message', (data) => {
        // Emits to all including sender so frontend can standardize the display, or just broadcast?
        // Let's broadcast and let sender render their own message.
        socket.to(socket.roomId).emit('chat-message', {
            username: socket.username,
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // WebRTC signaling
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.roomId && socket.username) {
            socket.to(socket.roomId).emit('user-disconnected', { username: socket.username, id: socket.id });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

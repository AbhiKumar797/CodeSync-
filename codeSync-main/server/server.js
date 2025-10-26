const express = require("express");
const app = express();
require("dotenv").config(); // Make sure dotenv is configured
const http = require("http");
const cors = require("cors");
const ACTIONS = require("./utils/actions");
const { Server } = require("socket.io"); // Import Server from socket.io

// --- CORS Configuration ---
const allowedOrigins = [process.env.CORS_ORIGIN].filter(Boolean); // Get URL from env var

// Add localhost for development if not in production
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173'); // Your Vite dev port
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like Render health checks, curl, mobile apps in some cases)
        // OR allow if the origin is in our explicitly defined list.
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
             console.log(`CORS check: Allowed origin: ${origin || 'none'}`); // Log allowed origins
             callback(null, true);
        } else {
             console.error(`CORS check: Blocked origin: ${origin}`); // Log blocked origins
             callback(new Error('Not allowed by CORS'));
        }
     },
     credentials: true // Set this if you need cookies/sessions across origins
 };

app.use(express.json());

// --- Apply CORS Middleware to Express ---
// Apply CORS middleware *before* Socket.IO setup that uses the server
app.use(cors(corsOptions));

// --- Socket.IO Server Setup ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { // Configure CORS for Socket.IO - use the same origin logic
       origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true // Match Express CORS if needed
    },
});

// --- In-memory User Storage ---
let userSocketMap = [];

function getUsersInRoom(roomId) {
    return userSocketMap.filter((user) => user.roomId == roomId);
}

function getRoomId(socketId) {
    const user = userSocketMap.find((user) => user.socketId === socketId);
    return user?.roomId;
}

// --- Socket.IO Connection Logic ---
io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle user actions
    socket.on(ACTIONS.JOIN_REQUEST, ({ roomId, username }) => {
        const isUsernameExist = getUsersInRoom(roomId).some(
            (u) => u.username === username
        );
        if (isUsernameExist) {
            io.to(socket.id).emit(ACTIONS.USERNAME_EXISTS);
            return;
        }

        const user = {
            username,
            roomId,
            status: ACTIONS.USER_ONLINE,
            cursorPosition: 0,
            typing: false,
            socketId: socket.id,
            currentFile: null,
        };
        userSocketMap.push(user);
        socket.join(roomId);
        socket.broadcast.to(roomId).emit(ACTIONS.USER_JOINED, { user });
        const users = getUsersInRoom(roomId);
        io.to(socket.id).emit(ACTIONS.JOIN_ACCEPTED, { user, users });
        console.log(`${username} joined room ${roomId}`);
    });

    socket.on("disconnecting", () => {
        const user = userSocketMap.find((user) => user.socketId === socket.id);
        const roomId = user?.roomId;
        if (roomId === undefined || user === undefined) return;

        console.log(`${user.username} disconnecting from room ${roomId}`);
        socket.broadcast.to(roomId).emit(ACTIONS.USER_DISCONNECTED, { user });
        userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id);
    });

    // Handle file actions
    socket.on(ACTIONS.SYNC_FILES, ({ files, currentFile, socketId }) => {
        io.to(socketId).emit(ACTIONS.SYNC_FILES, {
            files,
            currentFile,
        });
    });

    socket.on(ACTIONS.FILE_CREATED, ({ file }) => {
        const roomId = getRoomId(socket.id);
        if (roomId) {
            socket.broadcast.to(roomId).emit(ACTIONS.FILE_CREATED, { file });
        }
    });

    socket.on(ACTIONS.FILE_UPDATED, ({ file }) => {
        const roomId = getRoomId(socket.id);
         if (roomId) {
            socket.broadcast.to(roomId).emit(ACTIONS.FILE_UPDATED, { file });
         }
    });

    socket.on(ACTIONS.FILE_RENAMED, ({ file }) => {
        const roomId = getRoomId(socket.id);
         if (roomId) {
            socket.broadcast.to(roomId).emit(ACTIONS.FILE_RENAMED, { file });
         }
    });

    socket.on(ACTIONS.FILE_DELETED, ({ id }) => {
        const roomId = getRoomId(socket.id);
         if (roomId) {
            socket.broadcast.to(roomId).emit(ACTIONS.FILE_DELETED, { id });
         }
    });

    // Handle user status
    socket.on(ACTIONS.USER_OFFLINE, ({ socketId }) => {
        const roomId = getRoomId(socketId);
        if (!roomId) return;

        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socketId) {
                return { ...user, status: ACTIONS.USER_OFFLINE };
            }
            return user;
        });
        socket.broadcast.to(roomId).emit(ACTIONS.USER_OFFLINE, { socketId });
    });

    socket.on(ACTIONS.USER_ONLINE, ({ socketId }) => {
         const roomId = getRoomId(socketId);
         if (!roomId) return;

        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socketId) {
                return { ...user, status: ACTIONS.USER_ONLINE };
            }
            return user;
        });
        socket.broadcast.to(roomId).emit(ACTIONS.USER_ONLINE, { socketId });
    });

    // Handle chat actions
    socket.on(ACTIONS.SEND_MESSAGE, ({ message }) => {
        const roomId = getRoomId(socket.id);
        if (roomId) {
           socket.broadcast.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, { message });
        }
    });

    // Handle cursor position and typing status
    socket.on(ACTIONS.TYPING_START, ({ cursorPosition }) => {
        const user = userSocketMap.find((user) => user.socketId === socket.id);
        if (!user || !user.roomId) return;

        const updatedUser = { ...user, typing: true, cursorPosition };
        userSocketMap = userSocketMap.map((u) => u.socketId === socket.id ? updatedUser : u);

        socket.broadcast.to(user.roomId).emit(ACTIONS.TYPING_START, { user: updatedUser });
    });

    socket.on(ACTIONS.TYPING_PAUSE, () => {
        const user = userSocketMap.find((user) => user.socketId === socket.id);
        if (!user || !user.roomId) return;

        const updatedUser = { ...user, typing: false };
        userSocketMap = userSocketMap.map((u) => u.socketId === socket.id ? updatedUser : u);

        socket.broadcast.to(user.roomId).emit(ACTIONS.TYPING_PAUSE, { user: updatedUser });
    });

    // Handle drawing actions
    socket.on(ACTIONS.REQUEST_DRAWING, () => {
        const roomId = getRoomId(socket.id);
        if (roomId) {
           const sourceUser = userSocketMap.find(u => u.roomId === roomId && u.socketId !== socket.id);
           if (sourceUser) {
              io.to(sourceUser.socketId).emit(ACTIONS.REQUEST_DRAWING, { socketId: socket.id });
           }
        }
    });

    socket.on(ACTIONS.SYNC_DRAWING, ({ drawingData, socketId }) => {
        io.to(socketId).emit(ACTIONS.SYNC_DRAWING, { drawingData });
    });

    socket.on(ACTIONS.DRAWING_UPDATE, ({ snapshot }) => {
        const roomId = getRoomId(socket.id);
        if (roomId) {
            socket.broadcast.to(roomId).emit(ACTIONS.DRAWING_UPDATE, {
                snapshot,
            });
        }
    });

     socket.on("error", (err) => {
        console.error(`Socket Error on ${socket.id}:`, err.message);
    });

});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("API is running successfully!!");
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
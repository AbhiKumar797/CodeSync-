const express = require("express");
const app = express();
require("dotenv").config(); // Make sure dotenv is configured
const http = require("http");
const cors = require("cors");
const ACTIONS = require("./utils/actions");
const { Server } = require("socket.io"); // Import Server from socket.io

// --- CORS Configuration ---
const allowedOrigins = [process.env.CORS_ORIGIN].filter(Boolean); // Get URL from env var

// Optional: Add localhost for development
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173'); // Your Vite dev port
    // You might add others like http://127.0.0.1:5173 if needed
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl) or from allowed list
        // Allow no origin only in non-production environments for safety
        if ((!origin && process.env.NODE_ENV !== 'production') || allowedOrigins.indexOf(origin) !== -1) {
             callback(null, true);
        } else {
             callback(new Error('Not allowed by CORS'));
        }
     },
     credentials: true // Set this if you need cookies/sessions across origins
 };

app.use(express.json());

// --- Apply CORS Middleware to Express ---
app.use(cors(corsOptions)); // Use the configured CORS options

// --- Socket.IO Server Setup ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { // Configure CORS for Socket.IO
       origin: allowedOrigins, // Use the same origins
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
    console.log(`Socket connected: ${socket.id}`); // Log connections

    // Handle user actions
    socket.on(ACTIONS.JOIN_REQUEST, ({ roomId, username }) => {
        // Check if username exists in the room
        const isUsernameExist = getUsersInRoom(roomId).some( // Use .some for efficiency
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
            currentFile: null, // Consider initializing this based on existing users if needed
        };
        userSocketMap.push(user);
        socket.join(roomId);
        // Broadcast to others in the room
        socket.broadcast.to(roomId).emit(ACTIONS.USER_JOINED, { user });
        const users = getUsersInRoom(roomId);
        // Send confirmation and user list back to the joining user
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
        // socket.leave() happens automatically on disconnect
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
        if (roomId) { // Ensure roomId is valid before broadcasting
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
        if (!roomId) return; // Exit if user/room not found

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
         if (!roomId) return; // Exit if user/room not found

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
        if (!user || !user.roomId) return; // Ensure user and room exist

        // Update the specific user's typing status and position
        const updatedUser = { ...user, typing: true, cursorPosition };
        userSocketMap = userSocketMap.map((u) => u.socketId === socket.id ? updatedUser : u);

        socket.broadcast.to(user.roomId).emit(ACTIONS.TYPING_START, { user: updatedUser }); // Send updated user object
    });

    socket.on(ACTIONS.TYPING_PAUSE, () => {
        const user = userSocketMap.find((user) => user.socketId === socket.id);
        if (!user || !user.roomId) return;

        // Update the specific user's typing status
        const updatedUser = { ...user, typing: false };
        userSocketMap = userSocketMap.map((u) => u.socketId === socket.id ? updatedUser : u);

        socket.broadcast.to(user.roomId).emit(ACTIONS.TYPING_PAUSE, { user: updatedUser }); // Send updated user object
    });

    // Handle drawing actions
    socket.on(ACTIONS.REQUEST_DRAWING, () => {
        const roomId = getRoomId(socket.id);
        if (roomId) {
           // Find a user in the room to request the drawing from (e.g., the first one who isn't the requester)
           const sourceUser = userSocketMap.find(u => u.roomId === roomId && u.socketId !== socket.id);
           if (sourceUser) {
              io.to(sourceUser.socketId).emit(ACTIONS.REQUEST_DRAWING, { socketId: socket.id });
           }
           // Consider what happens if no other user is present or has drawing data
        }
    });

    socket.on(ACTIONS.SYNC_DRAWING, ({ drawingData, socketId }) => {
        // Send the drawing data specifically to the requesting socket
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

     // Handle potential errors on the socket
     socket.on("error", (err) => {
        console.error(`Socket Error on ${socket.id}:`, err);
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

// Optional: Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // You might want to close DB connections here too
    process.exit(0);
  });
});
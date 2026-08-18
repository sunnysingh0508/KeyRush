const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/api/stats', (req, res) => {
  res.json({ activeUsers: io.engine.clientsCount });
});

let waitingPlayer = null;
const rooms = new Map();

// Helper to generate 4-character room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Random Matchmaking
  socket.on('join_random', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const roomId = `room_${Date.now()}`;
      
      socket.join(roomId);
      waitingPlayer.join(roomId);
      
      rooms.set(roomId, {
        id: roomId,
        host: waitingPlayer.id,
        guest: socket.id,
        ready: 0
      });

      waitingPlayer.emit('joined', { role: 'host', roomId });
      socket.emit('joined', { role: 'guest', roomId });
      
      io.to(roomId).emit('room_full');
      
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit('waiting');
    }
  });

  // Create specific room
  socket.on('create_room', () => {
    const roomId = generateRoomCode();
    socket.join(roomId);
    
    rooms.set(roomId, {
      id: roomId,
      host: socket.id,
      guest: null,
      ready: 0
    });

    socket.emit('room_created', roomId);
    socket.emit('joined', { role: 'host', roomId });
  });

  // Join specific room
  socket.on('join_room', (roomId) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return socket.emit('room_error', 'Room not found.');
    }
    if (room.guest) {
      return socket.emit('room_error', 'Room is already full.');
    }
    if (room.host === socket.id) {
      return socket.emit('room_error', 'You are already in this room.');
    }

    socket.join(roomId);
    room.guest = socket.id;

    socket.emit('joined', { role: 'guest', roomId });
    io.to(roomId).emit('room_full');
  });

  socket.on('player_ready', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.ready += 1;
      if (room.ready === 2) {
        io.to(roomId).emit('start_game');
      }
    }
  });

  socket.on('game_action', ({ roomId, type, payload }) => {
    socket.to(roomId).emit('game_action', { type, payload });
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    
    // Find if user was in any active room and notify the other player
    for (const [roomId, room] of rooms.entries()) {
      if (room.host === socket.id || room.guest === socket.id) {
        socket.to(roomId).emit('opponent_disconnected');
        rooms.delete(roomId);
      }
    }
    
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

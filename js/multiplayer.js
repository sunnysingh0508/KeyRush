export class MultiplayerManager {
  constructor(onEvent) {
    this.socket = null;
    this.roomId = null;
    this.role = null;
    this.onEvent = onEvent;
  }

  connect() {
    if (!this.socket) {
      // Connect to local server for testing, or production server if deployed
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const serverUrl = isLocalhost ? 'http://localhost:3001' : 'https://keyrush.onrender.com';

      this.socket = io(serverUrl);
      this.setupListeners();
    }
  }

  setupListeners() {
    this.socket.on('joined', (data) => {
      this.role = data.role;
      this.roomId = data.roomId;
      this.onEvent('joined', data);
    });

    this.socket.on('room_created', (roomId) => {
      this.onEvent('room_created', roomId);
    });

    this.socket.on('room_full', () => {
      this.onEvent('room_full', this.role);
    });

    this.socket.on('start_game', () => {
      this.onEvent('start_game');
    });

    this.socket.on('game_action', ({ type, payload }) => {
      this.onEvent('game_action', { type, payload });
    });

    this.socket.on('room_error', (err) => {
      this.onEvent('room_error', err);
    });

    this.socket.on('opponent_disconnected', () => {
      this.onEvent('opponent_disconnected');
    });

    this.socket.on('waiting', () => {
      this.onEvent('waiting');
    });
  }

  joinRandom() {
    this.connect();
    this.socket.emit('join_random');
  }

  createRoom() {
    this.connect();
    this.socket.emit('create_room');
  }

  joinRoom(roomId) {
    this.connect();
    this.socket.emit('join_room', roomId);
  }

  setReady() {
    if (this.socket && this.roomId) {
      this.socket.emit('player_ready', this.roomId);
    }
  }

  sendAction(type, payload) {
    if (this.socket && this.roomId) {
      this.socket.emit('game_action', { roomId: this.roomId, type, payload });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.roomId = null;
      this.role = null;
    }
  }
}

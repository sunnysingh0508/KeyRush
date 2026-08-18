import { Game } from './game.js';
import { MultiplayerManager } from './multiplayer.js';
import { GAME_WORDS, shuffleArray } from './data.js';

// DOM Elements & UI Manager
const UI = {
  screens: {
    'menu-screen': document.getElementById('menu-screen'),
    'arena-screen': document.getElementById('arena-screen'),
    'gameover-screen': document.getElementById('gameover-screen')
  },
  playerHpBar: document.getElementById('player-hp-bar'),
  botHpBar: document.getElementById('bot-hp-bar'),
  playerNameLabel: document.getElementById('player-name-label'),
  botNameLabel: document.getElementById('bot-name-label'),
  comboDisplay: document.getElementById('combo-display'),
  countdownOverlay: document.getElementById('countdown-overlay'),
  levelClearOverlay: document.getElementById('level-clear-overlay'),

  bubbles: {
    player: {
      typed: document.getElementById('player-typed'),
      untyped: document.getElementById('player-untyped'),
      error: document.getElementById('player-error')
    },
    bot: {
      typed: document.getElementById('bot-typed'),
      untyped: document.getElementById('bot-untyped'),
      error: document.getElementById('bot-error')
    }
  },

  sprites: {
    player: document.getElementById('player-sprite'),
    bot: document.getElementById('bot-sprite')
  },

  showScreen(id) {
    Object.values(this.screens).forEach(s => s.classList.add('hidden'));
    this.screens[id].classList.remove('hidden');
  },

  showOverlay(id, text) {
    const el = document.getElementById(id);
    if (text) el.textContent = text;
    el.classList.remove('hidden');
  },

  hideOverlay(id) {
    document.getElementById(id).classList.add('hidden');
  },

  updateBubble(target, word, typed) {
    const b = this.bubbles[target];
    let isError = false;
    let matchLen = 0;

    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === word[i]) {
        matchLen++;
      } else {
        isError = true;
        break;
      }
    }

    b.typed.textContent = word.slice(0, matchLen);
    b.error.textContent = isError ? word.slice(matchLen, typed.length) : '';
    b.untyped.textContent = word.slice(isError ? typed.length : matchLen);
  },

  animateAttack(attacker, defender, damage) {
    const aContainer = document.getElementById(`${attacker}-container`);
    const dContainer = document.getElementById(`${defender}-container`);
    const aSprite = this.sprites[attacker];
    const dSprite = this.sprites[defender];

    // Attacker dash
    aContainer.classList.remove('anim-dash-player', 'anim-dash-bot');
    void aContainer.offsetWidth; // trigger reflow
    aContainer.classList.add(attacker === 'player' ? 'anim-dash-player' : 'anim-dash-bot');

    // Delay defender hit until attacker reaches them
    setTimeout(() => {
      // Screen shake
      const arena = document.getElementById('arena-screen');
      arena.classList.remove('anim-shake');
      void arena.offsetWidth;
      arena.classList.add('anim-shake');

      // Defender hit
      dSprite.classList.remove('anim-idle', 'anim-hit');
      void dSprite.offsetWidth; // trigger reflow
      dSprite.classList.add('anim-hit');

      // Floating damage number
      if (damage) {
        const floatDamage = document.createElement('div');
        floatDamage.className = 'floating-damage';
        floatDamage.textContent = `-${damage}`;
        dContainer.appendChild(floatDamage);

        // Remove floating damage element after animation
        setTimeout(() => floatDamage.remove(), 1000);
      }

      setTimeout(() => {
        dSprite.classList.remove('anim-hit');
        dSprite.classList.add('anim-idle');
      }, 300);
    }, 150); // 150ms delay, halfway through the 300ms dash
  }
};

// Main App Initialization
const game = new Game(UI);
let multi = null;

// Menu logic
let currentMode = 'BOT';

document.getElementById('tab-bot').addEventListener('click', () => setMode('BOT'));
document.getElementById('tab-room').addEventListener('click', () => setMode('ROOM'));
document.getElementById('tab-random').addEventListener('click', () => setMode('RANDOM'));

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${mode.toLowerCase()}`).classList.add('active');
  
  if (mode === 'ROOM') {
    document.getElementById('room-controls').classList.remove('hidden');
    document.getElementById('difficulty-section').classList.add('hidden');
    document.getElementById('btn-start-fight').textContent = '🤝 JOIN ROOM';
  } else if (mode === 'RANDOM') {
    document.getElementById('room-controls').classList.add('hidden');
    document.getElementById('difficulty-section').classList.add('hidden');
    document.getElementById('btn-start-fight').textContent = '🌐 FIND MATCH';
  } else {
    document.getElementById('room-controls').classList.add('hidden');
    document.getElementById('difficulty-section').classList.remove('hidden');
    document.getElementById('btn-start-fight').textContent = '⚔️ START FIGHT';
  }
}

// Difficulty Selector Logic (visual only for now, can be hooked into Game later)
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  });
});

document.getElementById('btn-create-room-ui').addEventListener('click', () => {
  const name = document.getElementById('player-name-input').value || 'Player';
  UI.playerNameLabel.textContent = name.toUpperCase();
  setupMultiplayer();
  multi.createRoom();
});

document.getElementById('btn-start-fight').addEventListener('click', () => {
  const name = document.getElementById('player-name-input').value || 'Player';
  UI.playerNameLabel.textContent = name.toUpperCase();
  
  if (currentMode === 'BOT') {
    UI.botNameLabel.textContent = 'BOSS';
    game.start('BOT');
  } else if (currentMode === 'RANDOM') {
    setupMultiplayer();
    multi.joinRandom();
  } else if (currentMode === 'ROOM') {
    const code = document.getElementById('room-code-input').value.toUpperCase();
    if (!code) {
       document.getElementById('menu-status').textContent = 'Please enter a room code!';
       return;
    }
    setupMultiplayer();
    multi.joinRoom(code);
  }
});

function setupMultiplayer() {
  if (!multi) {
    multi = new MultiplayerManager((event, data) => {
      const status = document.getElementById('menu-status');
      if (event === 'waiting') {
        status.textContent = 'Searching for an opponent...';
      } else if (event === 'joined') {
        status.textContent = `Joined Room: ${data.roomId}. Waiting for opponent...`;
      } else if (event === 'room_created') {
        status.textContent = `Room created: ${data}. Waiting for opponent...`;
      } else if (event === 'room_full') {
        status.textContent = `Opponent found! Starting...`;

        // Exchange names
        const myName = document.getElementById('player-name-input').value || 'Player';
        multi.sendAction('name', myName);

        if (multi.role === 'host') {
          const words = shuffleArray(GAME_WORDS);
          multi.sendAction('words', words);
          game.wordList = words;
        }
        setTimeout(() => multi.setReady(), 500);
      } else if (event === 'start_game') {
        UI.playerNameLabel.textContent = document.getElementById('player-name-input').value.toUpperCase() || 'PLAYER';
        game.start('MULTIPLAYER', game.wordList);
      } else if (event === 'game_action') {
        if (data.type === 'words' && multi.role === 'guest') {
          game.wordList = data.payload;
        } else if (data.type === 'name') {
          UI.botNameLabel.textContent = data.payload.toUpperCase();
        } else if (data.type === 'damage') {
          game.receiveDamage(data.payload);
        } else if (data.type === 'type') {
          game.setOpponentInput(data.payload);
        }
      } else if (event === 'opponent_disconnected') {
        game.endGame('VICTORY (Opponent Disconnected)');
      } else if (event === 'room_error') {
        status.textContent = data;
      }
    });
  }
}

// Game callbacks
game.onDamageDealt = (amount) => {
  if (multi && game.mode === 'MULTIPLAYER') {
    multi.sendAction('damage', amount);
  }
};

game.onWordCompleted = (type, payload) => {
  if (multi && game.mode === 'MULTIPLAYER') {
    multi.sendAction(type, payload);
  }
}

game.onGameEnd = (result) => {
  UI.showScreen('gameover-screen');
  document.getElementById('gameover-title').textContent = result;
  if (multi) {
    multi.disconnect();
    multi = null;
  }
};

document.getElementById('btn-back-menu').addEventListener('click', () => {
  UI.showScreen('menu-screen');
  document.getElementById('menu-status').textContent = '';
});

// Keyboard listener
window.addEventListener('keydown', (e) => {
  game.handleType(e.key);
});

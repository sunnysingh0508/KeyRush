import { GAME_WORDS, shuffleArray } from './data.js';

export class Game {
  constructor(ui) {
    this.ui = ui;
    this.mode = 'BOT'; // 'BOT' or 'MULTIPLAYER'
    
    this.wordList = [];
    this.currentWordIndex = 0;
    this.currentWord = '';
    
    this.playerInput = '';
    this.botInput = '';
    
    this.playerHp = 100;
    this.botHp = 100;
    this.maxBotHp = 100;
    this.level = 1;
    this.combo = 0;
    
    this.isPlaying = false;
    this.botInterval = null;
    
    this.onDamageDealt = null;
    this.onWordCompleted = null;
    this.onGameEnd = null;
  }

  start(mode, words = null) {
    this.mode = mode;
    this.isPlaying = false;
    this.playerHp = 100;
    this.botHp = 100;
    this.maxBotHp = 100;
    this.level = 1;
    this.combo = 0;
    
    if (words) {
      this.wordList = words;
    } else {
      this.wordList = shuffleArray(GAME_WORDS);
    }
    this.currentWordIndex = 0;
    
    this.updateUI();
    this.startCountdown();
  }

  nextWord() {
    if (this.currentWordIndex >= this.wordList.length) {
      this.wordList = shuffleArray(GAME_WORDS);
      this.currentWordIndex = 0;
    }
    this.currentWord = this.wordList[this.currentWordIndex++];
    this.playerInput = '';
    this.botInput = '';
    this.updateUI();
  }

  startCountdown() {
    this.ui.showScreen('arena-screen');
    this.ui.showOverlay('countdown-overlay', '3');
    
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.ui.showOverlay('countdown-overlay', count.toString());
      } else if (count === 0) {
        this.ui.showOverlay('countdown-overlay', 'FIGHT!');
        this.ui.countdownOverlay.style.color = '#ef4444';
      } else {
        clearInterval(interval);
        this.ui.hideOverlay('countdown-overlay');
        this.ui.countdownOverlay.style.color = '';
        this.isPlaying = true;
        this.nextWord();
        if (this.mode === 'BOT') this.startBot();
      }
    }, 1000);
  }

  handleType(key) {
    if (!this.isPlaying) return;

    if (key === 'Backspace') {
      this.playerInput = this.playerInput.slice(0, -1);
      this.combo = 0;
      this.updateUI();
      if (this.mode === 'MULTIPLAYER' && this.onWordCompleted) {
         this.onWordCompleted('type', this.playerInput);
      }
      return;
    }

    if (key.length === 1 && key.match(/[a-zA-Z]/)) {
      const expectedChar = this.currentWord[this.playerInput.length];
      const typedChar = key.toLowerCase();

      if (typedChar === expectedChar) {
        this.playerInput += typedChar;
        if (this.mode === 'MULTIPLAYER' && this.onWordCompleted) {
           this.onWordCompleted('type', this.playerInput);
        }
        
        if (this.playerInput === this.currentWord) {
          this.combo++;
          const damage = Math.max(5, this.currentWord.length) + (this.combo * 2);
          this.damageOpponent(damage);
          this.nextWord();
        }
      } else {
        this.combo = 0;
      }
      this.updateUI();
    }
  }

  damageOpponent(amount) {
    this.botHp = Math.max(0, this.botHp - amount);
    this.ui.animateAttack('player', 'bot', amount);
    
    if (this.mode === 'MULTIPLAYER' && this.onDamageDealt) {
      this.onDamageDealt(amount);
    }
    
    if (this.botHp === 0) {
      this.isPlaying = false;
      this.stopBot();
      if (this.mode === 'BOT') {
        this.levelUp();
      } else {
        setTimeout(() => this.endGame('VICTORY'), 1500);
      }
    }
    this.updateUI();
  }

  receiveDamage(amount) {
    if (!this.isPlaying) return;
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.combo = 0;
    this.ui.animateAttack('bot', 'player', amount);
    this.nextWord();
    
    if (this.playerHp === 0) {
      this.isPlaying = false;
      this.stopBot();
      setTimeout(() => this.endGame('DEFEAT'), 1500);
    }
    this.updateUI();
  }

  setOpponentInput(input) {
    this.botInput = input;
    this.updateUI();
  }

  startBot() {
    this.stopBot();
    const typeSpeed = Math.max(100, 400 - (this.level * 20)); // Gets faster
    
    this.botInterval = setInterval(() => {
      if (!this.isPlaying) return;
      
      const expectedChar = this.currentWord[this.botInput.length];
      if (expectedChar) {
        this.botInput += expectedChar;
        this.updateUI();
        
        if (this.botInput === this.currentWord) {
          this.receiveDamage(Math.max(5, this.currentWord.length));
        }
      }
    }, typeSpeed);
  }

  stopBot() {
    if (this.botInterval) clearInterval(this.botInterval);
  }

  levelUp() {
    this.ui.showOverlay('level-clear-overlay', `LEVEL ${this.level} CLEARED!`);
    setTimeout(() => {
      this.ui.hideOverlay('level-clear-overlay');
      this.level++;
      this.maxBotHp = 100 + (this.level * 20);
      this.botHp = this.maxBotHp;
      this.playerHp = 100;
      this.startCountdown();
    }, 3000);
  }

  endGame(result) {
    this.isPlaying = false;
    this.stopBot();
    if (this.onGameEnd) this.onGameEnd(result);
  }

  updateUI() {
    // HP Bars
    this.ui.playerHpBar.style.width = `${(this.playerHp / 100) * 100}%`;
    this.ui.botHpBar.style.width = `${(this.botHp / this.maxBotHp) * 100}%`;
    document.getElementById('player-hp-text').textContent = `${this.playerHp} / 100`;
    document.getElementById('bot-hp-text').textContent = `${this.botHp} / ${this.maxBotHp}`;
    
    // Bubbles
    this.ui.updateBubble('player', this.currentWord, this.playerInput);
    this.ui.updateBubble('bot', this.currentWord, this.botInput);
    
    // Combo
    if (this.combo > 1) {
      this.ui.comboDisplay.textContent = `${this.combo}x Combo!`;
      this.ui.comboDisplay.classList.remove('hidden');
    } else {
      this.ui.comboDisplay.classList.add('hidden');
    }
  }
}

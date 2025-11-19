import './style.css';
import { Connect4 } from './game.js';
import { NetworkManager } from './network.js';

const game = new Connect4();
const network = new NetworkManager();

const app = {
  elements: {
    status: document.getElementById('status'),
    findMatchBtn: document.getElementById('find-match-btn'),
    lobbyStatus: document.getElementById('lobby-status'),
    gameBoard: document.getElementById('game-board'),
    restartBtn: document.getElementById('restart-btn'),
    lobbyControls: document.getElementById('lobby-controls'),
  },
  state: {
    inGame: false,
    isMyTurn: false,
    myPlayerId: null, // 1 or 2
  },

  init() {
    this.elements.findMatchBtn.addEventListener('click', () => this.findMatch());
    this.elements.restartBtn.addEventListener('click', () => this.requestRestart());
    this.renderBoard();

    this.elements.status.textContent = "Welcome! Find a match to play.";
  },

  findMatch() {
    this.elements.findMatchBtn.classList.add('hidden');
    this.elements.lobbyStatus.classList.remove('hidden');
    this.elements.status.textContent = "Searching for opponent...";

    network.findMatch((isHost) => {
      this.startGame(isHost);
    });
  },

  startGame(isHost) {
    this.state.inGame = true;
    this.state.myPlayerId = isHost ? 1 : 2;
    this.state.isMyTurn = isHost; // Player 1 starts

    this.elements.lobbyControls.classList.add('hidden');
    this.elements.gameBoard.classList.remove('hidden');
    this.elements.restartBtn.classList.remove('hidden');

    this.updateStatus();

    // Setup network listeners
    network.onMoveReceived((data) => {
      this.handleRemoteMove(data.col);
    });

    network.onRestartReceived(() => {
      this.resetGame();
    });

    network.onPeerDisconnect(() => {
      alert("Opponent disconnected!");
      location.reload();
    });
  },

  updateStatus() {
    if (game.winner) {
      if (game.winner === this.state.myPlayerId) {
        this.elements.status.textContent = "You Won! 🎉";
      } else {
        this.elements.status.textContent = "You Lost 😔";
      }
      return;
    }

    if (this.state.isMyTurn) {
      this.elements.status.textContent = "Your Turn";
      this.elements.status.style.color = this.state.myPlayerId === 1 ? 'var(--player1-color)' : 'var(--player2-color)';
    } else {
      this.elements.status.textContent = "Opponent's Turn";
      this.elements.status.style.color = 'var(--text-color)';
    }
  },

  renderBoard() {
    this.elements.gameBoard.innerHTML = '';
    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => this.handleCellClick(c));
        this.elements.gameBoard.appendChild(cell);
      }
    }
  },

  handleCellClick(col) {
    if (!this.state.inGame || !this.state.isMyTurn || game.winner) return;

    const result = game.dropPiece(col);
    if (result) {
      this.updateBoardUI(result.row, result.col, result.player);
      network.sendMove(col);
      this.state.isMyTurn = false;
      this.updateStatus();
    }
  },

  handleRemoteMove(col) {
    const result = game.dropPiece(col);
    if (result) {
      this.updateBoardUI(result.row, result.col, result.player);
      this.state.isMyTurn = true;
      this.updateStatus();
    }
  },

  updateBoardUI(row, col, player) {
    // The grid is flat in DOM, but we can calculate index: row * cols + col
    // Wait, CSS grid fills row by row? Yes.
    const index = row * game.cols + col;
    const cell = this.elements.gameBoard.children[index];
    if (cell) {
      cell.classList.add(player === 1 ? 'player1' : 'player2');
    }
  },

  requestRestart() {
    network.sendRestart();
    this.resetGame();
  },

  resetGame() {
    game.reset();
    // Clear board UI
    Array.from(this.elements.gameBoard.children).forEach(cell => {
      cell.classList.remove('player1', 'player2');
    });

    // Reset turn logic
    this.state.isMyTurn = this.state.myPlayerId === 1;
    this.updateStatus();
  }
};

app.init();

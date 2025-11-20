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
    surrenderBtn: document.getElementById('surrender-btn'),
    lobbyControls: document.getElementById('lobby-controls'),
    modal: document.getElementById('game-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalRematchBtn: document.getElementById('modal-rematch-btn'),
    modalQuitBtn: document.getElementById('modal-quit-btn'),
  },
  state: {
    inGame: false,
    isMyTurn: false,
    myPlayerId: null, // 1 or 2
    startingPlayer: 1, // 1 starts by default
    localRematch: false,
    remoteRematch: false,
  },

  init() {
    this.elements.findMatchBtn.addEventListener('click', () => this.findMatch());
    this.elements.surrenderBtn.addEventListener('click', () => this.surrender());
    this.elements.modalRematchBtn.addEventListener('click', () => this.handleRematchClick());
    this.elements.modalQuitBtn.addEventListener('click', () => this.handleQuitClick());
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
    this.state.startingPlayer = 1;
    this.state.isMyTurn = this.state.myPlayerId === this.state.startingPlayer;

    this.elements.lobbyControls.classList.add('hidden');
    this.elements.gameBoard.classList.remove('hidden');
    this.elements.surrenderBtn.classList.remove('hidden');

    this.resetRematchState();
    this.updateStatus();

    // Setup network listeners
    network.onMoveReceived((data) => {
      this.handleRemoteMove(data.col);
    });

    network.onSurrenderReceived(() => {
      this.handleSurrenderReceived();
    });

    network.onRematchReceived(() => {
      this.handleRematchReceived();
    });

    network.onQuitReceived(() => {
      this.handleQuitReceived();
    });

    network.onPeerDisconnect(() => {
      this.handlePeerDisconnect();
    });
  },

  handlePeerDisconnect() {
    this.state.inGame = false;
    network.leaveGameRoom();
    this.closeModal();
    
    this.elements.gameBoard.classList.add('hidden');
    this.elements.surrenderBtn.classList.add('hidden');
    this.elements.lobbyControls.classList.remove('hidden');
    this.elements.findMatchBtn.classList.remove('hidden');
    this.elements.lobbyStatus.classList.add('hidden');
    
    this.elements.status.textContent = "Opponent disconnected. Returned to lobby.";
    this.elements.status.style.color = 'var(--text-color)';
    
    // Reset board for next game visual hygiene
    this.resetBoardUI();
    game.reset();
  },

  updateStatus() {
    if (game.winner) {
      const won = game.winner === this.state.myPlayerId;
      if (won) {
        this.elements.status.textContent = "You Won! 🎉";
        this.showModal("You Won!", "Congratulations! You won the game.");
      } else {
        this.elements.status.textContent = "You Lost 😔";
        this.showModal("You Lost", "Better luck next time.");
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
    const index = row * game.cols + col;
    const cell = this.elements.gameBoard.children[index];
    if (cell) {
      cell.classList.add(player === 1 ? 'player1' : 'player2');
    }
  },

  surrender() {
    if (!this.state.inGame || game.winner) return;
    network.sendSurrender();
    this.state.inGame = false;
    this.showModal("You Resigned", "You surrendered the game.");
    this.elements.status.textContent = "You Resigned";
  },

  handleSurrenderReceived() {
    if (!this.state.inGame || game.winner) return;
    this.state.inGame = false;
    this.showModal("Opponent Resigned", "You won! The opponent resigned.");
    this.elements.status.textContent = "Opponent Resigned";
  },

  showModal(title, message) {
      this.elements.modalTitle.textContent = title;
      this.elements.modalMessage.textContent = message;
      this.elements.modal.classList.remove('hidden');
      
      // Reset modal buttons state
      this.elements.modalRematchBtn.disabled = false;
      this.elements.modalRematchBtn.textContent = "Rematch";
  },

  closeModal() {
      this.elements.modal.classList.add('hidden');
  },

  handleRematchClick() {
      this.state.localRematch = true;
      this.elements.modalRematchBtn.disabled = true;
      this.elements.modalRematchBtn.textContent = "Waiting...";
      network.sendRematch();
      this.checkRematch();
  },

  handleRematchReceived() {
      this.state.remoteRematch = true;
      if (!this.state.localRematch && !this.elements.modal.classList.contains('hidden')) {
         // Optionally indicate opponent wants rematch
         this.elements.modalMessage.textContent += " (Opponent wants a rematch!)";
      }
      this.checkRematch();
  },

  checkRematch() {
      if (this.state.localRematch && this.state.remoteRematch) {
          // Small delay to let UI update
          setTimeout(() => this.restartGame(), 500);
      }
  },

  restartGame() {
      this.closeModal();
      this.resetRematchState();
      
      // Reverse turn order
      this.state.startingPlayer = this.state.startingPlayer === 1 ? 2 : 1;
      
      game.reset();
      this.resetBoardUI();
      
      this.state.inGame = true;
      this.state.isMyTurn = this.state.myPlayerId === this.state.startingPlayer;
      this.updateStatus();
  },

  handleQuitClick() {
      network.sendQuit();
      this.returnToLobby();
  },
  
  handleQuitReceived() {
      this.elements.modalRematchBtn.disabled = true;
      this.elements.modalRematchBtn.textContent = "Opponent Left";
      this.elements.modalMessage.textContent = "Opponent has left the game.";
  },
  
  returnToLobby() {
      this.handlePeerDisconnect();
  },

  resetRematchState() {
      this.state.localRematch = false;
      this.state.remoteRematch = false;
  },

  resetBoardUI() {
    Array.from(this.elements.gameBoard.children).forEach(cell => {
      cell.classList.remove('player1', 'player2');
    });
  }
};

app.init();

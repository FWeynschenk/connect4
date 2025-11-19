export class Connect4 {
    constructor() {
        this.rows = 6;
        this.cols = 7;
        this.board = [];
        this.currentPlayer = 1; // 1 or 2
        this.winner = null;
        this.reset();
    }

    reset() {
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.currentPlayer = 1;
        this.winner = null;
    }

    dropPiece(col) {
        if (this.winner || col < 0 || col >= this.cols) return null;

        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row][col] === 0) {
                this.board[row][col] = this.currentPlayer;
                if (this.checkWin(row, col)) {
                    this.winner = this.currentPlayer;
                } else {
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                }
                return { row, col, player: this.board[row][col] };
            }
        }
        return null; // Column full
    }

    checkWin(row, col) {
        const player = this.board[row][col];
        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal /
            [1, -1]  // Diagonal \
        ];

        for (const [dr, dc] of directions) {
            let count = 1;
            for (let i = 1; i < 4; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || this.board[r][c] !== player) break;
                count++;
            }
            for (let i = 1; i < 4; i++) {
                const r = row - dr * i;
                const c = col - dc * i;
                if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || this.board[r][c] !== player) break;
                count++;
            }
            if (count >= 4) return true;
        }
        return false;
    }
}

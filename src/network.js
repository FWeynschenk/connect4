import { joinRoom } from 'trystero';

export class NetworkManager {
    constructor() {
        this.lobbyRoom = null;
        this.gameRoom = null;
        this.onMatchFoundCallback = null;
        this.onMoveReceivedCallback = null;
        this.onPeerDisconnectCallback = null;
        this.isHost = false;
        this.peerId = null;
        this.matchmakingId = null;
    }

    joinLobby() {
        const config = { appId: 'connect4-webrtc-game' };
        this.lobbyRoom = joinRoom(config, 'connect4-global-lobby');

        // Generate a random ID for matchmaking tie-breaking
        this.matchmakingId = crypto.randomUUID();

        const [sendMatchRequest, getMatchRequest] = this.lobbyRoom.makeAction('matchRequest');
        const [sendMatchAccept, getMatchAccept] = this.lobbyRoom.makeAction('matchAccept');

        // Broadcast seeking immediately
        setTimeout(() => sendMatchRequest({ type: 'seeking', id: this.matchmakingId }), 500);

        this.lobbyRoom.onPeerJoin(peerId => {
            console.log('Peer joined lobby:', peerId);
            sendMatchRequest({ type: 'seeking', id: this.matchmakingId }, peerId);
        });

        getMatchRequest((data, peerId) => {
            if (data.type === 'seeking') {
                // Found a match!
                // Deterministically decide who creates the room based on matchmakingId
                console.log(`Match request from ${peerId} with ID ${data.id}. My ID: ${this.matchmakingId}`);

                if (this.matchmakingId > data.id) {
                    console.log('I am Host');
                    const roomId = crypto.randomUUID();
                    sendMatchAccept({ roomId }, peerId);
                    this.joinGameRoom(roomId, true); // Host
                    this.lobbyRoom.leave();
                    if (this.onMatchFoundCallback) this.onMatchFoundCallback(true);
                } else {
                    console.log('I am Client (waiting for accept)');
                }
            }
        });

        getMatchAccept((data, peerId) => {
            console.log('Received Match Accept');
            this.joinGameRoom(data.roomId, false); // Client
            this.lobbyRoom.leave();
            if (this.onMatchFoundCallback) this.onMatchFoundCallback(false);
        });
    }

    findMatch(callback) {
        this.onMatchFoundCallback = callback;
        this.joinLobby();
    }

    joinGameRoom(roomId, isHost) {
        this.isHost = isHost;
        const config = { appId: 'connect4-webrtc-game' };
        this.gameRoom = joinRoom(config, roomId);

        const [sendMove, getMove] = this.gameRoom.makeAction('move');
        const [sendRestart, getRestart] = this.gameRoom.makeAction('restart');

        this.sendMoveAction = sendMove;
        this.sendRestartAction = sendRestart;

        getMove((data, peerId) => {
            if (this.onMoveReceivedCallback) this.onMoveReceivedCallback(data);
        });

        getRestart((data, peerId) => {
            if (this.onRestartReceivedCallback) this.onRestartReceivedCallback();
        });

        this.gameRoom.onPeerLeave(peerId => {
            if (this.onPeerDisconnectCallback) this.onPeerDisconnectCallback();
        });
    }

    sendMove(col) {
        if (this.sendMoveAction) {
            this.sendMoveAction({ col });
        }
    }

    sendRestart() {
        if (this.sendRestartAction) {
            this.sendRestartAction({});
        }
    }

    onMoveReceived(callback) {
        this.onMoveReceivedCallback = callback;
    }

    onRestartReceived(callback) {
        this.onRestartReceivedCallback = callback;
    }

    onPeerDisconnect(callback) {
        this.onPeerDisconnectCallback = callback;
    }
}

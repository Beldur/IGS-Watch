var IGSParser = require('./IGSParser'),
    IGSGame = require('./IGSGame'),
    sys = require('sys'),
    events = require('events'),
    net = require('net');

/**
 * IGSConnection
 */
var IGSConnection = function IGSConnection() {
    if ((this instanceof IGSConnection) === false) {
        return new IGSConnection;
    }
    
    events.EventEmitter.call(this);
    
    var self = this;
    
    this.refreshGameListTimer = null;
    
    // IGS Storage object
    this.IGSStatus = {
        LiveGames: {},
        ConnectedPlayers: [],
        ObservingGames: {},
        FinishedGames: []
    };
    
    // Initialize Parse and bind to events
    this.parser = new IGSParser;
    this.parser
        .on('login', function() {
            // We need to login
            self.sendCommand('guest');
        })
        .on('loggedIn', this._onLoggedIn.bind(self))
        .on('gameInfoStart', this._onGameInfoStart.bind(self))
        .on('liveGameEntry', this._onLiveGameEntry.bind(self))
        .on('gameMoveHeader', this._onGameMoveHeader.bind(self))
        .on('gameMove', this._onGameMove.bind(self))
        .on('gameEnd', this._onGameEnd.bind(self));
    
    // Initialize Socket and bind to events
    this.socket = new net.Socket();
    this.socket.setEncoding('ascii');
    this.socket
        .on('connect', this._onConnected.bind(self))
        .on('data', this._onData.bind(self))
        .on('close', this._onClose.bind(self));
    
    // Define property LiveGames
    Object.defineProperty(this, 'LiveGames', {
        get: function() { return this.IGSStatus.LiveGames; }
    });
    
};
sys.inherits(IGSConnection, events.EventEmitter);

/**
 * Send a command to IGS
 * 
 * @param {String} command
 */
IGSConnection.prototype.sendCommand = function(command) {
    this.socket.write(command + '\n');
};

/**
 * Connect to IGS Server
 * 
 * @param {String} host
 * @param {Number} port
 */
IGSConnection.prototype.connect = function(host, port) {
    this.socket.connect(port, host);
};

IGSConnection.prototype.observeGame = function(gameId) {
	if (typeof(this.IGSStatus.ObservingGames[gameId]) === 'undefined') {
		
		this.IGSStatus.ObservingGames[gameId] = new IGSGame;
		
	    this.sendCommand('status ' + gameId);
	    this.sendCommand('moves ' + gameId);
	    this.sendCommand('observe ' + gameId);
	} else {
		console.log('Already observing ', gameId);
	}
};

/**
 * Refresh IGS live games
 * 
 * @param {Number} interval
 */
IGSConnection.prototype.refreshLiveGames = function(interval) {
	var self = this;
	
	clearInterval(this.refreshGameListTimer);
    this.sendCommand('game');
    
	if (interval > 0) {
		this.refreshGameListTimer = setInterval(function() {
			self.sendCommand('game');
        }, interval);
	}
}

/* Socket events */
    IGSConnection.prototype._onConnected = function() {
        this.emit('connected');
    };
    
    IGSConnection.prototype._onClose = function() {
        this.emit('disconnected');
    };
    
    IGSConnection.prototype._onData = function(stream) {
        var data = stream.toString('ascii');
        
        this.parser.addInput(data);
    };


/* IGS events */
    /**
     * Handle logged in event
     */
    IGSConnection.prototype._onLoggedIn = function() {
        this.sendCommand('toggle client true');
        
        //this.sendCommand('toggle quiet false'); // Informs me with connects/disconnects/gameresults/new games happening on the server
        this.sendCommand('toggle nmatch true');
        this.sendCommand('toggle newrating true');
        this.sendCommand('toogle looking off');
        
        //toggle seek true
        //toggle open off
        
        // Refresh games every ms interval
        this.refreshLiveGames(30000);    
	
        this.emit('loggedIn');
    };
    
    IGSConnection.prototype._onGameInfoStart = function() {
        this.IGSStatus.LiveGames = {};
    };
    
    IGSConnection.prototype._onLiveGameEntry = function(game) {
        this.IGSStatus.LiveGames[game.id] = game;
    };
    
    IGSConnection.prototype._onGameMoveHeader = function(moveHeader) { };
    
    IGSConnection.prototype._onGameMove = function(move) {
        var game = this.IGSStatus.ObservingGames[move.header.gameId];
        
        if (typeof(game) === 'undefined') {
            game = this.IGSStatus.ObservingGames[move.header.gameId] = new IGSGame;
        }
        
        game.addMove(move);
        
        this.emit('gameMove', move);
    };
    
    IGSConnection.prototype._onGameEnd = function(gameEnd) {
        
        var finishedGame = this.IGSStatus.ObservingGames[gameEnd.gameId];
        
        finishedGame.setResult(gameEnd.result);
        
        this.IGSStatus.FinishedGames.push(finishedGame);
        delete this.IGSStatus.ObservingGames[gameEnd.gameId];
        
        console.log('Game ended.', finishedGame);
        this.emit('gameEnd', finishedGame);
    };
    
exports = module.exports = IGSConnection;
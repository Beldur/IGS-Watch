var ClientManager = function(igsConnection, socketIo) {
    if ((this instanceof ClientManager) === false) {
        return new ClientManager;
    }
    
    var self = this;
    
    this.clientsObservingGames = {};
    this.igsConnection = igsConnection;
    this.socketIo = socketIo;
    
    socketIo.on('connection', function(client) {
        self.addClient(client);
    });
    
    // Send live games to clients every 30000 seconds
    setInterval(function() {
        self.sendLiveGames();
    }, 30000);
    
    this.igsConnection.on('gameMove', this.addGameMoveToClients.bind(this));
};

/**
 * Add a client to the Client Manager
 */
ClientManager.prototype.addClient = function(client) {
	var self = this;
	
	client.observingGames = [];
	
    client.on('disconnect', function() {
        var client = this;
        self.removeClient(client);
    });
    
    client.on('message', function(data) {
        var client = this;
        self._onClientData(client, data);
    });
    
    this.sendLiveGames(client);
};

ClientManager.prototype.removeClient = function(client) {
	
};

ClientManager.prototype._onClientData = function(client, data) {
    console.log('Client data:', data);
    
    try {
        var dataObj = JSON.parse(data);
        
        if (typeof dataObj.cmd !== 'undefined' && typeof dataObj.payload !== 'undefined') {
            switch (dataObj.cmd) {
                case 'getLiveGames':
                	this.sendLiveGames(client);
                    break;
                case 'observe':
                	this.observeGame(client, dataObj.payload);
                    break;
        	    default:
                    console.log('Command', dataObj.cmd);
                    break;
            }
        }
    } catch (ex) {
    	console.log('Could not parse', data, ex.message);
    }
};

/**
 * Send current Live games to clients
 * 
 * @param {Object} socket.io Client
 */
ClientManager.prototype.sendLiveGames = function(client) {
	
	// Convert Live game list to an array
	var games = this.igsConnection.LiveGames,
	    result = [];
	
	for(var i in games) {
		if(games.hasOwnProperty(i)) {
			result.push(games[i]);
		}
	}
	
	var cmd = this.createCommand('getLiveGames', result);
	
	if (client === undefined) {
    	console.log('Broadcast live games...');
		this.socketIo.broadcast(cmd);
	} else {
		console.log('Send live games...', client.sessionId);
		client.send(cmd);
	}
};

/**
 * Start observing a game for a client
 */
ClientManager.prototype.observeGame = function(client, payload) {
	var gameId = payload.id;
	
	if (gameId > 0 && client.observingGames.indexOf(gameId) === -1) {
	    client.observingGames.push(gameId);
	    
	    if (this.igsConnection.IGSStatus.ObservingGames[gameId] != undefined) {
	    	this.sendGameToClient(client, gameId);
	    }
	    
	    this.igsConnection.observeGame(gameId);
	}
};

/**
 * 
 */
ClientManager.prototype.addGameMoveToClients = function(move) {
	var gamePos,
    client,
    cmd;

    for (var i = 0, k = Object.keys(this.socketIo.clients); i < k.length; i++) {
    	client = this.socketIo.clients[k[i]];
    	gamePos = client.observingGames.indexOf(move.header.gameId);
    	
    	if (gamePos > -1) {
    		cmd = this.createCommand('gameMove', move);
    		client.send(cmd);
    	}
    }
};

ClientManager.prototype.sendGameToClient = function(client, gameId) {
    var game = this.igsConnection.IGSStatus.ObservingGames[gameId],
        i,
        cmd;
	
    for (i = 0; i < game.moves.length; i++) {
    	cmd = this.createCommand('gameMove', game.moves[i]);
		client.send(cmd);
    }
};

/**
 * Create a command for sending with socket.io to the client
 * 
 * @param {String} cmd
 * @param {Object} payload
 */
ClientManager.prototype.createCommand = function(cmd, payload) {
	var json = JSON.stringify(payload);
	
	return '{"for": "' + cmd + '", "payload": ' + json + '}';
};

exports = module.exports = ClientManager;
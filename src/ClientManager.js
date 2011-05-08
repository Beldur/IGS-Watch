var ClientManager = function(igsConnection, socketIo) {
    if ((this instanceof ClientManager) === false) {
        return new ClientManager;
    }
    
    var self = this;
    
    this.Clients = {};
    this.igsConnection = igsConnection;
    this.socketIo = socketIo;
    
    socketIo.on('connection', function(client) {
        self.addClient(client);
    });
    
    // Send live games to clients every 30000 seconds
    setInterval(function() {
        self.sendLiveGames();
    }, 30000);
};

ClientManager.prototype.addClient = function(client) {
	var self = this;
	
    this.Clients[client.sessionId] = client;
    
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
    delete this.Clients[client.sessionId];
};

ClientManager.prototype._onClientData = function(client, data) {
    console.log('Client data:', data);
    
    try {
        var dataObj = JSON.parse(data);
        
        if (typeof dataObj.cmd !== 'undefined') {
            switch (dataObj.cmd) {
                case 'getLiveGames':
                	this.sendLiveGames(client);
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
	
	var jsonGames = JSON.stringify(result),
	    cmd = '{"for": "getLiveGames", "payload": ' + jsonGames + '}';
	
	if (client === undefined) {
    	console.log('Broadcast live games...');
		this.socketIo.broadcast(cmd);
	} else {
		console.log('Send live games...', client.sessionId);
		client.send(cmd);
	}
};

exports = module.exports = ClientManager;
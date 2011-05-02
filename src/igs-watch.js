var express = require('express'),
    ejs		= require('ejs'),
    sio		= require('socket.io'),
    igs		= require('./IGS/IGS'),
    expressServer = express.createServer(),
    igsConnection = new igs.IGSConnection;

igsConnection
	.on('connected', function() {
	    console.log('Connected');
	})
	.on('loggedIn', function() {
		igsConnection.sendCommand('game');
		
		setTimeout(function() {
			var gameId = igsConnection.LiveGames[7].id;
			igsConnection.observeGame(gameId);
		}, 5000);
		
//	    refreshGameList = function() {
//	        setTimeout(function() {
//	            console.log(self.LiveGames);
//	            //socket.write('game\n');
//	            //refreshGameList();
//	        }, 5000);
//	    };
//	    refreshGameList();
	})
	.on('disconnected', function() {
		console.log('Disconnected from server');
	});

igsConnection.connect('igs.joyjoy.net', 6969);

expressServer.configure(function() {
	expressServer.set('views', __dirname + '/../views');
	expressServer.set('view engine', 'ejs');
	expressServer.use(express.static(__dirname + '/../public'));
});

expressServer.get('/', function(req, res) {
	res.render('index.ejs');
});

expressServer.listen(8080);

var socketIo = sio.listen(expressServer);
socketIo.on('connection', function(client) {
	console.log('websocket connect', client);
	
	client
	    .on('disconnect', function() {
	    	var client = this;
	        console.log('websocket disconnect');
	    }).on('message', function(data) {
	    	var client = this;
	        console.log('websocket message', data);
	    });
});
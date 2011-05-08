var express = require('express'),
    ejs        = require('ejs'),
    sio        = require('socket.io'),
    igs        = require('./IGS/IGS'),
    expressServer = express.createServer(),
    igsConnection = new igs.IGSConnection,
    ClientManager = require('./ClientManager');

igsConnection
    .on('connected', function() {
        console.log('Connected');
    })
    .on('loggedIn', function() {
    	igsConnection.refreshLiveGames();
    	
        /*setTimeout(function() {
            var gameId = igsConnection.LiveGames[7].id;
            igsConnection.observeGame(gameId);
        }, 5000);*/
        
        var refreshGameList = function() {
            setTimeout(function() {
            	igsConnection.refreshLiveGames();
            	refreshGameList();
            }, 30000);
        };
        refreshGameList();
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
var clientMgr = new ClientManager(igsConnection, socketIo);
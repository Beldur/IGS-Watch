$.Model('IW.Models.LiveGame', { }, { });
$.Model.List('IW.Models.LiveGame.List', { });

$.Model('IW.Models.Game', {

}, {
    addMove: function(move) {
        console.log('addMove', move);
    }
});

$.Model.List('IW.Models.Game.List', {

});

$.Controller.extend("IW.Controllers.SocketController", {
    onDocument: true,
    socket: new io.Socket()
}, {
    init: function() {
        var self = this;
        
        this.Class.socket.connect();
        
        this.Class.socket.on('message', function(data) {
            self.onSocketData(data, this);
        });
        
        console.log('init', this.Class.socket);
    },
    /**
     * Parse data and publish command
     */
    onSocketData: function(data, socket) {
        var dataObj = JSON.parse(data);
        
        if (dataObj['for'] !== undefined && dataObj.payload !== undefined) {
            this.publish('SocketCommand.' + dataObj.for, dataObj.payload);
        } else {
            console.log('Dont understand', dataObj);
        }
    },
    'SocketCommand subscribe': function(name, data) {
        console.log('Send command:', data);
        this.Class.socket.send(JSON.stringify(data));
    }
});

/**
 * Controller for handleling live game updates
 */
$.Controller.extend('IW.Controllers.LiveGames', {
    
}, {
    init: function() {
        this.gameList = new IW.Models.LiveGame.List();
    },
    /**
     * Parse live games from server and render them
     */
    'SocketCommand.getLiveGames subscribe': function(name, liveGames) {
        var i = liveGames.length;
    
        this.gameList = new IW.Models.LiveGame.List();
    
        while(i--) {
            this.gameList.push(new IW.Models.LiveGame(liveGames[i]));
        }
    
        this.element.html("/views/liveGames.ejs", this.gameList);
    },
    /**
     * Observe a game
     */
    '.iw_live_games .observe click': function(el, ev) {
        var liveGame = el.closest('tr').model();
        
        this.publish('SocketCommand', {
            cmd: 'observe',
            payload: { id: liveGame.id }
        });
    }
});

$.Controller.extend('IW.Controllers.ObservingGames', {
    
}, {
    init: function() {
        this.observeGameList = new IW.Models.Game.List();
    },
    'SocketCommand.gameMove subscribe': function(name, move) {
        var game = this.observeGameList.grep(function(item) {
            return (item.id === move.header.gameId) ? true : false;
        })[0];
        
        if (game === undefined) {
            console.log('Game not yet observed. creating...');
            
            game = new IW.Models.Game({
                id: move.header.gameId
            });
            
            this.addGame(game);
        }
        
        game.addMove(move);
    },
    addGame: function(game) {
        this.observeGameList.push(game);
        
        $('#gameTabs').tabs('add', '#game-' + game.id, 'Game #' + game.id);
        var tabIndex = $('#gameTabs .ui-tabs-nav li:last').index();
        $('#gameTabs').tabs('select', tabIndex);
        $('#game-' + game.id).iw_observe_game(game.id);
    }
});

$.Controller.extend('IW.Controllers.ObserveGame', {
    
}, {
    init: function(el, gameId) {
        this.gameId = gameId;
        this.element.append('<div id="eidogo-' + gameId + '"></div>');
        
        var cfg = {
            progressiveLoad:    false,
            markCurrent:        true,
            markVariations:     true,
            markNext:           false,
            showGameInfo:       true,
            showPlayerInfo:     true,
            showOptions:        false,
            showTools:          false,
            showNavTree:        true,
            problemMode:        false
        };
        
        var hooks = {};
        
        this.player = new eidogo.Player({
            container:          "eidogo-" + gameId,
            sgfPath:            "sgf/",
            searchUrl:          "backend/search.php",
            saveUrl:            "backend/save.php",
            downloadUrl:        "backend/download.php?id=",
            scoreEstUrl:        "backend/gnugo.php",
            hooks:              hooks,
            enableShortcuts:    true
        });
        
        this.player.loadSgf(cfg);
        p = this.player;
    },
    'SocketCommand.gameMove subscribe': function(name, move) {
    	if (move.header.gameId !== this.gameId) return;
    	
    	var sgfCoords = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
    	var coord = move.position[0].toLowerCase();
    	coord += sgfCoords[move.position.slice(1)];
    	
    	console.log('create move', coord);
        this.player.createMove(coord);
    }
});

// Init components
$(document).ready(function() {
    $('#gameTabs').tabs();
    $('#liveGames').iw_live_games();
    $('#gameTabs').iw_observing_games();
});
$.Model('IW.Models.LiveGame', {

}, {
    
});

$.Model.List('IW.Models.LiveGame.List', {

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

// Init components
$(document).ready(function() {
    $('#liveGames').iw_live_games();
});
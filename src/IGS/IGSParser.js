var sys = require('sys'),
    events = require('events');

var IGSREGEX_LINE = new RegExp("^.*\r$", "m"),
    IGSREGEX_LOGIN = new RegExp("^Login:", "m"),
    IGSREGEX_LOGINMSG = new RegExp("You have entered IGS at igs.joyjoy.net ", "m"),
    
    /* Game Info RegExps */
    IGSREGEX_GAMEINFO_START = new RegExp("^7 \\[##\\]  white.*$", "m"),
    IGSREGEX_GAMEINFO = new RegExp("^7 \\[([0-9 ]+)\\][ ]*" +
                                   "([a-zA-Z0-9*]+) \\[([ 0-9kdBC+?]+)\\] vs[.][ ]*" + // White Name/Rank
                                   "([a-zA-Z0-9*]+) \\[([ 0-9kdBC+?]+)\\] " + // Black Name/Rank
                                   "\\([ ]*([0-9]+)[ ]+([0-9]+)[ ]+([0-9])[ ]+([\\-0-9.]+)[ ]+([0-9]+)[ ]+([FTI]+)\\) \\(([0-9 ]+)\\)$", "m"), // Game properties
    
    // @todo implement
	IGSREGEX_GAMEMOVEHEADER = new RegExp("^15 Game ([0-9]+) I: ([a-zA-Z0-9*]+) \\(([0-9]+) ([0-9]+) (-?[0-9]+)\\) vs ([a-zA-Z0-9*]+) \\(([0-9]+) ([0-9]+) (-?[0-9]+)\\)$", "m"),
	IGSREGEX_GAMEMOVE_PROPS = new RegExp("^15 GAMERPROPS:([0-9]+): ([0-9]+) ([0-9]) ([\\-0-9.]+)", "m"),
	IGSREGEX_GAMEMOVE = new RegExp("^15\\s+([0-9]+)\\((W|B)\\):\\s+((?:[A-Z][0-9]+)|Handicap [2-9]|Pass)((?: [A-Z][0-9]+)*)$", "m"),
	IGSREGEX_GAMEEND = new RegExp("^9 \\{Game ([0-9]+): \\S+ vs \\S+ : (.*)\\}$", "m"),
    
    /* RegExps with parser functions */
    LINE_PARSER = [
        [IGSREGEX_LOGINMSG, '_parseLoginMessage'],
        [IGSREGEX_GAMEINFO_START, '_parseGameInfoStart'],
        [IGSREGEX_GAMEINFO, '_parseGameInfo'],
        [IGSREGEX_GAMEMOVEHEADER, '_parseGameMoveHeader'],
        [IGSREGEX_GAMEMOVE_PROPS, '_parseGameMoveProps'],
        [IGSREGEX_GAMEMOVE, '_parseGameMove']
    ];

var IGSParser = exports = module.exports = function IGSParser() {
    if ((this instanceof IGSParser) === false) {
        return new IGSParser;
    }
    
    events.EventEmitter.call(this);
    
    this.buffer = '';
    this.moveCache = {
        latestHeader: null,
        latestGameProps: null
    };
};
sys.inherits(IGSParser, events.EventEmitter);

IGSParser.prototype.addInput = function (input) {
    this.buffer += input;
    
    this._parseBuffer();
};

IGSParser.prototype._parseBuffer = function () {
    var tmpBuffer = this.buffer;
    
    while (true) {
        
        var loginMatch = tmpBuffer.match(IGSREGEX_LOGIN);
        if (loginMatch) {
            // Fire login event
            this.emit('login');
            tmpBuffer = '';
            break;
        }
        
        var lineMatch = tmpBuffer.match(IGSREGEX_LINE);
        if (!lineMatch) {
            //console.log('no new line');
            break;
        }
        
        this._parseLine(lineMatch[0]);
        
        var l = lineMatch[0].length;
        if (tmpBuffer.length - l <= 0) {
            break;
        }
        
        tmpBuffer = tmpBuffer.slice(l + 1);
    }
    
    this.buffer = tmpBuffer;
};

/**
 * Parse line with LINE_PARSER
 */
IGSParser.prototype._parseLine = function(line) {
	var matches;
    
    console.log(line);
    
    for (var i = 0; i < LINE_PARSER.length; i++) {
        matches = line.match(LINE_PARSER[i][0]);
        if (matches) {
        	var func = this[LINE_PARSER[i][1]];
        	
        	if (func != undefined) return this[LINE_PARSER[i][1]](matches);
        }
    }
    
    return false;
};

/* Line Parsers */
		
IGSParser.prototype._parseLoginMessage = function(match) {
    this.emit('loggedIn');
    
    return true;
};

IGSParser.prototype._parseGameInfoStart = function(match) {
    this.emit('gameInfoStart');
    
    return true;
};

/**
 * Game Info comes from listing all games
 */
IGSParser.prototype._parseGameInfo = function(match) {
    var game = {
        id: parseInt(match[1], 10),
        whiteName: match[2],
        whiteRank: match[3].trim(),
        blackName: match[4],
        blackRank: match[5].trim(),
        move: parseInt(match[6], 10),
        size: parseInt(match[7], 10),
        handicap: parseInt(match[8], 10),
        komi: parseFloat(match[9]),
        byoyomi: parseInt(match[10], 10),
        gameType: match[11],
        observer: parseInt(match[12].trim(), 10)
    };
    
    this.emit('liveGameEntry', game);
	
    return true;
};

/**
 * When getting moves from a game we get a move header
 */
IGSParser.prototype._parseGameMoveHeader = function(match) {
	var moveHeader = {
	    gameId: parseInt(match[1], 10),
	    whiteName: match[2],
	    whiteCaptures: parseInt(match[3], 10),
	    whiteTimeLeft: parseInt(match[4], 10),
	    whiteMovesLeft: match[5],
	    blackName: match[6],
	    blackCaptures: parseInt(match[7], 10),
	    blackTimeLeft: parseInt(match[8], 10),
	    blackMovesLeft: match[9]
	};
	
	this.moveCache.latestHeader = moveHeader;
	
	this.emit('gameMoveHeader', moveHeader);
	
	return true;
};

/**
 * When getting moves from a game we sometimes get Game Props
 */
IGSParser.prototype._parseGameMoveProps = function(match) {
	var gameProps = {
	    gameId: parseInt(match[1], 10),
	    boardSize: parseInt(match[2], 10),
	    handicap: parseInt(match[3], 10),
	    komi: parseFloat(match[4])
	};
	
	this.moveCache.latestGameProps = gameProps;
	
	this.emit('gameMoveGameProps', gameProps);
	
	return true;
};

/**
 * Parse the move and add latest Move Header and Game Props
 */
IGSParser.prototype._parseGameMove = function(match) {
	var move = {
	    header: this.moveCache.latestHeader,
	    gameProps: this.moveCache.latestGameProps,
	    number: parseInt(match[1], 10),
	    color: match[2],
	    position: match[3],
	    captures: (match[4] && match[4].trim().split(' ')) || []
	};
	
    this.emit('gameMove', move);
    
    return true;
};
var IGSGame = exports = module.exports = function IGSGame() {
    if ((this instanceof IGSGame) === false) {
        return new IGSGame;
    }
    
    this.moves = [];
    this.result = '';
};

IGSGame.prototype.addMove = function(move) {
    this.moves[move.number] = move;
    
    this.playerWhite = this.playerWhite || move.header.whiteName;
    this.playerBlack = this.playerBlack || move.header.blackName;
    
    if (move.gameProps !== null) {
        this.boardSize = this.boardSize || move.gameProps.boardSize;
        this.handicap = this.handicap || move.gameProps.handicap;
        this.komi = this.komi || move.gameProps.komi;
    }
};

IGSGame.prototype.setResult = function(result) {
    this.result = result;
};
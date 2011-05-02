var IGSGame = exports = module.exports = function IGSGame() {
    if ((this instanceof IGSGame) === false) {
        return new IGSGame;
    }
    
    this.moves = [];
};

IGSGame.prototype.addMove = function(move) {
    this.moves[move.number] = move;
};
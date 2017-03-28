jQuery(function($) {

  'use strict';

  /** ---- Helper functions ---- **/

  /**
   * Char replace helper
   * @param  {String}  str    String to process
   * @param  {Number}  index  Place of the string where to repalce the character
   * @param  {String}  char   Character to be inserted
   */
  function replaceChar(str, index, char) {
    var _str = str.split('');

    _str[index] = char;

    return _str.join('');
  }

  /**
   * Find highest array element index
   * @param  {Array}  arr  Array to process
   */
  function highestIndex(arr) {

    var highest = 0;
    var index = 0;

    for (var i = 0; i < arr.length; i++) {
      if (arr[i] > highest) {
        highest = arr[i];
        index = i;
      }
    }

    return index;
  }

  function log(message, err) {
    var timeString = new Date().toTimeString().split(' ')[0];
    message = timeString + ' - ' + message;

    if (err) {
      console.error(message);
      return;
    }

    console.log(message);
  }

  /** ---- Game ---- **/

  /**
   * Game oject
   * @param  {String}  userSymbol  Symbol that represents the user in the game
   */
  function Game(userSymbol) {

    log('New game created');

    var self = this;

    // validate symbol chosen by user and assign default
    userSymbol = userSymbol === 'o' ||
      userSymbol === 'x' ? userSymbol : 'o';

    self.state = 'start';

    self.ai = {
      symbol: userSymbol === 'o' ? 'x' : 'o',
      player: new AI(this),
      input: function(pos) {
        if (self.state === 'ai') {
          log('AI input');
          self.state = 'player';
          $('#message').html("Player's turn");
          self.grid.update(pos, self.ai.symbol);
        }
      }
    };

    self.moves = 0;

    self.player = {
      symbol: userSymbol,
      input: function(pos) {
        if (self.state === 'player') {
          log('Player input');
          self.state = 'ai';
          self.grid.update(pos, self.player.symbol);

          if (self.state !== 'end') {
            $('#message').html("Computer's turn");
            setTimeout(self.ai.player.play, 800);
          }
        }
      }
    };

    self.emptySymbol = '-';

    // Initialize game grid
    var grid;

    /**
     * Game grid functionality
     */
    self.grid = {

      /**
       * Get current grid state
       */
      get: function() {
        return grid;
      },

      /**
       * Update game grid
       */
      update: function updateGrid(pos, symbol) {
        grid = replaceChar(grid, pos, symbol);
        self.moves += 1;

        // Update grid UI
        $('#' + pos).next('label').addClass(symbol);
        $('#' + pos).prop('checked', true);
        $('#' + pos).prop('disabled', true);

        var winner = self.isGameOver(self.grid.get());

        if (winner) {
          self.state = 'end';
          // Update game state if game is over

          log('Game over');
          log(self.grid.get());

          var message = winner === 'tie' ?
            "It's a tie." : winner.toUpperCase() + ' wins!';

          log(message);
          $('#message').html(message);
          $('#restart-game').html('Restarting game...');

          setTimeout(self.restart, 3000);
        }
      }
    };

    /**
     * Check if the game is over and output the winner
     */
    self.isGameOver = function(grid) {

      log(grid);
      // Possible winning patterns for X
      var xStr = "(^x{3}|x{3}$|^...x{3}|x..x..x|^..x.x.x|^x...x...x)";
      var xRe = new RegExp(xStr);

      // Convert to possible winning patterns for O
      var oRe = new RegExp(xStr.replace(/x/g, 'o'));

      if (oRe.test(grid)) {
        // Check if 'o' is the winner
        return 'o';
      }

      if (xRe.test(grid)) {
        // Check if 'x' is the winner
        return 'x';
      }

      if (!/-/.test(grid)) {
        // Check if no empty spaces left
        return 'tie';
      }

      return false;
    };
    
    
    /**
     * Game initialization
     */
    self.init = function() {
      // Empty grid
      grid = self.emptySymbol.repeat(9);
      self.moves = 0;
      
      // Reset grid UI
      var cells = $('.tic-tac-toe .grid input[type="checkbox"]');
      cells.next('label').removeClass(self.ai.symbol);
      cells.next('label').removeClass(self.player.symbol);
      cells.prop('checked', false);
      cells.prop('disabled', false);
      
      // REstart button text
      $('#restart-game').html('Restart game');

      // Flip coin to decide who goes first
      if (Math.floor(Math.random() * 2)) {
        self.state = 'ai';
        setTimeout(self.ai.player.play, 1000);
        $('#message').html("Computer goes first");
        return;
      }

      $('#message').html("Player goes first");
      self.state = 'player';
    };
    

    /**
     * Game restart
     */
    self.restart = function() {
      log('Restart game');
      self.init();
    };
    
    
    self.init();
  }

  /**
   * AI object
   */
  function AI(game) {

    var self = this;

    /**
     * Return available moves for the specified grid
     */
    self.availableMoves = function(grid) {
      var available = [];

      for (var i = 0; i < grid.length; i++) {
        if (grid[i] === game.emptySymbol) {
          available.push(i);
        }
      }

      return available;
    };

    /**
     * Return a random move for the AI
     */
    self.randomMove = function(grid) {
      log('Random move!');
      var available = self.availableMoves(grid);

      return available[Math.floor(Math.random() * available.length)];
    };


    /**
     * Calculate best move for AI
     * It will try all moves possible for both players given the current
     * grid and assign a score depending on how long does it take to win.
     * The highest scoring initial move is returned.
     *
     * Based on this solution https://medium.freecodecamp.com/how-to-make-your-tic-tac-toe-game-unbeatable-by-using-the-minimax-algorithm-9d690bad4b37
     *
     * @param  {String}  grid       Current game grid state
     * @param  {String}  aiSymbol   AI player symbol
     * @param  {Number}  [depth=0]  Current recursion depth
     */
    self.calcMove = function(grid, aiSymbol, depth) {

      depth = depth || 0;
      
      log('----');
      log(depth);
      log('----');
      
      
      // Return a random move if this is the first move
      if (game.moves <= 1) {
        return {index: self.randomMove(grid)};
      }

      var availableMoves = self.availableMoves(grid);

      // Set opposite symbol for player
      var playerSymbol = aiSymbol === 'x' ? 'o' : 'x';

      // Get the current turn symbol depending on the depth
      var turnSymbol = !Boolean(depth % 2) ? aiSymbol : playerSymbol;

      var winner = game.isGameOver(grid);

      if (winner === playerSymbol) {
        return {
          score: -10
        };
      } else if (winner === aiSymbol) {
        return {
          score: 10
        };
      } else if (availableMoves.length <= 0) {
        return {
          score: 0
        };
      }

      // Calculated moves
      var moves = [];

      for (var i = 0; i < availableMoves.length; i++) {

        // Store index of available move
        var move = {};
        move.index = availableMoves[i];

        var newGrid = replaceChar(grid, move.index, turnSymbol);

        var result;

        // Check following moves and get score
        result = self.calcMove(newGrid, aiSymbol, depth + 1);
        move.score = result.score;

        // Push calculated move
        moves.push(move);
      }
    
      var bestMove;
      var bestScore;

      if (turnSymbol === aiSymbol) {
        bestScore = -10000;

        for (i = 0; i < moves.length; i++) {
          if (moves[i].score > bestScore) {
            bestScore = moves[i].score;
            bestMove = i;
          }
        }
      } else {
        bestScore = 10000;

        for (i = 0; i < moves.length; i++) {
          if (moves[i].score < bestScore) {
            bestScore = moves[i].score;
            bestMove = i;
          }
        }

      }
      
      return moves[bestMove];
    };


    /**
     * Calculate best move and play
     */
    self.play = function() {
      var nextMove = self.calcMove(game.grid.get(), game.ai.symbol);
      console.log(nextMove);
      game.ai.input(nextMove.index);
    };
  }

  /** Initialize Game **/
  $('form input[type="submit"]').click(function(e) {
    e.preventDefault();

    $('.new-game').addClass('hidden');
    $('.tic-tac-toe').removeClass('hidden');

    var playerSymbol = $(e.target).val().toLowerCase();
    var game = new Game(playerSymbol);

    $('.tic-tac-toe .grid input').change(function(e) {
      game.player.input(e.target.id);
    });

    $('#restart-game').click(game.restart);
  });

});
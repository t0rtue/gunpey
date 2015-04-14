
var App = angular.module('gunpey', ['ngRoute', 'ngDragDrop']);

App.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/home', {
            templateUrl: 'partials/home.html'
        }).
        when('/speed', {
            templateUrl: 'partials/game.html',
            controller: 'gameCtrl',
            controllerAs: 'game',
            pageKey : 'SPEED'
        }).
        when('/puzzle', {
            templateUrl: 'partials/game.html',
            controller: 'gameCtrl',
            controllerAs: 'game',
            pageKey : 'PUZZLE'
        }).
        when('/bonjour', {
            templateUrl: 'partials/game.html',
            controller: 'gameCtrl',
            controllerAs: 'game',
            pageKey : 'BONJOUR'
        }).
        when('/editor', {
            templateUrl: 'partials/editor.html',
            controller: 'editorCtrl',
            controllerAs: 'editor',
            pageKey : 'EDITOR'
        }).
        otherwise({
            redirectTo: '/home'
        });
}]);

App.controller('menuCtrl', function($scope, $route) {
  $scope.$route = $route;
});

App.factory('board', function() {

    /*
    4 segment types :

    Type 1 : bottom-left to top-right

      /
     /
    /

    type 2 : up-left to bottom-right 

    \
     \
      \

    type 3 : up-left to up-right

    \  /
     \/

    type 4 : bottom-left ot bottom-right

     /\
    /  \

    type 5 : virtual "cross" segment used to represent the connection to borders (start and end)
             It is a trick to manage borders in the connection algorithm

    \ /
     X
    / \

    For each line type, the connections matrix defines which types are neighbors
    according to their relative position.
    There is 8 relative positions for a segment (3x3 square with the segment in the middle).
  */
  var connections = [
    // Type 1 neighborhood
    [
      [[     ],[2,4],[1,4,5]],
      [[2,4,5],[   ],[2,3,5]],
      [[1,3,5],[2,3],[     ]],
    ],
    // Type 2 neighborhood
    [
      [[2,4,5],[1,4],[     ]],
      [[1,3,5],[   ],[1,4,5]],
      [[     ],[1,3],[2,3,5]]
    ],
    // Type 3 neighborhood
    [
      [[2,4],[1,2],[1,4,5]],
      [[1,3],[   ],[2,3,5]],
      [[   ],[   ],[     ]]
    ],
    // Type 4 neighborhood
    [
      [[     ],[   ],[     ]],
      [[2,4,5],[   ],[1,4,5]],
      [[1,3,5],[1,2],[2,3,5]]
    ],
    // Type 5 neighborhood
    [
      [[2,4    ],[   ],[1,4    ]],
      [[1,2,3,4],[   ],[1,2,3,4]],
      [[1,3    ],[   ],[2,3    ]]
    ]
  ];


  /*
    Return true if line of type t1 is connected to line of type t2.
    Column offset (a) and line offset (b) give the relative position of t2 according to t1.
  */
  function isConnected(t1, t2, a, b) {
    var connected = connections[t1-1][b+1][a+1];
    return (connected.indexOf(t2) != -1);
  }


  /*
    Recursivly check and update the state 'on' of a item
    An item is 'on' if it is connected to left and right side
  */
  function checkItem(col, idx, item) {

    if (item.on) {
      return item.on;
    }
    

    if (col == board.matrix.length-1) {
      item.on = true;
    } else {

      // First pass to mark neighors
      // Avoid the "electricity" get out from the side where it comes from
      var neighbors =[];
        for (var i=-1; i<=1;i++) {
          if (col+i <= 0) continue;
          for (var j=-1; j<=1;j++) {
            var column = board.matrix[col+i];
            var n =  column && column[idx+j];
            if (n && n.type && !n.marked && isConnected(item.type, n.type, i, j)) {
              n.marked = true;
              neighbors.push({col:col+i, line:idx+j, item:n});
            }
          }
        }

      // Second pass to recursivly check neighbors
      item.on = false;
      for (n in neighbors) {
        item.on = checkItem(neighbors[n].col, neighbors[n].line, neighbors[n].item) || item.on;
      }

      // Third pass to unmark neighbors after all recursive process
      for (n in neighbors) {
        neighbors[n].item.marked = false;
      }

    }

    return item.on;
  }

  /*
    Turn "on" all segments properly connected to both borders
    Return true if borders are connected
  */
  function checkConnection() {

      var on = false;

      // We add 2 "virtual" columns to represent left and right borders
      var border = [];
      for (var i=0; i < board.matrix[0].length; i++) {
        border.push({type:5});
      }
      board.matrix.unshift(border);
      board.matrix.push(angular.copy(border));

      // Browse all items of the first column and follow connected segments
      // Check if they are connected to the right border
      for (var i=0; i < board.matrix[0].length; i++) {
        var item = board.matrix[0][i];
        on = checkItem(0, i, item) || on;
      }

      // Remove the 2 virtual columns
      board.matrix.pop();
      board.matrix.shift();

      return on;
  }

  /*
    Build the matrix and place items
  */
  function init(nbCol, nbRow) {
    board.matrix = [];
    for (i=0; i < nbCol; i++) {
      addColumn(nbRow, 2);
    }
  }

  function addColumn(nbRow, nbEmpty) {
      var column = [];
      for (j=0; j < nbRow; j++) {
        var type = (j < nbEmpty || Math.random() > 0.8) ? 0 : Math.floor(Math.random() * 5);
        column.push({
          'type': type,
          'drag': true
        });
      }
      board.matrix.push(column);
  }

  function isAllOn() {
    var dirty = false;
    for (var i in board.matrix) {
      var column = board.matrix[i];
      for (var j in column) {
        var item = column[j];
        if (item.type && !item.on) {
          dirty = true;
        }
      }
    }
    return !dirty;
  }

  /*
    set the property (a) of all items to false
  */
  function reset(a) {
    for (var i in board.matrix) {
      var column = board.matrix[i];
      for (j in column) {
        column[j][a] = false;
      }
    }
  }

  var board = {
    matrix : [],
    checkConnection : checkConnection,
    init : init,
    addColumn : addColumn,
    isAllOn : isAllOn,
    reset  : reset
  };

    return board;
});

App.controller('gameCtrl', function($scope, $timeout, $http, $location, board) {

  $scope.board = board;
  $scope.nbCol = 10;
  $scope.nbRow = 10;

  $scope.score = 0;
  $scope.bestScore = parseInt(localStorage.getItem("gunpey.bestScore")) || 0;
  $scope.combo = 0;
  $scope.missed = 0;
  $scope.fail = [];
  $scope.message = "";
  $scope.level = parseInt(localStorage.getItem("gunpey.level")) || 1;
  $scope.endPuzzle = false;
  $scope.communityPuzzles = [];
  $scope.weeklyPuzzles = [];

  var timeBeforeClear = 1000;
  var difficultyThresholdStep = 1000;
  var difficultyThreshold = difficultyThresholdStep;

  var dragging = false;

  /*
    Really basic manual routing
    Launch the mode according to url
  */
  function loadMode() {
    var mode = $location.path().slice(1);
    var modeHandler = {
      'speed' : modeSpeed,
      'puzzle' : modePuzzle,
      'bonjour' : bonjour
    }[mode];
    if (modeHandler) {
      modeHandler();
    } else {
      mode = 'home';
    }
    $scope.mode = mode;
  }

  this.dropCallback = function(event, ui, title, $index) {
    check();
    dragging = false;
  };

  this.dragStart = function() {
    dragging = true;
  }


    /***************
      SPEED MODE
    ***************/

    /*
      Update score and best combo according to combo count.
    */
    function updateScore(combo) {
      if ($scope.combo < combo) {
        $scope.combo = combo;
      }
      // Bigger is the combo, bigger is the amount of earned points
      $scope.score += combo*combo;
      if ($scope.score > $scope.bestScore) {
        $scope.bestScore = $scope.score;
        localStorage.setItem('gunpey.bestScore', $scope.bestScore);
      }

      // Raise difficulty (nb columns) according to score
      if (($scope.score >= difficultyThreshold) && (board.matrix.length < 10)) {
        difficultyThreshold += difficultyThresholdStep;
        board.addColumn($scope.nbRow, 5);
      }
    }

    /*********
      COMMON
    *********/

  /*
    Count and remove all items 'on'.
    Trigger score and combo update.
  */
  function clear() {
    var count = 0;
    var dirty = false;
    for (var i in board.matrix) {
      var column = board.matrix[i];
      for (var j in column) {
        var item = column[j];
        if (item.on) {
          item.type = 0;
          item.on = false;
          count++;
        } else if (item.type) {
          dirty = true;
        }
      }
    }

    switch ($scope.mode) {
      case 'speed':
        updateScore(count);
        break;
      case 'puzzle':
        validateStage(dirty);
        break;
      case 'bonjour':
        validateBonjour(dirty);
        break;
    }

    $scope.$apply();
  }

  var timeoutClear;

  /*
    Check if there is connections between left and right sides.
    The property 'on' of all connected segments is set to true.
    Launch the clear process for 'on' segments.
  */
  function check() {
      board.reset('on');

      clearTimeout(timeoutClear);

      if (board.checkConnection()) {
        timeoutClear = setTimeout(clear, timeBeforeClear);
      }
  }

  this.check = check;

  function gameover(message) {
    $scope.message = message;

    clearInterval(interval);
    var i = 0;

    function disable() {
      var item;
      for (var j in board.matrix) {
        item = board.matrix[j][i];
        if (item) {
          item.drag = false;
        }
      }
      i++;
      $scope.$apply();
      if (item) {
        setTimeout(disable, 100);
      }
    }

    disable();

  }

  function fail(columnIdx) {
    $scope.missed++;
    if ($scope.fail[columnIdx]) {
      gameover("GAME OVER");
    }
    $scope.fail[columnIdx] = true;
  }

  /*
    Scroll column one step to the top.
    Update missed items (exited by the top)
    Randomly insert new items by the bottom
  */
  function scroll() {
    for (var i in board.matrix) {
      var column = board.matrix[i];
      for (var j in column) {
        var item = column[j];
        // Scroll item type
        // Do not need to update state 'on', it will be updated by the check() at the end
        if (j < column.length-1) {
          if (j==0 && item.type) {
            fail(i);
          }
          item.type = column[parseInt(j)+1].type;
        } else {
          item.type = Math.floor(Math.random() * 5);
        }
      }
    }
    check();
    $scope.$apply();
  }

  /*
    Launch the item scolling process
    Postpone if user is currently dragging an item (drag+scroll=inconsistency)
  */
  function update() {
    if (dragging) {
      setTimeout(update, 100);
    } else {
      scroll();
    }
  }



    /**************
      PUZZLE MODE
    ***************/

    /*
    Rebuild the matrix according to data
    */
    function loadMatrix(data) {
        $scope.currentData = data;
        board.matrix = [];
        for (var i = 0; i < data.length; i++) {
            var column = [];
            for (var j = 0; j < data[i].length; j++) {
                column.push({
                  'type': data[i][j],
                  'drag' : true
                });
            }
           board.matrix.push(column);
        }
    }

    this.reload = function () {
        $scope.message = "";
        loadMatrix($scope.currentData);
    }

    function load(name) {
      $http({method: 'GET', url: 'level/' + name + '.json'}).
          success(function(resp, status, headers, config) {
              loadMatrix(resp);
          }).error(function(resp, status, headers, config) {
              $scope.endPuzzle = true;
          });
    }

    function level(n) {
      $scope.message = "";
      board.matrix = [];
      $scope.puzzleName = "STAGE " + n;
      $scope.story = true;
      load(n);
    }
    this.level = level;

    function nextLevel() {
      $scope.level++;
      localStorage.setItem("gunpey.level", $scope.level);
      level($scope.level);
    }

    // Get an array from storage
    function _getArray(key) {
        var d = localStorage.getItem('gunpey.' + key);
        return (d ? d.split(',') : []);
    }

    // Set and save current puzzle is done
    function _setCurrentPuzzleDone(key) {
      var item = 'gunpey.' + key + '.done';

      if (!$scope.puzzle.done) {
        $scope.puzzle.done = true;

        // Save this puzzle is done
        var d = localStorage.getItem(item);
        if (d) {
          d += ',' + $scope.puzzle.id;
        } else {
          d = $scope.puzzle.id;
        }
        localStorage.setItem(item, d);
      }
    }

    function validateStage(dirty) {
      if (dirty) {
        gameover("NOT CLEARED");
      } else {
        if ($scope.story) {
          nextLevel();
        } else {
          $scope.message = "YEAH !";
          _setCurrentPuzzleDone('p');
        }
      }
    }

    function validateBonjour(dirty) {
      if (dirty) {
        gameover("NOT CLEARED");
      } else {
        $scope.message = "WELL DONE !";
        _setCurrentPuzzleDone('w');
      }
    }

    function loadWeekPuzzles() {
      var puzzlesDone = _getArray('w.done');
      var currentWeek = (new Date()).getWeek();
      var firstWeek = 14;

      for (i=currentWeek; i>=firstWeek; i--) {
        $scope.weeklyPuzzles.push({
          id : i,
          done : (puzzlesDone.indexOf(''+i) != -1)
        });
      }

      // Set current week puzzle
      $scope.puzzle = $scope.weeklyPuzzles[0];
      load('week/' + currentWeek);
    }

    /*
       Load community puzzles from the gunpey spreadsheets (on google drive)
       This sheet is automaticelly updated (IFTTT) for each new puzzle tweet #6µnp3λ
       A valid puzzle tweet is produced by the share button on the editor section
       Sheet has 2 columns : 'author' (the twitter user login) and 'data' (the tweet content)

       tweet data format : "00020000000230000000000040000000201020000000000040 Puzzle name #6µnp3λ"
       fields            :  |  row1   |  row2   |  row3   |  row4   |  row5  | |  name   | |htag |

       The number of rows may vary (up to 11) but there is always 10 digits in a row
       Max length : 10*11+1+20+1+7 = 139 (max tweet length = 140 :)
    */
    function _loadFromSheet() {

      var puzzlesDone = _getArray('p.done');

      var sheetID = "1lqXUJJlWKqXUxyDm2w2JGxTdfl6_RxPUrB0OlHNjQGA";
      $http({
        method: 'GET',
        url: 'https://spreadsheets.google.com/feeds/list/'+ sheetID +'/od6/public/values?alt=json'}
        ).success(function(resp) {
            var entries = resp.feed.entry || [];
            // Browse all row of the sheet
            for (var e = 0; e < entries.length; e++) {
              var entry = entries[e];
              var author = entry['gsx$author']['$t'];
              var data = entry['gsx$data']['$t'];
              var d = data.match(/^([0-4]*) (.*) #6/);

              // If valid format ([0]:match, [1]:matrix string, [2]:puzzle name)
              if (d) {
                // Cut the string to recreate the matrix of the starting puzzle position
                var columns = d[1].match(/.{10}/g);
                var start = [];
                for (i=0; i < columns.length; i++) {
                  var values = columns[i].split("");
                  for (j=0; j<values.length; j++) {
                    values[j] = parseInt(values[j]);
                  }
                  start.push(values);
                }

                // Add the puzzle data on the list
                // Puzzles from the sheet have an ID who looks like "t26"
                $scope.communityPuzzles.push({
                  id : 't'+e,
                  author : author,
                  name : d[2],
                  start : start,
                  done : (puzzlesDone.indexOf('t'+e) != -1),
                })
              }
            }
        })
    }

    function loadCommunityPuzzles() {

      var puzzlesDone = _getArray('p.done');

      // Get puzzles list
      $http({method: 'GET', url: 'level/community.json'}).
          success(function(resp, status, headers, config) {
            for (i = 0; i < resp.length; i++) {
              resp[i].id = i;
              resp[i].done = (puzzlesDone.indexOf(''+i) != -1);
            }
            $scope.communityPuzzles = resp;

            _loadFromSheet();
          })

    }

    this.playPuzzle = function(p) {
      $scope.message = "";
      $scope.puzzle = p;
      $scope.puzzleName = p.name;
      $scope.story = false;
      loadMatrix(p.start);
    }

    this.playWeekPuzzle =function(p) {
      $scope.message = "";
      $scope.puzzle = p;
      board.matrix = [];
      load('week/' + p.id);
    }

  /*
    MODES
  */

  var interval;

  function startMode() {
    $location.path($scope.mode);
    clearInterval(interval);
    $scope.score = 0;
    $scope.missed = 0;
    $scope.fail = [];
    $scope.message = "";
    difficultyThreshold = difficultyThresholdStep;
  }


  function modePuzzle() {
    $scope.mode = 'puzzle';
    startMode();
    if ($scope.endPuzzle) {
      $scope.endPuzzle = false;
      $scope.level = 1;
    }
    timeBeforeClear = 2000;
    loadCommunityPuzzles();
    level($scope.level);
  }
  this.modePuzzle = modePuzzle;

  function modeSpeed() {
    $scope.mode = 'speed';
    $scope.nbCol = 5;
    $scope.nbRow = 10;
    timeBeforeClear = 1300;
    startMode();
    board.init($scope.nbCol, $scope.nbRow);
    check();
    interval = setInterval(update, 5000);
  }
  this.modeSpeed = modeSpeed;

  function bonjour() {
    $scope.mode = 'bonjour';
    startMode();
    timeBeforeClear = 2000;
    loadWeekPuzzles();
  }
  this.bonjour = bonjour;

  this.pause = function() {
    clearInterval(interval);
    clearInterval(timeoutClear);
  }

  loadMode();

  $scope.$on('$destroy', function () {
    clearInterval(interval);
    clearInterval(timeoutClear);
    board.matrix = [];
  });

});

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
}

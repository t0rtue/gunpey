
var App = angular.module('gunpey', ['ngDragDrop']);

App.controller('gameCtrl', function($scope, $timeout, $http, $location) {

  $scope.matrix = []
  $scope.nbCol = 10;
  $scope.nbLine = 10;

  $scope.score = 0;
  $scope.bestScore = parseInt(localStorage.getItem("gunpey.bestScore")) || 0;
  $scope.combo = 0;
  $scope.missed = 0;
  $scope.fail = [];
  $scope.message = "";
  $scope.level = parseInt(localStorage.getItem("gunpey.level")) || 1;
  $scope.endPuzzle = false;

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

    For each line type, the connections matrix defines which types are neighbors
    according to their relative position.
    There is 8 relative positions for a segment (3x3 square with the segment in the middle).
  */
  var connections = [
    // Type 1 neighborhood
    [
      [[   ],[2,4],[1,4]],
      [[2,4],[   ],[2,3]],
      [[1,3],[2,3],[   ]],
    ],
    // Type 2 neighborhood
    [
      [[2,4],[1,4],[   ]],
      [[1,3],[   ],[1,4]],
      [[   ],[1,3],[2,3]]
    ],
    // Type 3 neighborhood
    [
      [[2,4],[1,2],[1,4]],
      [[1,3],[   ],[2,3]],
      [[   ],[   ],[   ]]
    ],
    // Type 4 neighborhood
    [
      [[   ],[   ],[   ]],
      [[2,4],[   ],[1,4]],
      [[1,3],[1,2],[2,3]]
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
    

    if (col == $scope.matrix.length-1) {
      item.on = true;
    } else {

      // First pass to mark neighors
      // Avoid the "electricity" get out from the side where it comes from
      var neighbors =[];
        for (var i=-1; i<=1;i++) {
          if (col+i <= 0) continue; 
          for (var j=-1; j<=1;j++) {
            var column = $scope.matrix[col+i];
            var n =  column && column[idx+j];
            if (n && n.type && !n.marked && isConnected(item.type, n.type, i, j)) {
              //item.on = checkItem(col+i, idx+j, n) || item.on;
              n.marked = true;
              neighbors.push({col:col+i, line:idx+j, item:n});
            }
          }
        }

      // Second pass to recursivly check neighbors
      item.on = false;
      for (n in neighbors) {
        item.on = checkItem(neighbors[n].col, neighbors[n].line, neighbors[n].item) || item.on;
        // neighbors[n].item.marked = false;
      }

      // Third pass to unmark neighbors after all recursive process
      for (n in neighbors) {
        neighbors[n].item.marked = false;
      }

    }

    return item.on;
  }


  /*
    set the property (a) of all items to false
  */
  function reset(a) {
    for (var i in $scope.matrix) {
      var column = $scope.matrix[i];
      for (j in column) {
        column[j][a] = false;
      }
    }
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
      if (($scope.score >= difficultyThreshold) && ($scope.matrix.length < 10)) {
        difficultyThreshold += difficultyThresholdStep;
        addColumn(5);
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
    for (var i in $scope.matrix) {
      var column = $scope.matrix[i];
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
      reset('on');

      clearTimeout(timeoutClear);

      // Browse all items of the first column and follow connected segments
      // Check if they are connected to the right border
      var on = false;
      for (var i in $scope.matrix[0]) {
        i = parseInt(i);
        var item = $scope.matrix[0][i];
        if (item && item.type) {
            on = checkItem(0, i, item) || on;
        }
      }

      if (on) {
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
      for (var j in $scope.matrix) {
        item = $scope.matrix[j][i];
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
    for (var i in $scope.matrix) {
      var column = $scope.matrix[i];
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

  /*
    Build the matrix and place items
  */
  function init() {
    $scope.matrix = [];
    for (i=0; i < $scope.nbCol; i++) {
      addColumn(2);
    }
  }

  function addColumn(nbEmpty) {
      var column = [];
      for (j=0; j < $scope.nbLine; j++) {
        var type = (j < nbEmpty || Math.random() > 0.8) ? 0 : Math.floor(Math.random() * 5);
        column.push({
          'type': type,
          'drag': true
        });
      }
      $scope.matrix.push(column);
  }

    /**************
      PUZZLE MODE
    ***************/

    /*
    Rebuild the matrix according to data
    */
    function loadMatrix(data) {
        $scope.matrix = [];
        for (var i = 0; i < data.length; i++) {
            var column = [];
            for (var j = 0; j < data[i].length; j++) {
                column.push({
                  'type': data[i][j],
                  'drag' : true
                });
            }
           $scope.matrix.push(column);
        }
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
      load(n);
    }

    function nextLevel() {
      $scope.level++;
      localStorage.setItem("gunpey.level", $scope.level);
      level($scope.level);
    }

    function validateStage(dirty) {
      if (dirty) {
        gameover("NOT CLEARED");
      } else {
        nextLevel();
      }
    }

    function validateBonjour(dirty) {
      if (dirty) {
        gameover("NOT CLEARED");
      } else {
        $scope.message = "WELL DONE !";
      }
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
    level($scope.level);
  }
  this.modePuzzle = modePuzzle;

  function modeSpeed() {
    $scope.mode = 'speed';
    $scope.nbCol = 5;
    $scope.nbLine = 10;
    timeBeforeClear = 1000;
    startMode();
    init();
    check();
    interval = setInterval(update, 5000);
  }
  this.modeSpeed = modeSpeed;

  function bonjour() {
    $scope.mode = 'bonjour';
    startMode();
    timeBeforeClear = 2000;
    $scope.week = (new Date()).getWeek();
    level('week/' + $scope.week);
  }
  this.bonjour = bonjour;

  this.pause = function() {
    clearInterval(interval);
    clearInterval(timeoutClear);
  }

  loadMode();
});

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
}

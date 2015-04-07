var App = angular.module('gunpey');

App.controller('editorCtrl', function($scope, $timeout, $http, board) {
    $scope.board = board;
    $scope.nbCol = 5;
    $scope.nbLine = 10;
    $scope.editPanel = [{type:1}, {type:2}, {type:3}, {type:4}, {type:0}];
    $scope.data = [];
    $scope.datastring = [];
    $scope.str = "";
    $scope.puzzle = {};

  /*
    Build the matrix
  */
  function init(n,m) {
    board.matrix = [];
    for (i=0;i<n;i++) {
      var column = [];
      for (j=0;j<m;j++) {
        var type = 0;
        column.push({
          'type': type
        });
      }
      board.matrix.push(column);
    }
  }

  init(5,10);

    /*
    Rebuild the matrix according to data
    */
    function loadMatrix(data) {
        board.matrix = [];
        for (var i = 0; i < data.length; i++) {
            var column = [];
            for (var j = 0; j < data[i].length; j++) {
                column.push({
                  'type': data[i][j]
                });
            }
           board.matrix.push(column);
        }
      }

    /*
    Rebuild the data according to matrix
    */
    function updateData() {
        $scope.data=[];
        for (var i = 0; i < board.matrix.length; i++) {
            var column = [];
            for (var j = 0; j < board.matrix[i].length; j++) {
                column.push(board.matrix[i][j].type);
            }
            $scope.data.push(column);
        }
    }

    this.dropCallback = updateData;

    this.reset = function() {
        $scope.puzzle = {};
        init($scope.nbCol,$scope.nbLine);
        updateData()
    }

    this.load = function() {
        var name = $scope.filename;
        $http({method: 'GET', url: 'level/' + name + '.json'}).
            success(function(data, status, headers, config) {
                $scope.data=data;
                loadMatrix(data);
            }).error(function(data, status, headers, config) {
                console.log('error loading json')
            });
    }

    this.shuffle = function() {
        for (var i = 0; i < $scope.data.length; i++) {
            $scope.data[i].sort(function() { return 0.5 - Math.random() });
        }
        loadMatrix($scope.data);
    }

    function checkPosition() {
        loadMatrix($scope.data);
        board.checkConnection();
        var clear = board.isAllOn();
        setTimeout(function() {board.reset('on'); $scope.$apply();}, 1000);

        return clear;
    }

    this.tagStart = function() {
        $scope.puzzle.start = angular.copy($scope.data);
    }

    this.tagSolution = function() {
        if (checkPosition()) {
            $scope.puzzle.solution = angular.copy($scope.data);
            $scope.notValid = false;
        } else {
            $scope.puzzle.solution = null;
            $scope.notValid = true;
        }
    }

    $scope.$on('$destroy', function () {
        board.matrix = [];
    });

});

(function(){

  var app = angular.module('mainController',[]);

  app.controller('MainController', [ '$scope', '$window', '$location', 'Token', 'Config', function($scope,$window,$location,Token,Config){

      $scope.logout = function(){
        delete $window.localStorage.token;
        $location.path('/login');
      };

      $scope.reload = function(){
        Config.reload();
      };

      $scope.discover = function(){
        Config.discover();
      };

  }]);

})();

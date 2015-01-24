(function(){

  var app = angular.module('apagadorController',[]);

  app.controller('ApagadorController', [ '$scope', 'Config', 'Device', 'Action', 'Service', 'Interaction', 'socketAquila', 'socketWSerial', function($scope, Config, Device, Action, Service, Interaction, socketAquila, socketWSerial)
  {
    $scope.device = null;
    $scope.state = true;
    $scope.error = null;

    $scope.toggle = function()
    {
      Service.put({id: $scope.device._id, service: "led"}, {isOn: !$scope.state}, function(res)
        {
          console.log(res);
          $scope.state = res.isOn;
          $scope.error = null;

        }, function(err)
        {
          $scope.error = "Error en la comuniación: " + err;
        });
    };

    $scope.updateState = function()
    {
      Service.get({id: $scope.device._id, service: "led"}, function(res)
        {
          console.log(res);
          $scope.state = res.isOn;
          $scope.error = null;

        }, function(err)
        {
          $scope.error = "Error en la comuniación: " + err;
        });
    };

    $scope.init = function()
    {
      Device.all({class: "mx.makerlab.ledservice"}, function(devices)
        {
          // get only the first ledservice device if any.
          if(devices.length > 0) $scope.device = devices[0];
          else return $scope.error = "No se encontró ningún apagador";

          $scope.updateState();
          // update state each second:
          setInterval(function(){ $scope.updateState(); }, 1000);

        });
    };

  }]);

})();

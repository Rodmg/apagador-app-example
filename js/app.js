(function(){

  // Set your API server's url
  // use null for automatically setting same origin
  var server = "https://makerlab.dtdns.net:443/";

  var app = angular.module('aquila',
    [
      'sessionController','mainController','apagadorController',
      'deviceFactory','tokenFactory','interactionFactory','configFactory','socketWSerialFactory','socketAquilaFactory',
      'ngRoute','btford.socket-io'
    ]
  );

  app.config(['$routeProvider', '$httpProvider', '$sceDelegateProvider', function($routeProvider, $httpProvider, $sceDelegateProvider) {

      $sceDelegateProvider.resourceUrlWhitelist([
          // Allow same origin resource loads.
          'self',
          // Allow loading from our server.
          server + '**'
        ]);

      $httpProvider.defaults.headers.common['Content-Type'] = 'application/json; charset=utf-8';
      $httpProvider.defaults.headers.post['Content-Type'] = 'application/json; charset=utf-8';
      $httpProvider.interceptors.push('authInterceptor');

      $routeProvider.
        when('/', {
          templateUrl: 'views/apagador/apagador.html',
          controller: 'ApagadorController'
        }).
        when('/login', {
          templateUrl: 'views/session/login.html',
          controller: 'SessionController'
        }).
        otherwise({
          redirectTo: '/404error'
        });

    }
  ]);

  app.factory('authInterceptor', function ($rootScope, $q, $window, $location) {
    return {
      request: function (config) {
        config.headers = config.headers || {};
        if ($window.localStorage.token) {
          config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
        }
        return config;
      },
      responseError: function (rejection) {
        if (rejection.status === 401) {
          // handle the case where the user is not authenticated
          delete $window.localStorage.token;
          $location.path('/login');
        }
        return $q.reject(rejection);
      }
    };
  });


  app.run( function($rootScope, $location, $window) {
    // Setting server URL global variable
    $rootScope.server = server ? server : $window.location.origin;
    if( $rootScope.server.substr($rootScope.server.length - 1) !== "/" ) $rootScope.server += "/";

    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
      if($window.localStorage.token === undefined){
        $location.path('/login');
        $rootScope.userLogin = false;
      }else{
        $rootScope.userLogin = true;
        $rootScope.user = $window.localStorage.user;
        $rootScope.user = $rootScope.user.charAt(0).toUpperCase() + $rootScope.user.slice(1);
      }
    });
  });




})();

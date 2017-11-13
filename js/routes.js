(function(){
	var app = angular.module('cinema-room');

	app.config( function( $routeProvider, $locationProvider ) {
	    $routeProvider.when( '/', {
	      controller: 'MovieSelectorController as movieCtl',
	      templateUrl: 'partials/movie-selector.html'
	    } );

	    $routeProvider.when( '/funcion/:fid', {
	      controller: 'EnquiryController as enqCtl',
	      templateUrl: 'partials/ticket-picker.html',
	      resolve: {
	        'tarifas': function( TarifaService, $route) {
	          	return TarifaService.getByFID($route.current.params.fid);
	        },
	        'funcion': function( CarteleraService, $route){
	        	return CarteleraService.getByFID($route.current.params.fid);
	        }
	      }
	    } );

	    $routeProvider.when( '/mapa/:fid', {
	      controller: 'MapController as mapCtl',
	      templateUrl: 'partials/map-show.html',
	      resolve: {
	        'funcion': function( CarteleraService, $route){
	        	return CarteleraService.getByFID($route.current.params.fid);
	        }
	      }
	    } );

	    $routeProvider.when( '/venta/:hash', {
	      controller: 'VentaController as ventaCtl',
	      templateUrl: 'partials/checkout.html'
	    } );

	    $routeProvider.when( '/compra-exitosa', {
	      controller: 'GoodByeController as byeCtl',
	      templateUrl: 'partials/good-bye.html'
	    } );

	    $routeProvider.otherwise( '/' );
	  } );
})();
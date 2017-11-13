(function(){
	var app = angular.module('cinema-room');

	app.filter('horaNumerica', function(){
		return function(text) {
	      return [text.substr(0, 2), text.substr(2, 2)].join(':');
	    };
	})
	app.filter('startFrom', function() {
	    return function(input, start) {
	        start = +start; //parse to int
	        return input && input.slice(start);
	    }
	});

	app.filter('invertirFecha', function () {
		return function (input) {
			return input.split('-').reverse().join('/')
		}
	});

	app.filter('range', function() {
	    return function(input, start) {
	        return new Array(start);
	    }
	});
})();
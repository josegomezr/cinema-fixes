(function(){

	var app = angular.module('cinema-room');

	var apiKey = 'rjnnH~tc1UAiSKf3Fe7x=Vyf4y=0Senb09dy=IDTFPw-Dvqrp76%WDPJcSPW';

	// Serivicio para obtener los datos de la funcion/sala (el json principal).
	function SalaService ($q, $http, $httpParamSerializer) {
		return {
			checkTaken: function(fid){
				var defer = $q.defer();
				$http.get('http://148.102.26.60/listar/ocupados/'+ fid, {
					headers: {
						'Authorization': apiKey
					}
				}).success(function (response) {
					defer.resolve(response);
				});
				return defer.promise;
			},
			reserveSeats: function(hash, asientos){
				var defer = $q.defer();
				var datos = {};
				for ( var i in asientos ){
					datos['asientos['+i+']'] = asientos[i];
				}
				datos['hash'] = hash;

				var req = {
				 method: 'POST',
				 url: 'http://148.102.26.60/asientos',
				 headers: {
				   'Content-Type': 'application/x-www-form-urlencoded',
				   'Authorization': apiKey
				 },
				 data: $httpParamSerializer(datos)
				};
				$http(req).success(function (response) {
					defer.resolve(response);
				}).error(function(data){
					defer.reject(data);
				});
				return defer.promise;
			},
			reserve: function(fid, tarifas){
				var defer = $q.defer();
				var datos = {};
				var asientos = 0;
				for ( var i in tarifas ){
					if(tarifas[i] == 0)
						continue;
					datos['tarifa['+i+']'] = tarifas[i];
					asientos += tarifas[i];
				}

				datos.asientos = asientos;
				datos.funcion_id = fid;
				var req = {
				 method: 'POST',
				 url: 'http://148.102.26.60/reservas',
				 headers: {
				   'Content-Type': 'application/x-www-form-urlencoded',
				   'Authorization': apiKey
				 },
				 data: $httpParamSerializer(datos)
				};
				$http(req).success(function (response) {
					defer.resolve(response);
				}).error(function(data){
					defer.reject(data);
				});
				return defer.promise;
			}
		}
	}
	app.service('SalaService', ['$q', '$http', '$httpParamSerializer', SalaService]);
	
	function CheckoutService ($q, $http, $httpParamSerializer) {
		return {
			perform: function(hash){
				var defer = $q.defer();
				var datos = {
					hash: hash
				};
				var req = {
				 method: 'POST',
				 url: 'http://148.102.26.60/ventas',
				 headers: {
				   'Content-Type': 'application/x-www-form-urlencoded',
				   'Authorization': apiKey
				 },
				 data: $httpParamSerializer(datos)
				};
				
				$http(req).success(function (response) {
					defer.resolve(response);
				}).error(function(data){
					defer.reject(data);
				});
				return defer.promise;
			},
			undo: function(hash){
				var defer = $q.defer();
				var datos = {
					hash: hash
				};
				var req = {
				 method: 'DELETE',
				 url: 'http://148.102.26.60/reserva/cancelar/' + hash,
				 headers: {
				   'Content-Type': 'application/x-www-form-urlencoded',
				   'Authorization': apiKey
				 }
				};
				
				$http(req).success(function (response) {
					defer.resolve(response);
				}).error(function(data){
					defer.reject(data);
				});
				return defer.promise;
			},
			rollback: function(hash){
				var defer = $q.defer();
				var datos = {
					hash: hash
				};
				var req = {
				 method: 'DELETE',
				 url: 'http://148.102.26.60/devoluciones/' + hash,
				 headers: {
				   'Content-Type': 'application/x-www-form-urlencoded',
				   'Authorization': apiKey
				 }
				};
				
				$http(req).success(function (response) {
					defer.resolve(response);
				}).error(function(data){
					defer.reject(data);
				});
				return defer.promise;
				
			}
		}
	}

	app.service('CheckoutService', ['$q', '$http', '$httpParamSerializer', CheckoutService]);

	// Serivicio para obtener los datos de la funcion/sala (el json principal).
	function TarifaService ($q, $http, $httpParamSerializer) {
		return {
			getByFID: function(fid){
				var defer = $q.defer();
				var req = {
				 method: 'POST',
				 url: 'http://148.102.26.60/tarifa',
				 headers: {
				   'Content-Type': 'application/x-www-form-urlencoded',
				   'Authorization': apiKey
				 },
				 data: $httpParamSerializer({
							'funcion_id': fid
					})
				};
				$http(req).success(function (response) {
					defer.resolve(response);
				}).error(function (reason) {
					defer.reject(reason)
				});
				return defer.promise;
			}
		}
	}
	app.service('TarifaService', ['$q', '$http', '$httpParamSerializer', TarifaService]);

	// Serivicio para obtener los datos de la funcion/sala (el json principal).
	function CarteleraService ($q, $http) {
		return {
			getAll: function(){
				var defer = $q.defer();
				$http.get('http://148.102.26.60/cartelera', {
					headers: {
						'Authorization': apiKey
					}
				}).success(function (response) {
					var data = []
					var now = new Date()
					for (var i in response) {
						var row = response[i];
						var time = row.hora.substr(0, 2) + ':' + row.hora.substr(2, 2)
						var d = new Date(row.fecha+' '+time);
						var ts = d.getTime()
						if(row.asientos_disponibles > 0 && d.getTime() > now.getTime() && d.getDay() == now.getDay()){
							data.push(row);
						}
					};
					// defer.resolve(data);
					defer.resolve(response);
				}).error(function (reason) {
					defer.reject(reason)
				});
				return defer.promise;
			},
			getByFID: function(fid){
				// @todo integrar a rest.
				var defer = $q.defer();
				$http.get('http://148.102.26.60/sala/' + fid, {
					headers: {
						'Authorization': apiKey
					}
				})
				.success(function (response) {
					defer.resolve(response);
				})
				.error(function (reason) {
					defer.reject(reason)
				})
				return defer.promise;
			}
		}
	}
	app.service('CarteleraService', ['$q', '$http', CarteleraService]);
})();
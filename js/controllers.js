(function(){
    var app = angular.module('cinema-room');

    function MovieSelectorController(CarteleraService, $location, $timeout, $rootScope){
        var self = this;
        this.pelicula_valida = false;
        this.funcion_combo = '';
        this.funcion_seleccionada = {};
        this.paginacion_inicio = 0;
        this.paginacion_actual = 0;
        this.paginacion_por_pagina = 8;
        this.cartelera = [];

        (function tick() {
            CarteleraService.getAll().then(function(data){
                self.cartelera = data;
                $timeout(tick, 60*1000);
            }, function(reason){
                console.log("[error] cartelera:get-all",reason);
                alert("[error] cartelera:get-all")
            });
        })();

        this.seleccionarFuncion = function(funcion_id){
            $rootScope.funcion_seleccionada = _.findWhere(this.cartelera, {
                'funcion_id': funcion_id
            });
            $location.path('/' + funcion_id);
        }

        this.numeroPaginas = function(){
            return Math.ceil(this.cartelera.length/this.paginacion_por_pagina);
        }

        this.paginaAnterior = function(){
            if(this.paginacion_actual != 0)
                this.paginacion_actual = this.paginacion_actual-1;
        }

        this.pagina = function(n){
            this.paginacion_actual = n;
        }

        this.paginaSiguiente = function(){
            if(this.paginacion_actual < this.numeroPaginas()-1)
                this.paginacion_actual = this.paginacion_actual+1;

        }
    }

    app.controller('MovieSelectorController', ['CarteleraService', '$location', '$timeout', '$rootScope', MovieSelectorController]);

    function EnquiryController (tarifas, funcion, SalaService, $rootScope, $location) {
        var self = this;
        $rootScope.resumen = {}
        this.tarifas = tarifas;
        this.funcion = funcion;
        this.boletos = {};
        for (var i in tarifas) {
            this.boletos[tarifas[i].codigo] = 0;
        };
        this.total_boletos = 0;
        this.total_pagar = 0;
        this.hash_reserva = null;
        this.seleccionandoTickets = true;
        
        this.agregar_boleto = function (id) {
            this.boletos[id]++;
            this.total_boletos++;
            this.calcular_total_pagar();
        }

        this.calcular_total_pagar = function () {
            this.seleccionandoTickets = true;
            this.total_pagar = 0;
            for (var i in this.tarifas) {
                var tarifa = this.tarifas[i];
                var id = tarifa.codigo;
                var precio = tarifa.precio;
                this.total_pagar += this.boletos[id] * precio;
            };
            $rootScope.$broadcast('refrescarAsientos', this.total_boletos);
        }

        this.quitar_boleto = function (id) {
            if(this.boletos[id] > 0){
                this.boletos[id]--;
                this.total_boletos--;
                this.calcular_total_pagar();
            }
        }

        this._llenar_resumen = function(){
            $rootScope.resumen.funcion = this.funcion;
            $rootScope.resumen.boletos = this.boletos;
            $rootScope.resumen.tarifas = this.tarifas;
        }

        this.reservar = function(){
            if(this.total_boletos == 0)
                return;
            if(this.funcion.numerado != 'P'){
                SalaService.reserve(this.funcion.funcion_id, this.boletos)
                .then(function(data){
                    console.log(data);
                    self._llenar_resumen();
                    $rootScope.resumen.reserva = data;
                    $rootScope.resumen.reserva.hash_reserva = data.hash;
                    self.hash_reserva = data.hash;
                    $location.path('/venta/' + data.hash);
                }, function(reason){
                    console.log("[error] sala:reserve",reason);
                    alert("[error] sala:reserve")
                });
            }else{
                this.seleccionandoTickets = false;
            }
        }

        this.reservar_asientos = function(asientos){
            SalaService
            .reserveSeats(this.hash_reserva, asientos)
            .then(
                function(seats){
                    self._llenar_resumen();
                    $rootScope.resumen.asientos = seats;
                    console.log(seats);
                    $location.path('/venta/' + self.hash_reserva)
                }, 
                function(reason){
                    console.log("[error] sala:reserve-seats", reason);
                    alert("[error] sala:reserve-seats")
                }
            );
        }
    }
    app.controller('EnquiryController', ['tarifas', 'funcion', 'SalaService', '$rootScope', '$location', EnquiryController]);
    
    function MapController(funcion, $rootScope, $location, SalaService) {
        this.preview = true;
        this.funcion = funcion;
        this.reservar_con_asiento = function (asientos) {
            console.log('maspdasd')
        }
        this.reservar_con_asiento = function (asientos) {
            console.log("hiard!");
            if (this.hash_reserva == null) {
                console.log("making reserva!");
                SalaService
                    .reserve(this.funcion.funcion_id, this.boletos)
                    .then(
                    function (data) {
                        $rootScope.resumen.reserva = data;
                        self.hash_reserva = data.hash_reserva;
                        self.reservar_asientos(asientos);
                    },
                    function (reason) {
                        console.log("[error] sala:reserve", reason);
                        alert("[error] sala:reserve")
                    }
                    );
            } else {
                self.reservar_asientos(asientos);
            }
        }
    }
    app.controller('MapController', ['funcion', '$rootScope', '$location', 'SalaService', MapController]);



    // Controlador de la cuadricula
    // :param: SalaService Service Instancia del servicio SalaService
    //                          que obtiene los datos necesarios 
    //                          para representar la función.
    //
    function GridController ($scope, $rootScope, $timeout, SalaService) {
        // self --> this es un pequeño hack para editar el controller desde 
        //               cualquier funcion ayudante.

        var self = this;
        // filas y columnas
        // en filas se guarda solo el numero (1,2,3,4,5)
        this.filas = [];
        // en columnas se guarda la letra (A, B, ..., Z), en caso que sea pasillo se escribe un '-'
        this.columnas = [];
        // aqui guardamos los asientos predeterminados ('N'->no_disponible, 'S'->no_usado, 'P' -> pasillo)
        this.asientos_predeterminados = {}

        // aqui guardamos los asientos que reservará el cliente
        this.asientos_reservados = []
        this.parentCtl = $scope.$parent.enqCtl || $scope.$parent.mapCtl;
        if(!this.parentCtl)
            throw new Error('bad-parent')
        this.raw_data = this.parentCtl.funcion;
        this.total_boletos = this.parentCtl.total_boletos;

        // .then es porque SalaService devuelve una promesa, 
        // .then significa, LUEGO de que la promesa se cumpla, ejecuta X.
        
        // Ayudante para preparar los datos del controlador
        // :param: data los datos recibidos del Servicio

        function prepararDatos(data) {
            // primero guardamos una copia en el controlador para uso futuro.
            self.raw_data = data;
            var n_pasillos = 0;
            if(data.pasillo1){
                n_pasillos++;
            }
            if(data.pasillo2){
                n_pasillos++;
            }
            if(data.pasillo3){
                n_pasillos++;
            }
            if(data.pasillo4){
                n_pasillos++;
            }
            
            data.columnas_sala += n_pasillos;

            // Aqui populamos las filas
            for (var j = data.columnas_sala; j > 0; j--) {
                self.filas.push(j);
            };
            
            // Aqui populamos las columnas, 
            // Letras para columnas validas, Guión (-) para pasillo.
            
            
            for (var i = data.filas_sala; i > 0; i--) {
                self.columnas.push({
                    name: String.fromCharCode(64+i)
                });
            };

            // Ahora interpretamos el mapa para armar
            interpretarMapa(data.mapa)
        }

        
        this.buscar_cell = function(map, row, col){
            var cell = (row+'')+(col+'');
            var result = _.filter(map, function(obj){
                return obj.coord == cell
            })
            
            if (result.length == 0 ){
                //throw new Error("Cell not found")
                return {nombre_real: 'X'};
                
            }
            
            return result.pop();
        }
        
        this.mapa = [];
        this.hash_mapa = {};
        
        this.maxAsientos = 0;
        this.asientosTomados = 0;
       
        function buscarCelda(row, col, key) {
            key = key || 'nombre_mostrar';
            var coord = row + col;
            var fila = row.charCodeAt(0) - 65
            return _.filter(self.mapa[fila], function (obj) {
                return obj[key] == coord
            })[0]
        }
        function buscarCeldaRecursive(row, col, key) {
            key = key || 'nombre_mostrar';
            var coord = row + col;

            for (var i in self.mapa){
                var filaArr = self.mapa[i];
                for(var j in filaArr){
                    var cellObj = filaArr[j];
                    if (cellObj[key] == coord) {
                        return cellObj;
                    }
                }
            }
            return null;
        }
        
        function getReverseCell(row, col) {
            var top = self.columnas.length - 1 - (row.charCodeAt(0) - 65);
            var left = self.filas.length - col

            return _.get(self.mapa, [top, left].join('.'));
        }
        
        // Estas funciones nos sirven para cambiar la clase de cada
        // asiento facilmente
        // primero un helper para saber si un asiento está reservado (status en el mapa -> N, S o P)
        this.esta_reservado = function (row, col) {
            return this.asientos_predeterminados.hasOwnProperty(row+col);
        }
        
        this.esta_no_disponible = function (row, col) {
            return this.esta_reservado(row, col) && this.asientos_predeterminados[row+col] == 'N';
        }
        this.raw_data_ocupado = function (row, col) {
            var cellObj = getReverseCell(row, col);
            return this.raw_data.asientos_ocupados.indexOf(cellObj.nombre_mostrar) !== -1;
        }
        this.esta_ocupado = function (coord) {
            return this.raw_data.asientos_ocupados.indexOf(coord) !== -1;
        }

        this.esta_pasillo = function (row, col) {
            return this.esta_reservado(row, col) && this.asientos_predeterminados[row+col] == 'P';
        }
        this.esta_no_usado = function (row, col) {
            return this.esta_reservado(row, col) && this.asientos_predeterminados[row+col] == 'S';
        }

        this.esta_tomado = function (row, col) {
            return this.asientos_reservados.indexOf([row, col].join('')) !== -1;
        }

        this.es_4x = function (coordVisible) {
            return _.get(this.raw_data, 'asientos_4x', []).indexOf(coordVisible) !== -1;
        }
        
        this.es_vip = function (coordVisible) {
            return _.get(this.raw_data, 'asientos_vip', []).indexOf(coordVisible) !== -1;
        }

        
        this.marcar_tomado = function(row, col){
            var cell = getReverseCell(row, col)
            cell.tomado = true;
        }

        this.marcar_libre = function(row, col){
            var cell = getReverseCell(row, col)
            cell.tomado = false;
        }

        this.marcar_ocupado = function(row, col){
            var cell = getReverseCell(row, col)
            cell.no_disponible = cell.ocupado = cell.pasillo = cell.no_usado = cell.tomado = false;
            cell.reservado = true;
              cell.ocupado = true;
        }

        this.esta_tomado_visible = function(row, col){
            var cellObj = buscarCeldaRecursive(row, col);
            return cellObj.tomado;
        }
        this.marcar_ocupado_visible = function(row, col){
            var cellObj = buscarCeldaRecursive(row, col);
            cellObj.no_disponible = cellObj.ocupado = cellObj.pasillo = cellObj.no_usado = cellObj.tomado = false;
            cellObj.reservado = true;
            cellObj.ocupado = true;
        }

        this.conmutarAsiento = function (row, col) {
            if(
                this.esta_reservado(row, col) 
                && this.raw_data_ocupado(row, col) 
                ){
                console.log(row, col, '-- status---', 'reservado?', this.esta_reservado(row, col), 'ocupado?', this.raw_data_ocupado(row, col) )

                return
            }

            var coord = [row, col].join('');

            if( this.esta_tomado(row,col) ) {
                var idx = this.asientos_reservados.indexOf(coord);
                this.asientos_reservados.splice(idx, 1);
                this.marcar_libre(row, col);
                this.asientosTomados--;
            }else{
                this.asientosTomados++;
                this.marcar_tomado(row, col);
                this.asientos_reservados.push(coord);
            }
            
            // if(this.asientosTomados > this.maxAsientos){
            //     var oldCoord = this.asientos_reservados.shift().split('-');
            //     this.marcar_libre(oldCoord[0], oldCoord[1]);
            //     this.asientosTomados--;
            // }
            
            $rootScope.$broadcast('asiento_cambiado', this.asientos_reservados);
            refrescarAsientosUsados();
        }

        function refrescarAsientosUsados(){
            var fid = self.raw_data.funcion_id;
            SalaService.checkTaken(fid).then(function(data){
                // vienen en formato "a1,b2,c3"
                if(data.asientos_ocupados == 0)
                    return;

                _.each(data.asientos_ocupados.split(','), function(e, k){
                    var col = e[0];
                    var row = e.substr(1);
                    var coord = [col, row].join('');
                    if (self.esta_tomado_visible(col, row)){
                        var idx = self.asientos_reservados.indexOf(coord);
                        self.asientos_reservados.splice(idx, 1);
                        self.asientosTomados--;
                    }
                    self.marcar_ocupado_visible(col, row);
                });

            }, function(reason){
                console.log("[error] sala:check-taken", reason);
                // este alert aparecerá muy frecuentemente
                // alert("[error] sala:check-taken")
            });
        }

        $rootScope.$on('refrescarAsientos', function (event, max) {
            self.maxAsientos = max;
            self.asientosTomados = 0;
            while(self.asientos_reservados.length){
                var coord = self.asientos_reservados.pop();
                var oldCoord = [coord[0], coord.substring(1)];
                self.marcar_libre(oldCoord[0], oldCoord[1]);
            }
        })
        
        
        // esto convierte los indices A10 en ["A", 10]
        // para popular el arreglo de asientos reservados

        function convertirIdx (idx) {
            var row = idx[0]
            var col = idx.substring(1);
            return [row, parseFloat(col)]
        }
        // esta función toma el mapa cuya estructura es 
        /*
        [
            {
                '<coord1>': '<status1>'
            },
            {
                '<coord2>': '<status2>'
            },
            // ...
            {
                '<coordN>': '<statusN>'
            },
        ]
        */
        // y popular un object mas facil de manejar de la forma
        /*
        {
            '<coord1>' : '<status1>',
            '<coord2>' : '<status2>',
            // ... 
            '<coordM>' : '<statusN>',
        }
        */
        function interpretarMapa (mapa) {

            var newMap = _.map(mapa, function(obj){
                var nombre = obj.nombre_real;
                var coord = _.keys(obj)[0];
                var status = obj[coord];
                delete obj.nombre_real
                return {
                    status: status,
                    coord: coord,
                    nombre_real: nombre
                }
            });
            
            _.forEach(newMap, function (obj) {
                self.asientos_predeterminados[obj.coord] = obj.status;
            })

            for ( var j in self.columnas ){
                var row = [];
                var colObj = self.columnas[j];

                for ( var i in self.filas ){
                    var filaObj = self.filas[i];
                    var cell = {
                        col: colObj.name,
                        row: filaObj,
                        coord: colObj.name+filaObj
                    };

                    var cellData = self.buscar_cell(newMap, cell.col, cell.row);
                    
                    cell.reservado = self.esta_reservado(cell.col, cell.row);
                    cell.no_disponible = self.esta_no_disponible(cell.col, cell.row);
                    cell.ocupado = self.esta_ocupado(cellData.nombre_real);
                    cell.pasillo = self.esta_pasillo(cell.col, cell.row);
                    cell.no_usado = self.esta_no_usado(cell.col, cell.row);
                    cell.tomado = self.esta_tomado(cell.col, cell.row);
                    cell.nombre_mostrar = cellData.nombre_real;
                    cell.es_4x = self.es_4x(cellData.nombre_real)
                    cell.es_vip = self.es_vip(cellData.nombre_real)
                    row.push(cell);
                    self.hash_mapa[cell.coord] = cell;
                }
                self.mapa.push(row);
            }

        }
        console.log(self.hash_mapa)
        prepararDatos(this.raw_data);
        refrescarAsientosUsados();
    }

    app.controller('GridController', ['$scope', '$rootScope', '$timeout', 'SalaService', GridController])

    function VentaController($rootScope, $location, CheckoutService){
        this.resumen = $rootScope.resumen;
        console.log($rootScope)
        this.calcular_total_pagar = function(){
            var total = 0;
            for (var i in this.resumen.tarifas) {
                var tarifa = this.resumen.tarifas[i];
                var id = tarifa.codigo;
                var precio = tarifa.precio;
                total += this.resumen.boletos[id] * precio;
            };
            return total;
        }

        this.cancelar_reserva = function(){
            if(confirm("Esta seguro?")){
                CheckoutService.undo(this.resumen.reserva.hash_reserva).then(function (data) {
                    console.log(data);
                    alert("devuelto!");
                    $rootScope.resumen = {};
                    $location.path('/');
                },
                function(reason){
                    console.log("[error] checkout:undo", reason);
                    alert("[error] checkout:undo")
                });
            }
        }

        this.realizar_venta = function(){
            CheckoutService.perform(this.resumen.reserva.hash_reserva).then(function (data) {
                console.log(data);
                $rootScope.resumen.compra = data;
                $location.path('/compra-exitosa');
            },
            function(reason){
                console.log("[error] checkout:perform", reason);
                alert("[error] checkout:perform")
            });
        }
    }
    app.controller('VentaController', ['$rootScope', '$location', 'CheckoutService', VentaController])

    function GoodByeController($rootScope, $location, CheckoutService){
        this.resumen = $rootScope.resumen;
        
        this.cancelar_ticket = function(){
            if(confirm("Esta seguro?")){
                CheckoutService.rollback(this.resumen.reserva.hash_reserva).then(function (data) {
                    console.log(data);
                    alert("Cancelado!!");
                    $rootScope.resumen = {};
                    $location.path('/');
                },
                function(reason){
                    console.log("[error] checkout:rollback", reason);
                    alert("[error] checkout:rollback")
                });
            }
        }
    }

    app.controller('GoodByeController', ['$rootScope', '$location', 'CheckoutService', GoodByeController])
})();
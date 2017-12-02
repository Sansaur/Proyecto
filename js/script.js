/*
 * 
 * <div>Icons made by <a href="https://www.flaticon.com/authors/dave-gandy" title="Dave Gandy">Dave Gandy</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
 */
// Cargamos el JS así
window.onload = cargarPag;
var actual_JSON;
var movilidadesGM = new Array();
var movilidadesGS = new Array();
var movilidadesPR = new Array();

// EL MAPA DE GOOGLE
// Global para poner los markers
var map;

// Para cerrar las ventanas de información cuando se hace click en otra
var globalInfoWindow;

// UNA VARIABLE GLOBAL
// En la que se almacenan TODOS los marcadores que hay en el mapa
var markersEnMapa = new Array();

// Ver como mejorar esto
var booleanoColapsado = true;

/**
 * 
 * Funciones de carga
 * 
 */
function cargarPag() {
    document.getElementsByTagName("html")[0].setAttribute("lang", "es");

    cargarEventos();
    cargarJSON();
    alternarPosibilidades();
}

function cargarJSON() {
    loadJSON(function (response) {
        // Parse JSON string into object
        actual_JSON = JSON.parse(response);
        for (var i in actual_JSON) {
            switch (actual_JSON[i].tipo) {
                case "Grado Medio":
                    movilidadesGM.push(actual_JSON[i]);
                    break;
                case "Grado Superior":
                    movilidadesGS.push(actual_JSON[i]);
                    break;
                default:
                    movilidadesPR.push(actual_JSON[i]);
                    break;
            }
        }
    });
}

function cargarEventos() {
    document.getElementById("botonEnviar").addEventListener('click', function () {
        montarMapa();
    }, false);
    document.getElementById("clickCicloPais").addEventListener('click', alternarPosibilidades, false);
    document.getElementById("seleccionMovilidad").addEventListener('change', alternarPosibilidades, false);
    document.getElementById("botonColapsar").addEventListener('click', function(){
        if(booleanoColapsado){
            document.getElementById("Controles").setAttribute("style", "height:100vh");
            document.getElementById("Mapa").setAttribute("style", "display:none");
        } else {
            document.getElementById("Controles").setAttribute("style", "height:0vh");
            document.getElementById("Mapa").setAttribute("style", "position: relative; overflow: hidden;");
        }
        booleanoColapsado = !booleanoColapsado;
    }, false);
}

function alternarPosibilidades() {
    limpiarChildren(document.getElementById("zonaVariable"));
    // ON = PAISES
    // OFF = CICLOS
    if (document.getElementById("selectorCicloPais").checked) {
        cargarPaises();
    } else {
        cargarCiclos();
    }
}

function traducirCiudadPosicion(ciudad, pais) {
    var devolver;
    geocodificacion(function (response) {
        var nuestroJSON = JSON.parse(response);
        // Usar respuesta.lat y respuesta.lng ~~~~~
        devolver = nuestroJSON.results[0].geometry.location;
    }, ciudad, pais);
    return devolver;
}

function cargarPaises() {
    var listaPosibilidades = retornaListaSeleccioandos();
    var listaPaises = new Array();
    for (var i in listaPosibilidades) {
        if (!listaPaises.includes(listaPosibilidades[i].pais)) {
            listaPaises.push(listaPosibilidades[i].pais);
        }
    }
    var nuevoElemento = crearNodo("SELECT", null, ["id"], ["comboPaises"]);
    for (var i in listaPaises) {
        if (listaPaises[i]) {
            nuevoElemento.appendChild(crearNodo("OPTION", listaPaises[i], ["value"], [listaPaises[i]]));
            document.getElementById("zonaVariable").appendChild(nuevoElemento);
        }
    }
}

function cargarCiclos() {
    var listaPosibilidades = retornaListaSeleccioandos();
    var listaCiclos = new Array();
    for (var i in listaPosibilidades) {
        if (!listaCiclos.includes(listaPosibilidades[i].ciclo)) {
            listaCiclos.push(listaPosibilidades[i].ciclo);
        }
    }
    var nuevoElemento = crearNodo("P", null, null, null);
    var nuevoButton = crearNodo("BUTTON", "Selecciona todas si están todas vacías. Deselecciona todas si hay al menos una seleccionada", ["id"], ["seleccion"]);
    nuevoButton.addEventListener('click', function () {
        var listaCheckBoxCreados = document.querySelectorAll(".ciclo");
        var deseleccionar = false;
        for (var i = 0; i < listaCheckBoxCreados.length; i++) {
            if (listaCheckBoxCreados[i].checked) {
                deseleccionar = true;
                break;
            }
            listaCheckBoxCreados[i].click();
        }
        if (deseleccionar) {
            for (var i = 0; i < listaCheckBoxCreados.length; i++) {
                listaCheckBoxCreados[i].checked = false;
            }
        }
    }, false);
    nuevoElemento.appendChild(nuevoButton);
    var nuevoDiv = crearNodo("DIV", null, ["id"], ["contenedorCheckboxes"]);
    document.getElementById("zonaVariable").appendChild(nuevoElemento);
    for (var i in listaCiclos) {
        if (listaCiclos[i]) {
            nuevoElemento = crearNodo("LABEL", null, null, null);
            nuevoElemento.appendChild(crearNodo("INPUT", null, ["type", "class", "name", "value"], ["checkbox", "ciclo", "ciclo", listaCiclos[i]]));
            nuevoElemento.appendChild(document.createTextNode(listaCiclos[i]));
            nuevoDiv.appendChild(nuevoElemento);
        }
    }
    document.getElementById("zonaVariable").appendChild(nuevoDiv);
}

function retornaListaSeleccioandos() {
    var seleccionado = document.getElementById("seleccionMovilidad").value;
    var listaPosibilidades;
    switch (seleccionado) {
        case "Todos":
            listaPosibilidades = actual_JSON;
            break;
        case "profesores":
            listaPosibilidades = movilidadesPR;
            break;
        case "GM":
            listaPosibilidades = movilidadesGM;
            break;
        case "GS":
            listaPosibilidades = movilidadesGS;
            break;
    }
    return listaPosibilidades;
}
/*
 * 
 * LA FUNCIÓN PRINCIPAL DEL PROGRAMA
 * 
 * Paises:
 * Por cada pais de la lista de posibilidades, si es el que está en el combo
 * se añaden las latitudes y longitudes a un array.
 * 
 * Por cada latitud-longitud en un array, se crea un marcador en el mapa.
 * 
 */
function montarMapa() {

    var listaPosibilidades = retornaListaSeleccioandos();
    var arrayCiudades = new Array();
    var arrayLongitudLatitud = new Array();
    var arrayInformacion = new Array();

    // Limpiamos todos los markers que haya en el mapa ahora mismo.
    if (markersEnMapa) {
        for (var i in markersEnMapa) {
            markersEnMapa[i].setMap(null);
        }
    }
    if (document.getElementById("selectorCicloPais").checked) {

        // Rellenamos un array de latitud-longitud con la lista de posibilidades (El tipo de movimiento)
        // y el país seleccionado
        for (var i in listaPosibilidades) {
            if (listaPosibilidades[i].pais === document.getElementById("comboPaises").value) {
                if (!arrayLongitudLatitud.includes(traducirCiudadPosicion(listaPosibilidades[i].ciudad, listaPosibilidades[i].pais))) {
                    arrayLongitudLatitud.push(traducirCiudadPosicion(listaPosibilidades[i].ciudad, listaPosibilidades[i].pais));
                    arrayCiudades.push(listaPosibilidades[i].ciudad);
                    arrayInformacion.push({movilidad: listaPosibilidades[i].tipo, ciclo: listaPosibilidades[i].ciclo});
                }
            }
        }
        montarMarcadores(arrayLongitudLatitud, arrayCiudades, arrayInformacion, true);
    } else {
        // Rellenamos un array de latitud-longitud con la lista de posibilidades (El tipo de movimiento)
        // y el país seleccionado
        var listaCheckBox = document.querySelectorAll(".ciclo");
        var arrayCiclosSeleccionados = new Array();
        for (var i = 0; i < listaCheckBox.length; i++) {
            if (listaCheckBox[i].checked) {
                arrayCiclosSeleccionados.push(listaCheckBox[i].value);
            }
        }
        for (var i in listaPosibilidades) {
            if (arrayCiclosSeleccionados.includes(listaPosibilidades[i].ciclo)) {
                arrayLongitudLatitud.push(traducirCiudadPosicion(listaPosibilidades[i].ciudad, listaPosibilidades[i].pais));
                arrayCiudades.push(listaPosibilidades[i].ciudad);
                arrayInformacion.push({movilidad: listaPosibilidades[i].tipo, ciclo: listaPosibilidades[i].ciclo});
            }
        }
        montarMarcadores(arrayLongitudLatitud, arrayCiudades, arrayInformacion, false);
    }
}

function montarMarcadores(arrayLongitudLatitud, arrayCiudades, arrayInformacion, tenemosPaises) {
    var image = null;
    for (var j in arrayLongitudLatitud) {
        if (tenemosPaises) {
            var image = "img/" + document.getElementById("comboPaises").value.replace(" ", "-").normalize('NFD').replace(/[\u0300-\u036f]/g, "") + ".png";
        }
        //console.log(arrayLongitudLatitud[j]+"<- LONGLAT || Ciudad ->"+arrayCiudades[j]);
        var marker = new google.maps.Marker({
            position: arrayLongitudLatitud[j],
            title: arrayCiudades[j],
            draggable: false,
            animation: google.maps.Animation.DROP,
            icon: image
        });
        // NUEVO ATRIBUTO
        marker.informacion = arrayInformacion[j];
        marker.setMap(map);
        markersEnMapa.push(marker);
    }
    for (var i = 0; i < markersEnMapa.length; i++) {
        google.maps.event.addListener(markersEnMapa[i], 'click',
                function () {
                    if (globalInfoWindow) {
                        globalInfoWindow.close();
                    }
                    var contentString = "Este sitio es <strong>" + this.title + "</strong><br>" +
                            "En él se ha realizado un Erasmus del ciclo de <strong>" + this.informacion.ciclo + "</strong><br>" +
                            "Para los integrantes del grupo de <strong>" + this.informacion.movilidad + "</strong>";
                    var infowindow = new google.maps.InfoWindow({
                        content: contentString
                    });
                    infowindow.open(map, this);
                    globalInfoWindow = infowindow;
                    map.setZoom(8);
                    map.setCenter(this.getPosition());
                }
        );
    }
}
/* -------------------- F U N C I O N E S | H E L P E R --------------------- */

/***
 * funcion para crear NODOS
 * @param {string} tipo
 * @param {string} texto
 * @param {Array} atributos
 * @param {Array} valores
 * @returns {Element|crearNodo.nodoP}
 */

function crearNodo(tipo, texto, atributos, valores) {
    var nodoTexto;
    var nodoP = document.createElement(tipo);
    if (texto) {
        nodoTexto = document.createTextNode(texto);
        nodoP.appendChild(nodoTexto);
    }
    for (var i in atributos) {
        nodoP.setAttribute(atributos[i], valores[i]);
    }

    return nodoP;
}
function limpiarChildren(elemento) {
    while (elemento.firstChild) {
        elemento.removeChild(elemento.firstChild);
    }
}
function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'JSON/Erasmus.json', false);
    xobj.onreadystatechange = function () {
        if (xobj.readyState === 4 && xobj.status === 200) {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
/*
 * CARGA INICIAL DEL MAPA
 */
function cargaInicialMapaGoogle() {
    var nuevoZoom = 5;
    // Zoom del teléfono
    if(window.innerWidth <= 525){
        nuevoZoom = 3;
    }
    var respuesa = traducirCiudadPosicion("Graz", "Austria");
    var mapProp = {
        center: new google.maps.LatLng(respuesa.lat, respuesa.lng),
        zoom: nuevoZoom
    };
    map = new google.maps.Map(document.getElementById("Mapa"), mapProp);
}

function geocodificacion(callback, nombreCiudad, nombrePais) {
    var xobj = new XMLHttpRequest();
    nombreCiudad = nombreCiudad.replace(" ", "+");
    // PUESTO EN MODO SÍNCRONO
    // Para un futuro tiene que estar asíncrono
    xobj.open('GET', "https://maps.googleapis.com/maps/api/geocode/json?address=" + nombrePais + "," + nombreCiudad + "&key=AIzaSyCITn8nSbK_pJTA6IxMDLMuYb7A_dKoIsE", false);
    xobj.onreadystatechange = function () {
        if (xobj.readyState === 4 && xobj.status === 200) {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
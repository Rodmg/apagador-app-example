# Ejemplo: Usando Servicios y creando una interfáz gráfica para ellos.

En esta ocación veremos un ejemplo sencillo de cómo utilizar los servicios
para manejar el estado del LED rojo del Altair, y poder saber en cualquier momento cual es su estado
actual.

Además, se verá cómo los Servicios pueden coexistir con las Acciones y los Eventos.

Ésto se podría aplicar por ejemplo, a un Apagador de pared, que tenga servicios
para conocer y controlar el estado actual de las luces que controla, además de
acciones y eventos para interactuar con otros aparatos automáticamente.

## Prerequisitos

- Tener Aquila Server versión 0.1.3 o superior
- Tener node.js instalado
- Un buen editor de texto, recomiendo Sublime Text o Atom

## Instalando las herramientas necesarias

Desde una terminal, hacer:

``sudo npm install bower http-server -g``

## Programa del Altair

A continuación tenemos el código del Altair que expondrá el servicio "led":

```
#include <Wire.h>
#include <Mesh.h>
#include <AquilaProtocol.h>
#include <AquilaServices.h>
#include <JsonGenerator.h>
#include <JsonParser.h>

using namespace ArduinoJson;

#define LED 13
#define BUTTON 33

// Event definitions:
Event buttonPressed;

bool edoLED = false;

double previousPress = 0;
int pressTOut = 1000;

void setLED(bool state)
{
  if(state)
  {
    digitalWrite(LED,LOW);
    edoLED = true;
  }
  else
  {
    digitalWrite(LED,HIGH);
    edoLED = false;
  }
}

// Service definitions:

bool LEDService(uint16_t reqAddr, uint8_t method, char *data, uint8_t dataSize)
{
  if(method == GET)
  {
    Generator::JsonObject<1> json;
    json["isOn"] = edoLED;

    char buffer[16];
    json.printTo(buffer, sizeof(buffer));
    Services.response(reqAddr, R200, buffer, strlen(buffer));
  }
  else if(method == PUT)
  {
    if(dataSize > 0)
    {
      // Parsing request data:
      Parser::JsonParser<32> parser;
      Parser::JsonObject parsedJson = parser.parse(data);
      if(!parsedJson.success()) { Services.response(reqAddr, R500); return false; }

      // Updating state:
      if(parsedJson.containsKey("isOn"))
      {
        setLED( (bool)parsedJson["isOn"] );
      }

      // Returning new state:
      Generator::JsonObject<1> json;
      json["isOn"] = edoLED;

      char buffer[16];
      json.printTo(buffer, sizeof(buffer));
      Services.response(reqAddr, R200, buffer, strlen(buffer));
    }
    else
    {
      Services.response(reqAddr, R500);
    }
  }
  else
  {
    Services.response(reqAddr, R405);
  }
  return true;
}

// Action definitions:
bool LEDOn(uint8_t param, bool gotParam)
{
  setLED(true);
}

bool LEDOff(uint8_t param, bool gotParam)
{
  setLED(false);
}

bool LEDToggle(uint8_t param, bool gotParam)
{
  if (edoLED)
  {
    setLED(false);
  }
  else
  {
    setLED(true);
  }
}

void setup()
{
  pinMode(LED,OUTPUT);
  digitalWrite(LED,HIGH);

  pinMode(BUTTON, INPUT);  

  // Starting comminication hardware and libraries:
  Mesh.begin();
  Aquila.begin();
  Services.begin();

  // Initialize services:
  Services.add("led", LEDService);

  // Seting device identification:
  Aquila.setClass("mx.makerlab.ledservice");
  Aquila.setName("Altair Service");
  // Adding Actions:
  Aquila.addAction("Apagar LED", LEDOff);
  Aquila.addAction("Encender LED", LEDOn);
  Aquila.addAction("Cambiar estado LED",LEDToggle);
  // Adding events:
  // Weird symbols are UTF8 values for o with accent
  buttonPressed = Aquila.addEvent("Se presion\xC3\xB3 el Bot\xC3\xB3n");
  // Anouncing to the hub (for auto discovery in the aquila-server ui).
  Mesh.announce(HUB);
}

void loop()
{
  // Constantly listening for requests and tasks:
  Mesh.loop();
  Aquila.loop();
  Services.loop();

  double now = millis();
  if(digitalRead(BUTTON) == LOW && now > (previousPress + pressTOut) )
  {
    previousPress = now;
    Aquila.emit(buttonPressed);
  }

}
```

Como podemos ver en el código anterior, estamos manejando el LED del pin 13 con las acciones "Apagar LED", "Encender LED" y "Cambiar estado LED".
También, uamos el botón del pin 33 para emitir el evento "Se presionó el Botón".

El dispositivo se identificará con la clase "mx.makerlab.ledservice" y el nombre "Altair Service".

Además, se podrá controlar y conocer el estado del led por medio del servicio "led", que es lo que nos interesa en este caso.

El servicio "led" está definido en la función ``LEDService``, la cual se ejecuta automáticamente
al recibir una petición de servicio. ésta recibe la dirección del solicitante del servicio, el método (GET, PUT, POST o DELETE),
los datos (generalmente una cadena JSON), y la longitud de los datos.

Dentro de esta función lo primero que hacemos es revisar cuál es el método que nos está solicitando, para hacer las tareas correspondientes
para cada uno, o en su defecto, responder que no soportamos dicho método ("R405") o que hubo un error ("R500").

En este caso, queremos soportar el método "GET", al cual responderemos con un JSON que incluye el estado del LED.
Al final, el JSON generado será algo así:
```
{
  "isOn": true
}
```

También soportaremos el método "PUT", el cual modificará el estado del LED según una cadena JSON similar a la anterior,
pero que fué enviada por el solicitante.

Podemos ver en el código que utilizamos la biblioteca "ArduinoJson", puedes obtener mas detalles de cómo utilizarla [aquí](https://github.com/bblanchon/ArduinoJson/wiki).

# Programa de la interfaz web

Ahora, para poder controlar esto por medio de la API crearemos una sencilla interfáz gráfica, que contará con
un botón tipo "toggle" que nos mostrará el estado actual del led, y nos permitirá cambiarlo.

Para ello estaremos utilizando varias herramientas utilizadas comúnmente en el desarrollo web, te recomiendo
investigar más de cada una de estas herramientas para poder comprender mejor lo que está pasando en el programa:

- Angular.js: Éste es un famework para crear aplicaciones web, básicamente consiste código en javascript y algunas
extensiones a HTML que facilitan la creación de controles gráficos y su comportamiento.

- Bootstrap: Framework css (el lenguaje usado para dar "estilo" o diseño gráfico a las páginas web), que otorga estilos
preestablecidos para las diferentes partes visuales de la interfaz, como botones, barras, menús, texto, etc.

- Font Awesome: Es un conjunto de íconos sencillos pero de muy buena presentación, el ícono que estaremos utilizando para el botón "toggle" viene de aquí.

Además estaremos utilizando, aunque indirectamente, la API tipo REST del Servidor Aquila. Ésto lo haremos a través de unos
"Factories" ya hechos, éstos son herramientas de Angular para facilitar el acceso a datos del servidor. Te recomendamos
documentarte sobre este tipo de API's para entender mejor.

Puedes descargar el código ya listo de aqui: ....

Verás que son bastantes archivos de código, sin embargo sólo nos interesarán los archivos js/controllers/apagadorController.js y views/led/apagador.html,
ya que todo lo demás no es mas que el marco y las "Factories" que facilitan la programación.

Para correr el ejemplo, primero tenemos que tener corriendo nuestro servidor Aquila, y editar el archivo js/app.js y cambiar la linea ``var server = "..."``
con la URL correcta de tu Servidor. Por ejemplo, si la IP de tu servidor es 192.168.1.45, y tu servidor está corriendo en el puerto 8080,
la url será: http://192.168.1.45:8080/. **Nota:** Es importante poner siempre el puerto, aún cuando estemos usando los puertos por default (80 en http, 443 en https).

Luego tenemos que abrir una terminal e ir a la carpeta de el ejemplo antes descargado, anteriormente instalamos un servidor ligero llamado ``http-server``,
lo utilizaremos para correr nuestra aplicación de la siguiente forma:

``http-server -p 7000``

Ahora puedes acceder a la app desde tu navegador con ``http://localhost:7000``

Ya que viste que hace la app, empezaremos a ver cómo funciona internamente.

Cuando ésta carga, lo primero que hace es buscar todos los dispositivos con la clase "mx.makerlab.ledservice", y selecciona el primero.
Luego obtiene su estado actual y despliega el botón de toggle según este estado. Al presionar este botón, nosotros hacemos una petición
tipo "PUT", solicitándole que cambie el led al estado contrario al actual.

Además, se hacen peticiones cada segundo para obtener el estado del led, para que en caso de que éste se modifique de algún otro modo,
lo podamos ver en la interfaz.

## Entendiendo la interfaz

Angular utiliza la metodología "Modelo-Vista-Controlador", en muy pocas palabras esto se refiere a que vamos a dividir nuestro código
en tres diferentes unidades lógicas para facilitar su desarrollo.

El modelo es la representación del estado del objeto que estamos manejando, en este caso será la API REST por medio de los Factories preestablecidos.

La vista es la interfaz gráfica en sí, en este caso es un archivo html que describe la parte visual de la aplicación.

El Controlador es el que se encarga de manejar y modificar la vista según el modelo. En este caso será un código en Javascript con Angular.

Hechemos un vistazo al controlador:


### apagadorController.js

```
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
```

Éste es un módulo angular que recibe los diversos "Factories" como dependencias, entre las que se encuentran las de "Device" y "Service".

Tenemos una función ``init``, la cual se ejecuta cuando se inicializa el controlador y lo que hace es obtener del servidor los dispositivos,
filtrándolos por la clase "mx.makerlab.ledservice", y seleccionando el primero de la lista. Éste se guarda en la variable ``device``. Ya que se
obtiene el dispositivo, se procede a obtener el estado actual del led, con ayuda del Factory ``Service`` y su método "get", que recibe como parámetros
el id del dispositivo y el nombre del servicio a solicitar. además recibe como parámetro dos funciones, la primera es la que se ejecutará al recibir una
respuesta correctamente, y la segunda sólo si hay algún error.

También tenemos la función ``toggle``, que se encargará de solicitar el servicio ``put``, pasándole como segundo parámetro el JSON con el estado que se desea.

De igual forma podemos ver que siempre guardamos el estado en la variable ``state``, ya que esto nos permitirá mostrarlo de forma mas fácil en la interfaz.

### apagador.html

Ahora veamos el código de la vista:

```
<div class="container" ng-controller="ApagadorController" ng-init="init()">

  <div class="row">
    <div class="col-md-6">

      <h1>Apagador</h1>

      <div class="alert alert-danger" ng-show="error">{{error}}</div>

      <p>Activo: {{device.active}}</p>
      <p>Estado: {{state}}</p>

      <a href ng-click="toggle()"><i class="fa fa-4x" ng-class="{'fa-toggle-on': state == true, 'fa-toggle-off': state == false}"></i></a>

      <div ng-show="device">
        <h3>Detalles del dispositivo</h3>
        <p>{{device}}</p>
      </div>

    </div>
  </div>

</div>

```

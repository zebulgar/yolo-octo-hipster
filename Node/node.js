var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js")
, webSocket = require('ws')
, ws = new webSocket('ws://127.0.0.1:6437')
, pico = require("node-pico")
, audio = require("./build/Release/audio");


pico.setup({samplerate:48000, cellsize: 64});
var pbuff = 0;
var alpha = 0.99;
function sinetone(freq) {
  var phase = 0;
  var phaseStep = freq / pico.samplerate;
  pbuff = phaseStep;
  return {
    process: function(L, R) {
      phaseStep = alpha * phaseStep + (1 - alpha) * pbuff;
      for (var i = 0; i < L.length; i++) {
        L[i] = R[i] = Math.sin(6.28318 * phase);
        phase += phaseStep;
      }
    }
  };
}
//setInterval(function(){pbuff+=pbuff/100.0;},50);

pico.play(sinetone(40));
ws.on('message', function(data, flags) {
  frame = JSON.parse(data);
  if (frame.hands && frame.hands.length > 0) {
    var height = frame.hands[0].palmPosition[1]/400.0;
    pbuff = height*4000.0 / pico.samplerate;
  }
});

var app = express()
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(3000)

var accelData = new dequeue();
var accelLimit = 5000;
var devices = 1;
setInterval(function() {
  var time = new Date();
  while (!accelData.empty() && (time - accelData.peek_back().date) > accelLimit) {
    accelData.pop_back();
  }
}, 5000);

app.use("/js", express.static(__dirname + '/js'));
app.use("/style", express.static(__dirname + '/style'));
app.use("/images", express.static(__dirname + '/images'));
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/ping', function (req, res) {
    io.sockets.emit('response',{status: 'ping'});
});

io.sockets.on('connection', function (socket) {
  socket.emit('response', { id: 1 });
  socket.on('request', function (data) {
    console.log(data);
    io.sockets.emit('response',data)
  });
  socket.on('accelerometer', function (data) {
    data.date = new Date();
    accelData.push(data);
    io.sockets.emit('accelData',{numEvents:accelData.peek_magnitude()});
  });
});

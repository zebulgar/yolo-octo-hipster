var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js");

var app = express()
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(3000)

var accelData = new dequeue();
var accelLimit = 5000;
setInterval(function() {
  var time = new Date();
  while (!accelData.empty() && (time - accelData.peek_back().date) > accelLimit) {
    accelData.pop_back();
    console.log("INNER DIFF: " + (time - accelData.peek_back().date));
  }
  if(!accelData.empty()) {
    console.log("OUTER DIF: " + (accelData.peek_back().date));
  }
  console.log(accelData.length);
  console.log("DATA2: " + accelData.peek_back())
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
    console.log("pinging");
});

io.sockets.on('connection', function (socket) {
  socket.emit('response', { hello: 'world' });
  socket.on('request', function (data) {
    console.log(data);
    io.sockets.emit('response',data)
  });
  socket.on('accelerometer', function (data) {
    data.date = new Date();
    console.log("DATA1: " + data);
    accelData.push(data);
    io.sockets.emit('accelData',{numEvents:accelData.peek_magnitude()});
  });
});

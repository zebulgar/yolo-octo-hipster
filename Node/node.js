var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js")
, webSocket = require('ws')
, ws = new webSocket('ws://127.0.0.1:6437')
, audio = require("./build/Release/audio");

ws.on('message', function(data, flags) {
  frame = JSON.parse(data);
  if (frame.hands && frame.hands.length > 0) {
    var height = frame.hands[0].palmPosition[1]/300.0;
    console.log(height*10);
    audio.setVol(Math.min(1.0,height));
  }
});

var app = express()
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(3000)

var allData = []

/** Each concert-goer keeps at most 10s of data **/
var accelLimit = 10000;

var devices = 1;
var smoothed = 0;
var smoothing = 10;
setInterval(function() {
  for(var i = 0; i < allData.length; i ++) {
    var accelData = allData[i];
    var time = new Date();
    if(accelData && accelData.peek_back()) {
      while (!accelData.empty() && (time - accelData.peek_back().date) > accelLimit) {
        accelData.pop_back();
      }
    }
  }
}, 5000);

/** Simple Low-Pass Filter **/
low_pass = function(newData) { 
}

setInterval(function() {
  var time = new Date();
  var newData = [];
  /** Submit all individual values **/
  for(var i = 0; i < allData.length; i ++) {
    if(allData[i]) {
      var data = allData[i].peek_front();
      if(data) {
        var magnitude = allData[data.id].peek_magnitude();
        io.sockets.emit('accelData',{id: data.id, date: data.date, magnitude: magnitude});
        console.log("DELTA: " + (time - data.date));
        if (time - data.date < 400) {
          newData.push(magnitude);
        }
      }
    }
  }
  /** Average all of fronts in last 200ms **/
  console.log("New Data: " + newData);
  var total = 0;
  for(var i = 0; i < newData.length; i ++) {
    total += newData[i];
  }
  if(newData.length != 0) {
    var avg = total / newData.length;
    // io.sockets.emit('accelData',{id: 99, date: (new Date()), magnitude: avg});
  }
}, 100);
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
  socket.emit('response', { id: devices });
  io.sockets.emit('newDevice', { id: devices });
  allData[devices] = new dequeue();
  devices++;
  socket.on('request', function (data) {
    console.log(data);
    io.sockets.emit('response',data)
  });
  socket.on('accelerometer', function (data) {
    data.date = new Date();
    // console.log("Coming from: " + data.id);
    if(!allData[data.id]) {
      allData[data.id] = new dequeue();
    }
    allData[data.id].push(data);
  });
});

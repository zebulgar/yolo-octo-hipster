var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js")
, webSocket = require('ws')
, ws = new webSocket('ws://127.0.0.1:6437')
, pico = require("node-pico")
, audio = require("./build/Release/audio")
, fs = require("fs")
, Speaker = require('speaker')
, Reader = require('wav').Reader
, Duplex = require('stream').Duplex;


sample = new Duplex();
sample.data = new Buffer(0);
sample.done = false;
sample.flipflop = true;
sample.pos = 0;
sample.len = 8;
sample._read = function(n) {
  if (this.done) {
    //console.log("pushing");
    if (this.flipflop) {
      this.flipflop = false;
      n = this.chunkSize;
      var numbuckets = Math.floor(this.data.length/n)-1;
      console.log(Math.floor(this.pos*Math.floor(this.data.length/n)));
      console.log(Math.floor(this.data.length/n));
      var dist = Math.floor(numbuckets*Math.min(1.0,this.pos))*n;
      this.push(this.data.slice(dist,dist+n*this.len));
      this.push('');
      //console.log("flipped");
    }
    else {
      //console.log("pausing");
      this.push('');
    }
  }
  else {
    //console.log("not done");
    this.push('');
  }
}
sample._write = function(chunk, encoding, done) {
  if (typeof encoding == 'function') done = encoding;
  //console.log(chunk.length);
  this.data = Buffer.concat([this.data, chunk]);
  //console.log(this.data.length);
  return done();
}
sample.on('finish', function() { this.done = true; console.log("end");});
var reader = new Reader();
readStream = fs.createReadStream("ahh.wav");
reader.on('format', function (format) {
  console.error('format:', format);
  var s = new Speaker(format);
  sample.chunkSize = (s.bitDepth / 8 * s.channels) * s.samplesPerFrame;
  reader.pipe(sample).pipe(s);
});

reader.on('error', function (err) {
  console.error('Reader error: %s', err);
});
readStream.pipe(reader);

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

i=0;
//pico.play(sinetone(40));
ws.on('message', function(data, flags) {
  frame = JSON.parse(data);
  if (frame.hands && frame.hands.length > 0) {
    if (frame.pointables && frame.pointables.length > 0) {
      console.log(frame.pointables.length);
      var height = frame.hands[0].palmPosition[1]/400.0;
      pbuff = height*4000.0 / pico.samplerate;
      sample.len = Math.pow(2,frame.pointables.length);
      sample.pos = 0.6;
      //sample.pos = i;
      i+=1.0/1000;
      sample.flipflop = true;
      sample.read(0);
      //console.log("event");
    }
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

var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js")
, webSocket = require('ws')
, ws = new webSocket('ws://127.0.0.1:6437')
, pico = require("node-pico")
, audio = require("./build/Release/audio")
, fs = require("fs")
, Speaker = require('speaker')
, Decoder = require('lame').Decoder
, Duplex = require('stream').Duplex;


sample = new Duplex();
sample.data = new Buffer(0);
sample.rdata = undefined;
sample.done = false;
sample.flipflop = true;
sample.forward = true;
sample.pos = 0;
sample.len = 8;
sample.start = new Date();
sample.duration = null;
sample._read = function(n) {
  if (this.done) {
    //console.log("pushing");
    if (this.flipflop) {
      this.flipflop = false;
      sample.start = new Date();
      /*
      n = this.chunkSize;
      var numbuckets = Math.floor(this.data.length/n)-1;
      console.log(Math.floor(this.pos*Math.floor(this.data.length/n)));
      console.log(Math.floor(this.data.length/n));
      var dist = Math.floor(numbuckets*Math.min(1.0,this.pos))*n;
      this.push(this.data.slice(dist,dist+n*this.len));
      */
      this.push((this.forward ? this.data : this.rdata).slice(0,this.data.length/2));
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
sample.on('finish', function() {
  this.done = true;
  console.log("end");
  var l = this.data.length;
  this.duration = l/4.0/48000*1000/2;
  var newdata = new Buffer(l);
  for(var i=0;i<l/2;i++) {
    newdata[2*i]=this.data[l-2*i-2]
    newdata[2*i+1]=this.data[l-2*i-1]
  }
  this.rdata = newdata;
});
var reader = new Decoder();
readStream = fs.createReadStream("ahh.mp3");
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
    if (frame.pointables && frame.pointables.length >= 5) {
      //console.log(frame.pointables.length);
      mag = 0;
      for(var i=0;i<frame.pointables.length;i++) {
        var point = frame.pointables[i]
        mag += point.tipVelocity[2];
      }
      //console.log(mag);
      if (Math.abs(mag) > 1000 && (new Date() - sample.start) > sample.duration) {
      console.log(sample.duration/1000);
        //var height = frame.hands[0].palmPosition[1]/400.0;
        //pbuff = height*4000.0 / pico.samplerate;
        //sample.len = Math.pow(2,frame.pointables.length);
        //sample.pos = 0.6;
        //sample.pos = i;
        sample.forward = mag < 0;
        sample.flipflop = true;
        sample.read(0);
      }
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

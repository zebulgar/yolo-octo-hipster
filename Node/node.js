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

var allData = []

/** Each concert-goer keeps at most 5s of data **/
var accelLimit = 5000;

var devices = 1;
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


magnitude = function(data) {
  var magnitude = Math.pow(Math.pow(data.x,2) + Math.pow(data.y,2) + Math.pow(data.z,2), 0.5);
  return magnitude;
}

/** Simple BPM finder **/
find_bpm = function(data) {

  var peaks = []
  var first_date = 0;
  var last_date = 0;
  for (var i = 1; i < data.length - 1; i++) {
    if(magnitude(data[i-1]) < magnitude(data[i]) && magnitude(data[i]) > magnitude(data[i+1]) ||
       magnitude(data[i-1]) > magnitude(data[i]) && magnitude(data[i]) < magnitude(data[i+1])) {

      var delta = Math.abs(magnitude(data[i]) - magnitude(data[i-1]));
      var delta2 = Math.abs(magnitude(data[i]) - magnitude(data[i+1]));


      /** Check to see if an actual peak **/
      if(Math.max(delta, delta2) > 0.05) {

        if(first_date == 0) {
          first_date = data[i].date;
        } else {
          last_date = data[i].date;
        }
        peaks.push(i);
      }
    } 
  }
  var delta_time = (first_date - last_date)
  if(peaks.length > 6) {
    return peaks.length / delta_time * 30000;
  } else {
    return 0;
  }
}

setInterval(function() {
  var time = new Date();
  var newData = [];
  var allBpm = [];
  /** Submit all individual values **/
  for(var i = 0; i < allData.length; i ++) {
    if(allData[i]) {
      var data = allData[i].peek_front();
      if(data) {
        var magnitude = allData[data.id].peek_magnitude();
        // io.sockets.emit('accelData',{id: data.id, date: data.date, magnitude: magnitude});

        /** Find BPM of this Data **/
        var bpm = find_bpm(allData[i].to_array());

        /** Put it into average margnitudes if in last 200ms **/
        if (time - data.date < 400) {
          newData.push(magnitude);
          allBpm.push(bpm);
        }
      }
    }
  }
  console.log("allBPM: " + allBpm);
  /** Average all of fronts in last 200ms **/
  var total = 0;
  var totalBPM = 0;
  for(var i = 0; i < newData.length; i ++) {
    total += newData[i];
    totalBPM += allBpm[i];
  }
  console.log("totalBPM: " + totalBPM);
  if(newData.length != 0) {
    var avg = total / newData.length;
    var avgBPM = totalBPM / allBpm.length;
    io.sockets.emit('bpm', {id: 0, bpm: avgBPM});
    io.sockets.emit('accelData',{id: 0, date: (new Date()), magnitude: avg});
  }
}, 100);
setInterval(function() {
  for(var i = 0; i < allData.length; i ++) {
    var accelData = allData[i];
    var time = new Date();
    if(accelData) {
      while (!accelData.empty() && (time - accelData.peek_back().date) > accelLimit) {
        accelData.pop_back();
      }
    }
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
    allData[data.id].low_pass_push(data);
  });
});

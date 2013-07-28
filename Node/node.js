var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js")
, webSocket = require('ws')
, ws = new webSocket('ws://172.16.240.69:6437')
, pico = require("node-pico")
, audio = require("./build/Release/audio")
, fs = require("fs")
, Speaker = require('speaker')
, Decoder = require('lame').Decoder
, Duplex = require('stream').Duplex;

var kSample = 0, kRoll = 1, kPitch = 2;
var mode = kRoll;
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
    if (this.flipflop) {
      this.flipflop = false;
      sample.start = new Date();
      if (mode == kSample) {
        this.push((this.forward ? this.data : this.rdata).slice(0,this.data.length/2));
      }
      else if (mode == kRoll) {
        n = this.chunkSize;
        var numbuckets = Math.floor(this.data.length/n)-1;
        var dist = Math.floor(numbuckets*Math.min(1.0,this.pos))*n;
        this.push(this.data.slice(dist,dist+n*this.len));
      }
    }
    else {
      this.push('');
    }
  }
  else {
    this.push('');
  }
}
sample._write = function(chunk, encoding, done) {
  if (typeof encoding == 'function') done = encoding;
  this.data = Buffer.concat([this.data, chunk]);
  return done();
}
sample.on('finish', function() {
  this.done = true;
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
var amplitude = 0.0;
function sinetone(freq) {
  var phase = 0;
  var phaseStep = freq / pico.samplerate;
  pbuff = phaseStep;
  return {
    process: function(L, R) {
      phaseStep = alpha * phaseStep + (1 - alpha) * pbuff;
      for (var i = 0; i < L.length; i++) {
        L[i] = R[i] = Math.sin(6.28318 * phase) * amplitude;
        phase += phaseStep;
      }
    }
  };
}

pico.play(sinetone(40));
ws.on('message', function(data, flags) {
  frame = JSON.parse(data);
  if (frame.hands && frame.hands.length > 0) {
    if (mode == kSample) {
      amplitude = 0.0;
      if (frame.pointables && frame.pointables.length >= 5) {
        mag = 0;
        for(var i=0;i<frame.pointables.length;i++) {
          var point = frame.pointables[i]
          mag += point.tipVelocity[2];
        }
        if (Math.abs(mag) > 1000 && (new Date() - sample.start) > sample.duration) {
          sample.forward = mag < 0;
          sample.flipflop = true;
          sample.read(0);
        }
      }
    }
    else if (mode == kPitch) {
      console.log(frame.pointables.length);
      if (frame.pointables && frame.pointables.length >= 5) {
        var height = frame.hands[0].palmPosition[1]/400.0;
        pbuff = height*4000.0 / pico.samplerate;
        amplitude = 1.0;
      }
      else {
        amplitude = 0.0;
      }
    }
    else if (mode == kRoll) {
      amplitude = 0.0;
      if (frame.pointables && frame.pointables.length > 0) {
        if (true || (new Date() - sample.start) > sample.duration*8.0/sample.len/1.5) {
          var height = frame.hands[0].palmPosition[1]/400.0;
          sample.len = Math.pow(2,frame.pointables.length);
          sample.pos = 0.8;
          sample.flipflop = true;
          sample.read(0);
        }
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
  /** Average all of fronts in last 200ms **/
  var total = 0;
  var totalBPM = 0;
  for(var i = 0; i < newData.length; i ++) {
    total += newData[i];
    totalBPM += allBpm[i];
  }
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
app.get('/sample', function (req, res) {
    mode = kSample;
});
app.get('/pitch', function (req, res) {
    mode = kPitch;
});
app.get('/roll', function (req, res) {
    mode = kRoll;
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
  socket.on('sample', function (data) {
    mode = kSample;
  });
  socket.on('pitch', function (data) {
    mode = kPitch;
  });
  socket.on('roll', function (data) {
    mode = kRoll;
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

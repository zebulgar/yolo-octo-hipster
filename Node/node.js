var express = require("express")
, http = require("http")
, dequeue = require("./dequeue.js")

var app = express()
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(3000)

var allData = []

/** Each concert-goer keeps at most 10s of data **/
var accelLimit = 10000;

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
    io.sockets.emit('bpm', {id: 99, bpm: avgBPM});
    io.sockets.emit('accelData',{id: 99, date: (new Date()), magnitude: avg});
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

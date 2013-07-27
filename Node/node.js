var express = require("express")
, http = require("http")

var app = express()
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(3000)

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
});

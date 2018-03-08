var app = require('http').createServer(handler),
  io = require('socket.io').listen(app),
  url = require('url'),
  fs = require('fs'),
  mysql = require('mysql'),
  connectionsArray = [],
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'test',
    port: 3306
  }),
  POLLING_INTERVAL = 6000,
  pollingTimer;

// If there is an error connecting to the database
connection.connect(function(err) {
  // connected! (unless `err` is set)
  if (err) {
    console.log(err);
  }
});

// creating the server ( localhost:8000 )
app.listen(5001);


function handler(req, res) {

    console.log("INCOMING REQUEST: "+req.method+" "+req.url);
    req.parsed_url = url.parse(req.url, true);
    var getp = req.parsed_url.query;
    var hwkey = getp.hk;
    console.log(hwkey);

    fs.readFile(__dirname + '/client.html', function(err, data) {
    if (err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading client.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}


function pollingLoop(){	
	pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);
  // Doing the database query
   var query = connection.query('SELECT max(id) as latest_id, firstname FROM users_profile'),
  // //var query = connection.query('SELECT max(id), testo, created_by FROM flashmsgs'),
     flashmsgs = []; // this array will contain the result of our db query

  // // setting the query listeners
   query
     .on('error', function(err) {
      // Handle error, and 'end' event will be emitted after this as well
      console.log(err);
      updateSockets(err);
    })
    .on('result', function(flashmsg) {
    	//console.log(flashmsg);
      // it fills our array looping on each user row inside the db
      flashmsgs.push(flashmsg);
    })
    .on('end', function() {
      // loop on itself only if there are sockets still connected
      if (connectionsArray.length) {

        pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);

        updateSockets({
          flashmsgs: flashmsgs
        });
      } else {

        console.log('The server timer was stopped because there are no more socket connections on the app')

      }
    });
};


// creating a new websocket to keep the content updated without any AJAX request
io.sockets.on('connection', function(socket) {

  console.log('Number of connections:' + connectionsArray.length);
  // starting the loop only if at least there is one user connected
  if (!connectionsArray.length) {
    pollingLoop();
  }

  socket.on('disconnect', function() {
    var socketIndex = connectionsArray.indexOf(socket);
    console.log('socketID = %s got disconnected', socketIndex);
    if (~socketIndex) {
      connectionsArray.splice(socketIndex, 1);
    }
  });

  console.log('A new socket is connected!');
  connectionsArray.push(socket);

});

var updateSockets = function(data) {
  // adding the time of the last update
  console.log(JSON.stringify(data.flashmsgs));
  data = JSON.stringify(data.flashmsgs);
  data.time = new Date();

  console.log('Pushing new data to the clients connected ( connections amount = %s ) - %s', connectionsArray.length , data);
  // sending new data to all the sockets connected
  connectionsArray.forEach(function(tmpSocket) {
    tmpSocket.volatile.emit('notification', data);
  });
};

console.log('Please use your browser to navigate to http://localhost:5000');
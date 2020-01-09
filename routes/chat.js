var express = require("express");
var router = express.Router();
const Request = require("request");

const WebSocket = require("ws");
wss = new WebSocket.Server({ port: 8090, clientTracking: true });

let previousHistory = [];
let connectionsCount = 0;
var connections = [];

wss.on("connection", function connection(ws, req) {
  id = req.headers["sec-websocket-key"];
  connections.push({ wsId: id, username: '' });
  // send live connection count to client

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      connectionsCount = wss.clients.size;
      client.send(wss.clients.size);
    }
  });

  ws.on("open", function open() {
  });

  ws.on("message", function incoming(data) {
    
    deconstructData = JSON.parse(data);
  // collect message history to send over get("/") request on componentDidMount
    const { name, message, timeStamp, username } = deconstructData;
  // collect users online
    // connections[connectionsCount-1]['username'] = username;
  // collect previous history
    previousHistory.push({
      name: name,
      message: message,
      timeStamp: timeStamp
    });

    // broadcast messages to all users
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on("close", function close() {
--connectionsCount;
wss.clients.forEach(function each(client) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(connectionsCount);
  }
});
  });

  router.get("/", function(req, res) {
    var options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    };

    Request.get(options, (error, response, body) => {
      const data = previousHistory;
      res.status(200).send(data);
    });
  });
});

module.exports = router;

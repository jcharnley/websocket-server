var express = require('express');
var router = express.Router();
var util = require('../util');

const WebSocket = require('ws');
wss = new WebSocket.Server({ port: 8090, clientTracking: true });

let msgHistory = [];
let connections = [];
let privateRoomMsg = [];
let fromClient;
let toClient;

wss.on('connection', (ws, req) => {
	ws.send('{ "connection" : "ok"}');
	ws.id = util.uuidc();

	ws.on('message', async (data) => {
		const message = JSON.parse(data);
		console.log('message', message);

		switch (message.type) {
			case 'set_username':
				const { setName } = message;
				ws.username = setName;
				connections.push({ id: ws.id, username: setName });

				wss.clients.forEach(function each(client) {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify({ type: 'connections', connections: connections }));
					}
				});
				break;
			case 'message':
				msgHistory.push({
					type: 'history',
					name: message.name,
					message: message.message,
					timeStamp: message.timeStamp,
				});
				wss.clients.forEach(function each(client) {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(message));
					}
				});
				break;
			case 'private_messages_start':
				let privateRoomID = util.uuidc();

				fromClient = await findClientById(ws.id);
				toClient = await findClientById(message.targetId);

				privateRoomMsg.push({
					type: 'private_room_created',
					targetId: message.targetId,
					privateRoomID: privateRoomID,
					privateRoomActive: message.privateRoomActive,
					privateConnnections: [fromClient, toClient],
					fromClient: fromClient.id,
					toClient: toClient.id,
					messages: [],
				});

				toClient.send(
					JSON.stringify({
						id: message.id,
						type: 'private_room_created',
						fromClient: fromClient.id,
						toClient: toClient.id,
						targetId: message.targetId,
						targetName: fromClient.username,
						privateRoomActive: message.privateRoomActive,
						privateRoomID: privateRoomID,
					})
				);

				fromClient.send(
					JSON.stringify({
						id: message.id,
						type: 'private_room_created',
						fromClient: fromClient.id,
						toClient: toClient.id,
						targetId: ws.id,
						targetName: message.targetName,
						privateRoomActive: message.privateRoomActive,
						privateRoomID: privateRoomID,
					})
				);
				break;
			case 'private_message_room':
				const privateRoomFound = privateRoomMsg.find((obj) => {
					if (obj.privateRoomID === message.privateRoomID) {
						return obj;
					}
				});

				if (privateRoomFound) {
					privateRoomFound.messages.push({
						id: message.id,
						name: message.name,
						message: message.message,
						timeStamp: message.timeStamp,
					});
				}

				privateRoomFound.privateConnnections.forEach(function each(client) {
					if (client.readyState === WebSocket.OPEN) {
						client.send(
							JSON.stringify({
								type: 'private_message_room',
								privateRoomMsg: privateRoomFound.messages,
							})
						);
					}
				});
				break;
		}
	});

	ws.on('close', (ws, req) => {
		// console.log(new Date() + ' Peer ' + id + ' disconnected.');
		const findIndex = connections.findIndex((obj) => obj.id === ws.id);
		connections.splice(findIndex, 1);
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify({ type: 'connections', connections: connections }));
			}
		});
	});
});

async function findClientById(id) {
	let clientFound;
	wss.clients.forEach((client) => {
		if (client.id === id && client.readyState === WebSocket.OPEN) {
			clientFound = client;
		}
	});

	return clientFound;
}

router.get('/', (req, res, next) => {
	res.status(200).send(msgHistory);
});

module.exports = router;

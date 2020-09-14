var express = require('express');
var router = express.Router();
var util = require('../util');

const WebSocket = require('ws');
wss = new WebSocket.Server({ port: 8090, clientTracking: true });

let msgHistory = [];
let connections = [];
let remotePeerId;
let fromClient;
let toClient;

wss.on('connection', (ws, req) => {
	ws.send('{ "connection" : "ok"}');
	ws.id = util.uuidc();

	ws.on('message', async (data) => {
		const message = JSON.parse(data);
		console.log('data', message.type);

		if (message.type === 'set_username') {
			const { setName } = message;
			connections.push({ id: ws.id, username: setName });

			wss.clients.forEach(function each(client) {
				if (client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify({ type: 'connections', connections: connections }));
				}
			});
		} else if (message.type === 'message') {
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
		} else if (message.type === 'private_message') {
			fromClient = await findClientById(ws.id);
			toClient = await findClientById(message.targetId);

			toClient.send(
				JSON.stringify({
					type: 'private_message',
					fromClient: fromClient.id,
					toClient: toClient.id,
				})
			);
		}
		// else if (message.type === 'createPeerConnection') {
		// 	console.log("createPeerConnection", message)
		// 	fromClient = await findClientById(ws.id);
		// 	toClient = await findClientById(message.toClient);

		// 	toClient.send(
		// 		JSON.stringify({
		// 			type: 'createPeerConnection',
		// 			fromClient: fromClient.id,
		// 			toClient: toClient.id,
		// 		})
		// 	);
		// }
		// else if (message.type === 'triggerLocalStream') {
		// 	console.log("triggerLocalStream", message)
		// 	fromClient = await findClientById(ws.id);
		// 	toClient = await findClientById(message.toClient);

		// 	toClient.send(
		// 		JSON.stringify({
		// 			type: 'acceptLocalStream',
		// 			fromClient: fromClient.id,
		// 			toClient: toClient.id,
		// 		})
		// 	);
		// }
		else if (message.type === 'offer') {
			console.log('offer', message);
			fromClient = await findClientById(ws.id);
			toClient = await findClientById(message.toClient);
			remotePeerId = message.toClient;
			
			toClient.send(
				JSON.stringify({
					type: 'offer',
					offer: message,
					fromClient: fromClient.id,
					toClient: toClient.id,
				})
			);
		} else if (message.type === 'answer') {
			console.log('answer', message);
			fromClient = await findClientById(ws.id);
			toClient = await findClientById(message.fromClient);

			toClient.send(
				JSON.stringify({
					type: 'answer',
					answer: message.answer,
					fromClient: fromClient.id,
					toClient: toClient.id,
				})
			);
		} else if (message.type === 'candidate') {
			console.log('canidate received', message.candidate);
			fromClient = await findClientById(ws.id);
			toClient = await findClientById(message.toClient);
			// console.log('remotePeerId', remotePeerId);
			toClient.send(
				JSON.stringify({
					type: 'candidate',
					candidate: message.candidate,
					fromClient: fromClient.id,
					toClient: remotePeerId,
				})
			);
		}

		// broadcast messages to all users
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

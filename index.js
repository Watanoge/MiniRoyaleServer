var port = process.env.PORT || 4000,
	io = require('socket.io')(port);

var _ = require('lodash');
var gameVersion = "0.1.1";

//Custom Classes
var Player = require('./Classes/Player.js');
const Room = require('./Classes/Room.js');

var rooms = [];

function UpdatePlayerValues(currentRoom) {
	var playerList = "",
		currentName, currentId;

	for (var playerId in currentRoom.players) {
		currentName = currentRoom.players[playerId].username;
		playerList += currentName + ",";
	}
	playerList += "|"

	for (var playerId in currentRoom.players) {
		currentId = currentRoom.players[playerId].id;
		playerList += currentId + ",";
	}
	console.log("End list: " + playerList);
	playerList += "|"

	var count = 0;
	for (var socketID in currentRoom.sockets) {
		console.log("Player " + count + " is host? " + (count == 0));
		currentRoom.sockets[socketID].emit('receiveData', {
			action: "updateLobby|" + playerList + (count == 0)
		});
		count++;
	}
}

io.on('connection', function (socket) {
	console.log('Connection made!');

	var player = new Player();
	var thisPlayerID = player.id;
	socket.emit('register', {
		id: thisPlayerID,
		version: gameVersion
	});
	console.log('Player created!');
	console.log(
		'There are currently ' + Object.keys(rooms).length + ' rooms active!'
	);
	var currentRoomID;

	socket.on('loginPlayer', function (data) {
		rooms[currentRoomID].players[thisPlayerID].username = data.myClient.name;
		console.log("Player " + thisPlayerID + " of room " + rooms[currentRoomID].id + " is named " + rooms[currentRoomID].players[thisPlayerID].username);
		var currentRoom = rooms[currentRoomID];
		UpdatePlayerValues(currentRoom);
	});

	socket.on('tryRoomConnection', function () {
		if (Object.keys(rooms).length == 0) {
			socket.emit('receiveData', {
				action: "createRoom"
			});
		} else {
			socket.emit('receiveData', {
				action: "joinRoom"
			});
		}
	});

	socket.on('connectToRoom', function (data) {
		player.isHost = false;
		player.isSpectator = false;

		console.log('Connecting to room ' + data.id);
		console.log(
			'There are currently ' +
			Object.keys(rooms).length +
			' rooms active!'
		);
		var roomId = 'NA';
		console.log(rooms);
		for (var room in rooms) {
			if (rooms[room].id == data.id) {
				console.log('Room found!');
				roomId = room;
			}
		}

		if (roomId == 'NA') {
			console.log('Room does not exist!');
			socket.emit('receiveData', {
				action: "serverError|¡Oops!|No existe un cuarto con ese nombre.|Aceptar|1"
			});
		} else {
			console.log('Room exists, so connect!');
			var currentRoom = rooms[roomId];
			if (!currentRoom.isOpen) {
				console.log('Room is not open!');
				socket.emit('receiveData', {
					action: "serverError|¡Oops!|El cuarto está cerrado.|Aceptar|1"
				});
			} else if (currentRoom.isFull) {
				console.log('Room is full!');
				socket.emit('receiveData', {
					action: "serverError|¡Oops!|El cuarto está lleno.|Aceptar|1"
				});
			} else {
				currentRoomID = currentRoom.id;
				currentRoom.players[thisPlayerID] = player;
				currentRoom.sockets[thisPlayerID] = socket;

				currentRoom.isFull = Object.keys(currentRoom.players).length == currentRoom.roomSize;

				console.log('Successfully connected, now go to lobby!');
				socket.emit('receiveData', {
					action: "joinRoomLobby|" + currentRoomID
				});
			}
		}
	});

	socket.on('connectToRandomRoom', function () {
		console.log('Connecting to random room ');

		if (currentRoomID == null) {
			var filtered = _.pickBy(rooms, function (x) {
				return x.isPublic && x.isOpen && !x.isFull;
			});

			console.log('Available rooms are: ');
			console.log(filtered);
			if (filtered == null || Object.keys(filtered).length == 0) {
				console.log('There are no public rooms!');
				socket.emit('receiveData', {
					action: "serverError|¡Oops!|No hay ningún cuarto disponible.|Aceptar|1"
				});
			} else {
				var keys = Object.keys(filtered);
				console.log(
					'There are currently ' +
					keys.length +
					' rooms active!'
				);
				var currentRoom = filtered[keys[keys.length * Math.random() << 0]];
				console.log('There are rooms, so connect to ' + currentRoom.id + '!');

				currentRoomID = currentRoom.id;
				currentRoom.players[thisPlayerID] = player;
				currentRoom.sockets[thisPlayerID] = socket;
				currentRoom.isFull = Object.keys(currentRoom.players).length == currentRoom.roomSize;
				console.log(
					"Room's players: " +
					Object.keys(currentRoom.players).length
				);
				console.log('Successfully connected, now go to lobby!');
				socket.emit('receiveData', {
					action: "joinRoomLobby|" + currentRoomID
				});
			}
		} else {
			socket.emit('receiveData', {
				action: "serverError|¡Espera!|Ya estás en un cuarto.|Aceptar|1"
			});
		}
	});

	socket.on('createRoom', function (data) {
		player.isHost = true;
		player.isSpectator = false;

		if (currentRoomID == null) {
			console.log('Creating room');
			var top = 9999,
				minLength = 4;
			var newRoomId = Math.floor(Math.random() * top);
			if (Object.keys(rooms).length > 1) {
				do {
					newRoomId = Math.floor(Math.random() * top);
				} while (rooms.find(x => x.rawId == newRoomId));
			}
			var currentRoom = new Room(newRoomId, Math.max(top.toString().length, minLength));
			currentRoom.isPublic = data.isPublic;
			console.log(
				'Created room of ID ' +
				currentRoom.id +
				' with public set to ' +
				currentRoom.isPublic
			);
			currentRoom.players[thisPlayerID] = player;
			currentRoom.sockets[thisPlayerID] = socket;

			currentRoomID = currentRoom.id;
			rooms[currentRoom.id] = currentRoom;

			console.log("Room created, now go to lobby!");
			socket.emit('receiveData', {
				action: "joinRoomLobby|" + currentRoomID
			});
		} else {
			socket.emit('receiveData', {
				action: "serverError|¡Espera!|Ya estás en un cuarto.|Aceptar|1"
			});
		}
	});

	socket.on('gameDisconnect', function () {
		console.log('Game Disconnection made!');
		if (currentRoomID != null) {
			var count = 0;
			for (var playerId in rooms[currentRoomID].players) {
				if (playerId == thisPlayerID) {
					break;
				} else {
					count++;
				}
			}

			console.log("Disconnect list player " + count);

			delete rooms[currentRoomID].players[thisPlayerID];
			delete rooms[currentRoomID].sockets[thisPlayerID];
			rooms[currentRoomID].isFull = Object.keys(rooms[currentRoomID].players).length == rooms[currentRoomID].roomSize;
			//Disconnect player in other clients
			for (var socketID in rooms[currentRoomID].sockets) {
				rooms[currentRoomID].sockets[socketID].emit('receiveData', {
					action: "disconnected|" + count
				});
			}

			console.log(
				"Room's players: " +
				Object.keys(rooms[currentRoomID].players).length
			);
			console.log(rooms[currentRoomID].players);
			if (Object.keys(rooms[currentRoomID].players).length == 0) {
				console.log('Room is empty, so delete!');
				delete rooms[currentRoomID];
			} else {
				var currentRoom = rooms[currentRoomID];
				UpdatePlayerValues(currentRoom);
				if (Object.keys(rooms[currentRoomID].players).length > 1) {
					for (var socketID in rooms[currentRoomID].sockets) {
						rooms[currentRoomID].sockets[socketID].emit('receiveData', {
							id: thisPlayerID,
							action: "disconnectEndTurn|" + count,
						});
					}
				}
			}
			currentRoomID = null;
		}
		console.log('Successfully disconnected!');
	});

	socket.on('disconnect', function () {
		console.log('Disconnection made!');
		if (currentRoomID != null) {
			var count = 0;
			for (var playerId in rooms[currentRoomID].players) {
				if (playerId == thisPlayerID) {
					break;
				} else {
					count++;
				}
			}

			console.log("Disconnect list player " + count);

			delete rooms[currentRoomID].players[thisPlayerID];
			delete rooms[currentRoomID].sockets[thisPlayerID];
			rooms[currentRoomID].isFull = Object.keys(rooms[currentRoomID].players).length == rooms[currentRoomID].roomSize;
			//Disconnect player in other clients
			for (var socketID in rooms[currentRoomID].sockets) {
				rooms[currentRoomID].sockets[socketID].emit('receiveData', {
					action: "disconnected|" + count
				});
			}

			console.log(
				"Room's players: " +
				Object.keys(rooms[currentRoomID].players).length
			);
			console.log(rooms[currentRoomID].players);
			if (Object.keys(rooms[currentRoomID].players).length == 0) {
				console.log('Room is empty, so delete!');
				delete rooms[currentRoomID];
			} else {
				var currentRoom = rooms[currentRoomID];
				UpdatePlayerValues(currentRoom);
				if (Object.keys(rooms[currentRoomID].players).length > 1) {
					for (var socketID in rooms[currentRoomID].sockets) {
						rooms[currentRoomID].sockets[socketID].emit('receiveData', {
							id: thisPlayerID,
							action: "disconnectEndTurn|" + count,
						});
					}
				}
			}
			currentRoomID = null;
		}
		console.log('Successfully disconnected!');
	});

	socket.on('sendInfo', function (data) {
		if (currentRoomID != null) {
			console.log('Info sent! - ' + data.instruction);
			console.log(
				'Broadcasting on room ' + rooms[currentRoomID].id + ' to ' +
				Object.keys(rooms[currentRoomID].sockets).length +
				' sockets!'
			);
			for (var socketID in rooms[currentRoomID].sockets) {
				rooms[currentRoomID].sockets[socketID].emit('receiveData', {
					id: thisPlayerID,
					action: data.instruction,
				});
			}
		}
	});

	socket.on('closeRoom', function () {
		rooms[currentRoomID].isOpen = false;
	});
});
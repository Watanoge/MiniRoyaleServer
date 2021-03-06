var io = require('socket.io')(process.env.PORT || 4000);

var _ = require('lodash');
var gameVersion = "0A.20.1004";
//{GameState}.{Year-2000}.{MonthDay}
//GameState 0A - Alpha
//GameState 0B - Beta
//GameState 1 - Production

//Custom Classes
var Player = require('./Classes/Player.js');
const Room = require('./Classes/Room.js');

var rooms = [];
var playerAmount = 0;

function SendCustomWarning(socket, warningTitleEsp, warningTextEsp, warningButtonTextEsp, warningTitleEng, warningTextEng, warningButtonTextEng, warningType, warningSize, waitUntil) {
	socket.emit('receiveData', {
		action: "customError|" +
			warningTitleEsp + "|" +
			warningTextEsp + "|" +
			warningButtonTextEsp + "|" +
			warningTitleEng + "|" +
			warningTextEng + "|" +
			warningButtonTextEng + "|" +
			warningType + "|" +
			warningSize + "|" +
			waitUntil + "|"
	});
}

function SetNotificationText(socket) {

	// setPopupText,
	// 	"Titulo en español",
	// 	"Texto en español",
	// 	"Botón en español",
	// 	"Título en inglés",
	// 	"Texto en inglés",
	// 	"Botón en inglés",
	// 	2);
	// Tamaño de error - 0 pequeño, 1 mediano, 2 grande
	socket.emit('receiveData', {
		action: "setPopupText|" +
			"Actualización|" +
			"<size=50>Versión <color=yellow>" + gameVersion + "</color></size><align=left>\n\n<color=black>*</color> El jugador puede regresar a su posición inicial con <b><color=blue>R</color></b> \n<color=black>*</color> Se arregló overlay de pantalla final con menú de pausa\n<color=black>*</color> Botones de de continuar/iniciar partida se desactivan al usarse por primera vez\n<color=black>*</color> El nombre del jugador debe ser de 15 caracteres (o menos)\n<color=black>*</color> Si el jugador principal se sale de la partida en la pantalla de resultados, el siguiente jugador disponible heredará la función de host y podrá continuar la partida|" +
			"¡OK!|" +
			"Update|" +
			"<size=50>Version <color=yellow>" + gameVersion + "</color></size><align=left>\n\n<color=black>*</color> Player can now reset it's position with <b><color=blue>R</color></b> \n<color=black>*</color> Fixed overlay with result screen and pause menu\n<color=black>*</color> Start match/Next round buttons are now disabled on click\n<color=black>*</color> Player's name must be 15 characters or less\n<color=black>*</color> If host player disconnects on results screen, the host will be transfered to the next player and they'll be able to continue the match|" +
			"OK!|" +
			"2|"
	});
}

function UpdatePlayerValues(currentRoom) {
	var playerList = "",
		currentName, currentId, currentHat, currentHead, currentBody;

	for (var playerId in currentRoom.players) {
		currentName = currentRoom.players[playerId].username;
		currentName.replace("|", "");
		currentName.replace(",", "");
		playerList += currentName + ",";
	}
	playerList += "|"

	for (var playerId in currentRoom.players) {
		currentId = currentRoom.players[playerId].id;
		playerList += currentId + ",";
	}
	playerList += "|"

	for (var playerId in currentRoom.players) {
		currentHat = currentRoom.players[playerId].hatIndex;
		playerList += currentHat + ",";
	}
	playerList += "|"

	for (var playerId in currentRoom.players) {
		currentHead = currentRoom.players[playerId].headIndex;
		playerList += currentHead + ",";
	}
	playerList += "|"

	for (var playerId in currentRoom.players) {
		currentBody = currentRoom.players[playerId].bodyIndex;
		playerList += currentBody + ",";
	}
	playerList += "|"
	console.log("End list: " + playerList);

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
	playerAmount++;
	var player = new Player();
	var thisPlayerID = player.id;
	socket.emit('register', {
		id: thisPlayerID,
		version: gameVersion
	});

	SetNotificationText(socket);

	// SendCustomWarning(socket,
	// 	"Titulo en español",
	// 	"Texto en español",
	// 	"Botón en español",
	// 	"Título en inglés",
	// 	"Texto en inglés",
	// 	"Botón en inglés",
	// 	0, 1, 1);
	// {tipoDeError}, {tamañoDeError}, {Tiempo de espera}
	// Tipo de error - 0 regular, 1 cierra el juego
	// Tamaño de error - 0 pequeño, 1 mediano, 2 grande

	console.log('Player ' + thisPlayerID + ' created, with currently ' + Object.keys(rooms).length + ' rooms active and ' + playerAmount + ' players!');
	var currentRoomID;

	socket.on('loginPlayer', function (data) {
		rooms[currentRoomID].players[thisPlayerID].username = data.myClient.name;
		rooms[currentRoomID].players[thisPlayerID].hatIndex = data.hatIndex;
		rooms[currentRoomID].players[thisPlayerID].headIndex = data.headIndex;
		rooms[currentRoomID].players[thisPlayerID].bodyIndex = data.bodyIndex;
		console.log("Player " + thisPlayerID + " of room " + rooms[currentRoomID].id + " is named " + rooms[currentRoomID].players[thisPlayerID].username);
		var currentRoom = rooms[currentRoomID];
		UpdatePlayerValues(currentRoom);
	});

	socket.on('connectToRoom', function (data) {
		player.isHost = false;
		player.isSpectator = false;

		console.log('Connecting to room ' + data.instruction);
		console.log(
			'There are currently ' +
			Object.keys(rooms).length +
			' rooms active!'
		);
		var roomId = 'NA';
		console.log(rooms);
		for (var room in rooms) {
			if (rooms[room].id == data.instruction) {
				console.log('Room found!');
				roomId = room;
			}
		}

		if (roomId == 'NA') {
			console.log('Room does not exist!');
			socket.emit('receiveData', {
				action: "serverError|servererror-general-title|servererror-room-notexist|servererror-general-button|1"
			});
		} else {
			console.log('Room exists, so connect!');
			var currentRoom = rooms[roomId];
			if (!currentRoom.isOpen) {
				console.log('Room is not open!');
				socket.emit('receiveData', {
					action: "serverError|servererror-general-title|servererror-room-notopen|servererror-general-button|1"
				});
			} else if (currentRoom.isFull) {
				console.log('Room is full!');
				socket.emit('receiveData', {
					action: "serverError|servererror-general-title|servererror-room-isfull|servererror-general-button|1"
				});
			} else {
				currentRoomID = currentRoom.id;
				currentRoom.players[thisPlayerID] = player;
				currentRoom.sockets[thisPlayerID] = socket;

				currentRoom.isFull = Object.keys(currentRoom.players).length >= currentRoom.roomSettings.maxPlayerCount;
				console.log(
					"Room's players: " +
					Object.keys(currentRoom.players).length +
					"/" + currentRoom.roomSettings.maxPlayerCount
				);

				console.log('Successfully connected, now go to lobby!');
				socket.emit('receiveData', {
					action: "joinLobbyRoom|" + currentRoomID
				});
			}
		}
	});

	socket.on('connectToRandomRoom', function () {
		console.log('Connecting to random room ');

		if (currentRoomID == null) {
			var filtered = _.pickBy(rooms, function (x) {
				if (x != null) return x.roomSettings.isPublic && x.isOpen && !x.isFull;
			});

			console.log('Available rooms are: ');
			console.log(filtered);
			if (filtered == null || Object.keys(filtered).length == 0) {
				console.log('There are no public rooms!');
				socket.emit('receiveData', {
					action: "serverError|servererror-general-title|servererror-room-nopublic|servererror-general-button|1"
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
				currentRoom.isFull = Object.keys(currentRoom.players).length >= currentRoom.roomSettings.maxPlayerCount;
				console.log(
					"Room's players: " +
					Object.keys(currentRoom.players).length +
					"/" + currentRoom.roomSettings.maxPlayerCount
				);
				console.log('Successfully connected, now go to lobby!');
				socket.emit('receiveData', {
					action: "joinLobbyRoom|" + currentRoomID
				});
			}
		} else {
			socket.emit('receiveData', {
				action: "serverError|servererror-general-title|servererror-room-joiningroom|servererror-general-button|1"
			});
		}
	});

	socket.on('createRoom', function (data) {
		player.isHost = true;
		player.isSpectator = false;

		if (currentRoomID == null) {
			console.log('Creating room');
			var top = 99999,
				minLength = 4;
			var newRoomId = Math.floor(Math.random() * top);
			if (Object.keys(rooms).length > 1) {
				do {
					newRoomId = Math.floor(Math.random() * top);
				} while (rooms.find(x => x && x.rawId == newRoomId));
			}
			var currentRoom = new Room(newRoomId,
				Math.max(top.toString().length, minLength),
				data.settings.maxPlayerCount,
				data.settings.isOnline,
				data.settings.isPublic,
				data.settings.roundAmount,
				data.settings.pointsPerWin,
				data.settings.pointsToWin,
				data.settings.availableGames);
			console.log(
				'Created room of ID ' +
				currentRoom.id +
				'\nwith maxPlayerCount set to ' +
				currentRoom.roomSettings.maxPlayerCount +
				'\nwith public set to ' +
				currentRoom.roomSettings.isPublic +
				'\nwith roundAmount set to ' +
				currentRoom.roomSettings.roundAmount +
				'\nwith pointsPerWin set to ' +
				currentRoom.roomSettings.pointsPerWin +
				'\nwith pointsToWin set to ' +
				currentRoom.roomSettings.pointsToWin +
				'\nwith availableGames set to ' +
				currentRoom.roomSettings.availableGames
			);
			currentRoom.players[thisPlayerID] = player;
			currentRoom.sockets[thisPlayerID] = socket;

			currentRoomID = currentRoom.id;
			rooms[currentRoom.id] = currentRoom;

			console.log("Room created, now go to lobby!");
			socket.emit('receiveData', {
				action: "joinLobby|" + currentRoomID
			});
		} else {
			socket.emit('receiveData', {
				action: "serverError|servererror-general-title|servererror-room-joiningroom|servererror-general-button|1"
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
			rooms[currentRoomID].isFull = Object.keys(rooms[currentRoomID].players).length == rooms[currentRoomID].roomSettings.maxPlayerCount;
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
			rooms[currentRoomID].isFull = Object.keys(rooms[currentRoomID].players).length == rooms[currentRoomID].roomSettings.maxPlayerCount;
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
		playerAmount--;
		console.log('Successfully disconnected!');
	});

	socket.on('pingInfo', function () {
		socket.emit('receiveData', {
			id: thisPlayerID,
			action: "checkPing|",
		});
	})

	socket.on('getMultiplayerInfo', function () {
		socket.emit('receiveData', {
			id: thisPlayerID,
			action: "setMultiplayerInfo|" + playerAmount + "|" + Object.keys(rooms).length,
		});
	})

	socket.on('startGame', function () {
		var availableGames = [];
		var gameOrder = [];
		var currentIndex = 0;
		for (let index = 0; index < rooms[currentRoomID].roomSettings.availableGames.length; index++) {
			if (rooms[currentRoomID].roomSettings.availableGames[index]) {
				availableGames[currentIndex] = index;
				currentIndex++;
			}
		}

		rooms[currentRoomID].isOpen = false;
		currentIndex = 0;
		for (let index = 0; index < rooms[currentRoomID].roomSettings.roundAmount; index++) {
			var randomIndex = (availableGames.length * Math.random() << 0)
			gameOrder[currentIndex] = availableGames[randomIndex];
			currentIndex++;
		}

		for (var socketID in rooms[currentRoomID].sockets) {
			rooms[currentRoomID].sockets[socketID].emit('receiveData', {
				id: thisPlayerID,
				action: "startGame|" + gameOrder,
			});
		}
	})

	socket.on('updateLobbySettings', function (data) {
		if (currentRoomID != null) {
			rooms[currentRoomID].roomSettings = JSON.parse(data.instruction);
			rooms[currentRoomID].isFull = Object.keys(rooms[currentRoomID].players).length >= rooms[currentRoomID].roomSettings.maxPlayerCount;
			for (var socketID in rooms[currentRoomID].sockets) {
				rooms[currentRoomID].sockets[socketID].emit('receiveData', {
					id: thisPlayerID,
					action: "updateServerSettings|" + data.instruction,
				});
			}
		}
	})

	socket.on('sendInfo', function (data) {
		if (currentRoomID != null) {
			if (!data.instruction.includes("updatePlayerPosition")) {
				console.log('Info sent! - ' + data.instruction);
				console.log(
					'Broadcasting on room ' + rooms[currentRoomID].id + ' to ' +
					Object.keys(rooms[currentRoomID].sockets).length +
					' sockets!'
				);
			}

			if (data.instruction.includes("endGame")) {
				console.log("Game has ended!");
				rooms[currentRoomID].isOpen = true;
			}

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
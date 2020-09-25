const RoomSettings = require("./RoomSettings");

module.exports = class Room {
  constructor(roomNumber, codeLength, maxPlayerCount, isOnline, isPublic, roundAmount, pointsPerWin, pointsToWin, availableGames) {
    this.roomName = "";
    this.rawId = roomNumber;
    this.id = roomIdGenerator(roomNumber, codeLength);
    this.players = [];
    this.sockets = [];
    this.isOpen = true;
    this.isFull = false;
    this.roomSettings = new RoomSettings(maxPlayerCount, isOnline, isPublic, roundAmount, pointsPerWin, pointsToWin, availableGames);
  }
};

var roomIdGenerator = function (roomNumber, codeLength) {
  var prefix = "";
  for (let index = 0; index < codeLength - roomNumber.toString().length; index++) {
    prefix += "0";

  }
  return prefix + roomNumber.toString();
}
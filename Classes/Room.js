module.exports = class Room {
  constructor(roomNumber, codeLength) {
    this.roomName = "";
    this.rawId = roomNumber;
    this.id = roomIdGenerator(roomNumber, codeLength);
    this.players = [];
    this.sockets = [];
    this.isPublic = false;
    this.isOpen = true;
    this.isFull = false;
    this.roomSize = 6;
  }
};

var roomIdGenerator = function (roomNumber, codeLength) {
  var prefix = "";
  for (let index = 0; index < codeLength - roomNumber.toString().length; index++) {
    prefix += "0";

  }
  return prefix + roomNumber.toString();
}
var shortID = require("shortid");

module.exports = class Player {
  constructor() {
    this.username = "";
    this.id = shortID.generate();
    this.isHost = false;
    this.hatIndex = 0;
    this.headIndex = 0;
    this.bodyIndex = 0;
  }
};
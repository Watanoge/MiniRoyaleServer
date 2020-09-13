var shortID = require("shortid");

module.exports = class Player {
  constructor() {
    this.username = "";
    this.id = shortID.generate();
    this.isHost = false;
    this.isSpectator = false;
  }
};

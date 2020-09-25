module.exports = class RoomSettings {
    constructor(maxPlayerCount, isOnline, isPublic, roundAmount, pointsPerWin, pointsToWin, availableGames) {
        this.maxPlayerCount = maxPlayerCount;
        this.isOnline = isOnline;
        this.isPublic = isPublic;
        this.roundAmount = roundAmount;
        this.pointsPerWin = pointsPerWin;
        this.pointsToWin = pointsToWin;
        this.availableGames = availableGames;
        this.isOpen = true;
        this.isFull = false;
    }
};
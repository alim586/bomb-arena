var PendingGame = require("./entities/pending_game");
var MapInfo = require("./metadata/map_info");

var lobbySlots = [];
var lobbyId = -1;
var numLobbySlots = 7;

// This class contains all server-side logic related to hosting/joining games.
var Lobby = {
	getLobbySlots: function() {
		return lobbySlots;
	},

	getLobbyId: function() {
		return lobbyId;
	},

	getNumLobbySlots: function() {
		return numLobbySlots;
	},

	broadcastSlotStateUpdate: function(gameId, newState) {
		broadcastSlotStateUpdate(gameId, newState);
	},

	initialize: function() {
		for(var i = 0; i < numLobbySlots; i++) {
			lobbySlots.push(new PendingGame());
		}
	},

	onEnterLobby: function(data) {
		this.join(lobbyId);
		socket.sockets.in(lobbyId).emit("add slots", lobbySlots);
	},

	onHostGame: function(data) {
		lobbySlots[data.gameId].state = "settingup";
		this.gameId = data.gameId;
		broadcastSlotStateUpdate(data.gameId, "settingup");
	},

	onStageSelect: function(data) {
		lobbySlots[this.gameId].state = "joinable";
		lobbySlots[this.gameId].mapName = data.mapName;
		broadcastSlotStateUpdate(this.gameId, "joinable");
	},

	onEnterPendingGame: function(data) {
		var pendingGame = lobbySlots[data.gameId];
	
		this.leave(lobbyId);
		this.join(data.gameId);
	
		pendingGame.playerIds.push(this.id);
		this.gameId = data.gameId;
	
		this.emit("show current players", {numPlayers: pendingGame.playerIds.length});
		this.broadcast.to(data.gameId).emit("player joined");
	
		if(pendingGame.playerIds.length >= MapInfo[pendingGame.mapName].spawnLocations.length) {
			pendingGame.state = "full";
			broadcastSlotStateUpdate(data.gameId, "full");
		}
	},

	onLeavePendingGame: function(data) {
		leavePendingGame.call(this);
	}
};

function broadcastSlotStateUpdate(gameId, newState) {
	socket.sockets.in(lobbyId).emit("update slot", {gameId: gameId, newState: newState});
};

function leavePendingGame() {
	var lobbySlot = lobbySlots[this.gameId];

	this.leave(this.gameId);
	socket.sockets.in(this.gameId).emit("player left");
	lobbySlot.playerIds.splice(lobbySlot.playerIds.indexOf(this.id), 1);

	if(lobbySlot.playerIds.length == 0) {
		lobbySlot.state = "empty";
		socket.sockets.in(lobbyId).emit("update slot", {gameId: this.gameId, newState: "empty"});
	}

	if(lobbySlot.state == "full") {
		lobbySlot.state = "joinable";
		socket.sockets.in(lobbyId).emit("update slot", {gameId: this.gameId, newState: "joinable"});
	}
};

module.exports = Lobby;
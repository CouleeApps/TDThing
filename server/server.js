
const Colyseus = require("colyseus");
const http = require("http");
const TDMP = require("../public/javascripts/game");

class TDMPRoom extends Colyseus.Room {
  constructor() {
    super();
    this.maxClients = 2;

    this.board = new TDMP.Board(25, 33);
    this.gameState = new TDMP.GameState(this.board);

    this.topRegion = {
      x: 0,
      y: 0,
      width: this.board.width,
      height: 16
    };
    this.bottomRegion = {
      x: 0,
      y: 17,
      width: this.board.width,
      height: 16
    };

    this.initBoard();
  }

  initBoard() {
    this.board.createSpawners({x: 12, y: 0}, {x: 12, y: this.board.height - 1});
  }

  onInit(options) {
    console.log("BasicRoom created!", options);
    setInterval(() => this.tick(50), 50);
  }

  onJoin(client) {
    this.chat(`${client.sessionId} joined.`);
    let isTop = this.clients.length === 0 || !this.clients[0].isTop;
    client.isTop = isTop;
    client.clientState = new TDMP.ClientState(this.gameState);
    client.clientState.playableRegion = isTop ? this.topRegion : this.bottomRegion;
    this.sendSetup(client);
    this.sendBoard(client);
  }

  onLeave(client) {
    this.chat(`${ client.sessionId } left.`);
  }

  onMessage(client, data) {
    switch (data.type) {
      case "chat":
        this.chat(`(${client.sessionId}) ${data.value}`);
        break;
      case "addTower":
        if (this.gameState.towerTypes[data.value.type] === undefined)
          return;
        if (client.clientState.canPlaceTowerWithPath(data.value.origin, data.value.type)) {
          this.gameState.addTower(data.value.origin, data.value.type);
        }
        this.clients.forEach((c) => this.sendBoard(c));
        break;
      case "removeTower":
        if (this.gameState.towerTypes[data.value.type] === undefined)
          return;
        if (TDMP.inRect(client.clientState.playableRegion, data.value.origin)) {
          this.gameState.removeTower(data.value.origin);
        }
        this.clients.forEach((c) => this.sendBoard(c));
        break;
      case "spawnUnit":
        if (this.gameState.unitTypes[data.value.type] === undefined)
          return;
        this.gameState.spawnUnit(client.isTop ? "top" : "bottom", data.value.type);
        break;
    }
  }

  sendSetup(client) {
    this.send(client, {
      type: "setup",
      value: {
        board: {
          width: this.board.width,
          height: this.board.height
        },
        towerTypes: this.gameState.towerTypes,
        unitTypes: this.gameState.unitTypes,
        playableRegion: client.clientState.playableRegion
      }
    });
  }

  sendBoard(client) {
    this.send(client, {
      type: "board",
      value: {
        cells: this.board.cells,
        spawners: this.board.spawners,
      }
    });
    this.sendState(client);
  }

  sendState(client) {
    this.send(client, {
      type: "state",
      value: {
        towers: this.gameState.towers,
        units: this.gameState.units,
      }
    });
  }

  onDispose() {
    console.log("Dispose BasicRoom");
  }

  chat(message) {
    this.broadcast({
      type: "chat",
      value: message
    });
  }

  tick(deltaMS) {
    let updates = false;
    if (this.gameState.moveUnits(deltaMS)) {
      updates = true;
    }
    if (this.gameState.towerAttack(deltaMS)) {
      updates = true;
    }
    if (updates) {
      this.clients.forEach((c) => this.sendState(c));
    }
  }
}


module.exports = function(app) {
  const server = http.createServer(app);

  let gameServer = new Colyseus.Server({
    server
  });

  gameServer.register("tdmp", TDMPRoom);
  gameServer.listen(3020, "0.0.0.0");

  return function(err, req, res, next) {
  };
};
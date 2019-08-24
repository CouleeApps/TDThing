
const Colyseus = require("colyseus");
const http = require("http");
const TDMP = require("./game");
const Point = require("./math").Point;
const Rect = require("./math").Rect;
const Board = require("./board").Board;
const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const MapSchema = schema.MapSchema;

const GameState = TDMP.GameState;
const ClientState = TDMP.ClientState;

class TDMPState extends Schema {
  constructor() {
    super();

    this.board = new Board(25, 33);
    this.gameState = new GameState(this.board);
    this.topState = new ClientState(this.gameState, new Rect(0, 0, 25, 16));
    this.bottomState = new ClientState(this.gameState, new Rect(0, 17, 25, 16));
    this.clientStates = new MapSchema({
      top: this.topState,
      bottom: this.bottomState
    });
  }
}
schema.defineTypes(TDMPState, {
  gameState: GameState,
  clientStates: { map: ClientState }
});

class TDMPRoom extends Colyseus.Room {
  constructor() {
    super();

    this.setState(new TDMPState());
    this.maxClients = 2;

    this.initBoard();
  }

  initBoard() {
    this.state.board.createSpawners(new Point(12, 0), new Point(12, this.state.board.extent.y - 1));
  }

  onInit(options) {
    console.log("BasicRoom created!", options);
    setInterval(() => this.tick(50), 50);
  }

  onJoin(client) {
    this.chat(`${client.sessionId} joined.`);
    let isTop = this.clients.length === 0 || !this.clients[0].isTop;
    client.isTop = isTop;
    client.clientState = isTop ? this.state.topState : this.state.bottomState;
    this.sendSetup(client);
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
        if (this.state.gameState.towerTypes[data.value.type] === undefined)
          return;
        if (client.clientState.canPlaceTowerWithPath(data.value.origin, data.value.type)) {
          this.state.gameState.addTower(Point.from(data.value.origin), data.value.type, client.isTop ? "top" : "bottom");
        }
        break;
      case "removeTower":
        if (this.state.gameState.towerTypes[data.value.type] === undefined)
          return;
        if (TDMP.inRect(client.clientState.playableRegion, data.value.origin)) {
          this.state.gameState.removeTower(data.value.origin);
        }
        break;
      case "spawnUnit":
        if (this.state.gameState.unitTypes[data.value.type] === undefined)
          return;
        this.state.gameState.spawnUnit(client.isTop ? "top" : "bottom", data.value.type);
        break;
    }
  }

  sendSetup(client) {
    this.send(client, {
      type: "setup",
      value: {
        isTop: client.isTop
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
    // let events = [];
    // events = events.concat(this.state.gameState.moveUnits(deltaMS));
    // events = events.concat(this.state.gameState.towerAttack(deltaMS));
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
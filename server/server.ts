import {Client, Room} from "colyseus";
import http from "http";
import {GameState, ClientState} from "./game";
import {Point, Rect} from "./math";
import {Board} from "./board";
import {Schema, MapSchema, type} from "@colyseus/schema";

class TDMPState extends Schema {
  @type(GameState)
  gameState: GameState;
  topState: ClientState;
  bottomState: ClientState;
  @type({ map: ClientState })
  clientStates: MapSchema<ClientState>;

  constructor() {
    super();

    this.gameState = new GameState(new Board(25, 33));
    this.topState = new ClientState(this.gameState, "top", new Rect(0, 0, 25, 16));
    this.bottomState = new ClientState(this.gameState, "bottom", new Rect(0, 17, 25, 16));
    this.clientStates = new MapSchema({
      top: this.topState,
      bottom: this.bottomState
    });
  }

  get board() {
    return this.gameState.board;
  }
}

export class TDMPRoom extends Room {
  clientMap: Map<Client, ClientState>;
  tickSchedule: NodeJS.Timeout | undefined;
  constructor() {
    super();

    this.clientMap = new Map<Client, ClientState>();
    this.setState(new TDMPState());
    this.maxClients = 2;

    this.initBoard();
  }

  initBoard() {
    this.state.board.createSpawners(new Point(12, 0), new Point(12, this.state.board.extent.y - 1));
  }

  onInit(options: any) {
    console.log("BasicRoom created!", options);
    this.tickSchedule = setInterval(() => this.tick(50), 50);
  }

  onJoin(client: Client) {
    this.chat(`${client.sessionId} joined.`);
    let isTop = this.clients.length === 0 || !this.isTop(this.clients[0]);
    this.clientMap.set(client, isTop ? this.state.topState : this.state.bottomState);
    this.sendSetup(client);
  }

  onLeave(client: Client) {
    this.chat(`${ client.sessionId } left.`);
  }

  onMessage(client: Client, data: any) {
    switch (data.type) {
      case "chat":
        this.chat(`(${client.sessionId}) ${data.value}`);
        break;
      case "addTower":
        if (this.state.gameState.towerTypes[data.value.type] === undefined)
          return;
        // @ts-ignore
        if (this.clientMap.get(client).canPlaceTowerWithPath(data.value.origin, data.value.type)) {
          this.state.gameState.addTower(Point.from(data.value.origin), data.value.type, this.isTop(client) ? "top" : "bottom");
        }
        break;
      case "removeTower":
        if (this.state.gameState.towerTypes[data.value.type] === undefined)
          return;
        // @ts-ignore
        if (this.clientMap.get(client).playableRegion.contains(data.value.origin)) {
          this.state.gameState.removeTower(data.value.origin);
        }
        break;
      case "spawnUnit":
        if (this.state.gameState.unitTypes[data.value.type] === undefined)
          return;
        this.state.gameState.spawnUnit(this.isTop(client) ? "top" : "bottom", data.value.type);
        break;
    }
  }

  isTop(client: Client) {
    let state = this.clientMap.get(client);
    if (state === undefined) {
      return false;
    } else {
      return state.side === "top";
    }
  }

  sendSetup(client: Client) {
    this.send(client, {
      type: "setup",
      value: {
        isTop: this.isTop(client)
      }
    });
  }

  onDispose() {
    console.log("Dispose BasicRoom");
    if (this.tickSchedule !== undefined) {
      clearInterval(this.tickSchedule);
    }
  }

  chat(message: string) {
    this.broadcast({
      type: "chat",
      value: message
    });
  }

  tick(deltaMS: number) {
    this.state.gameState.moveUnits(deltaMS);
    this.state.gameState.towerAttack(deltaMS);
  }
}

import {Client, Room} from "colyseus";
import {ClientState, GameState, RoundState} from "./game";
import {Point, Rect} from "./math";
import {Board} from "./board";
import {MapSchema, Schema, type} from "@colyseus/schema";

class TDMPState extends Schema {
  @type(GameState)
  gameState: GameState;
  topState: ClientState;
  bottomState: ClientState;

  constructor() {
    super();

    this.gameState = new GameState(new Board(25, 33));
    this.topState = new ClientState(this.gameState, "top", new Rect(0, 0, 25, 16));
    this.bottomState = new ClientState(this.gameState, "bottom", new Rect(0, 17, 25, 16));
    this.gameState.clientStates = new MapSchema({
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

  get top(): ClientState {
    return this.state.topState;
  }

  get bottom(): ClientState {
    return this.state.bottomState;
  }

  get gameState(): GameState {
    return this.state.gameState;
  }

  initBoard() {
    this.state.board.createSpawners(new Point(12, 0), new Point(12, this.state.board.extent.y - 1));
  }

  onCreate(options: any) {
    console.log("BasicRoom created!", options);
    this.tickSchedule = setInterval(() => this.tick(50), 50);
  }

  onJoin(client: Client) {
    this.chat("Server", `Player connected.`);
    let isTop = this.clientMap.size === 0 || !this.isTop(this.clientMap.keys().next().value);
    let state = isTop ? this.top : this.bottom;
    state.reset();
    this.clientMap.set(client, state);
    this.sendSetup(client);
    if (this.clientMap.size === 2) {
      this.gameState.roundState = RoundState.Constructing;
    }
  }

  onLeave(client: Client) {
    this.chat("Server", `${ this.getUsername(client) } left.`);
    this.clientMap.delete(client);
  }

  onMessage(client: Client, data: any) {
    switch (data.type) {
      case "setUsername": {
        this.clientMap.get(client)!.username = data.value.username;
        this.chat("Server", `${ this.getUsername(client) } joined chat.`);
        break;
      }
      case "chat": {
        this.chat(this.getUsername(client)!, data.value.text);
        break;
      }
      case "addTower": {
        if (!this.clientMap.get(client)!.canPlace())
          return;
        if (this.gameState.towerTypes[data.value.type] === undefined)
          return;
        if (this.clientMap.get(client)!.canPlaceTowerWithPath(Point.from(data.value.origin), data.value.type)) {
          let cost = this.gameState.towerTypes[data.value.type].cost;
          if (this.clientMap.get(client)!.canSpend(cost)) {
            this.gameState.addTower(Point.from(data.value.origin), data.value.type, this.getSide(client));
            this.clientMap.get(client)!.spend(cost);
          }
        }
        break;
      }
      case "removeTower": {
        let tower = this.gameState.getTower(data.value.id);
        if (tower !== undefined && tower.side === this.getSide(client)) {
          let cost = this.gameState.towerTypes[tower.type].cost;
            this.clientMap.get(client)!.spend(-cost);
          this.gameState.removeTower(tower);
        }
        break;
      }
      case "setTargetStyle": {
        let tower = this.gameState.getTower(data.value.id);
        if (tower !== undefined && tower.side === this.getSide(client) &&
          this.gameState.targetStyles.indexOf(data.value.style) !== -1) {
          tower.targetStyle = data.value.style;
        }
        break;
      }
      case "queueUnit": {
        if (!this.clientMap.get(client)!.canPlace())
          return;
        if (this.gameState.unitTypes[data.value.type] === undefined)
          return;
        let cost = this.gameState.unitTypes[data.value.type].cost;
        if (this.clientMap.get(client)!.canSpend(cost)) {
          this.clientMap.get(client)!.unitQueue.push(data.value.type);
          this.clientMap.get(client)!.spend(cost);
          // this.gameState.spawnUnit(this.getSide(client), data.value.type);
        }
        break;
      }
      case "ready": {
        if (this.clientMap.get(client)!.canPlace()) {
          this.clientMap.get(client)!.ready = true;
          this.gameState.checkStart();
        }
        break;
      }
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

  getSide(client: Client) {
    return this.isTop(client) ? "top" : "bottom";
  }

  getUsername(client: Client) {
    let name = this.clientMap.get(client)!.username;
    if (name === undefined) {
      return "Player";
    } else {
      return name;
    }
  }

  sendSetup(client: Client) {
    this.send(client, {
      type: "setup",
      value: {
        side: this.getSide(client)
      }
    });
  }

  onDispose() {
    console.log("Dispose BasicRoom");
    if (this.tickSchedule !== undefined) {
      clearInterval(this.tickSchedule);
    }
  }

  chat(from: string, text: string) {
    this.broadcast({
      type: "chat",
      value: {
        from: from,
        text: text
      }
    });
  }

  tick(deltaMS: number) {
    this.gameState.updateRound(deltaMS);
  }
}

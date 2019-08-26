import {Schema, type} from "@colyseus/schema";
import {Point} from "./math";
import {GameState} from "./game";

export class Unit extends Schema {
  gameState: GameState;
  @type("number")
  id: number;
  @type("string")
  type: string;
  @type("string")
  side: string;
  @type("number")
  health: number;
  @type("number")
  accumulatedMS: number;
  @type(Point)
  extent: Point;
  @type(Point)
  origin: Point;
  @type(Point)
  destination: Point;
  @type(Point)
  position: Point;
  @type(Point)
  nextPosition: Point;
  path: Point[];
  @type("number")
  pathPosition: number;
  @type("boolean")
  deleted: boolean;

  constructor(gameState: GameState, id: number, side: string, type: string) {
    super();
    this.gameState = gameState;

    let path = this.gameState.board.getSolution(side);

    // Units are always 1x1
    let extent = new Point(1, 1);
    let position = path[0].clone();

    this.id = id;
    this.type = type;
    this.side = side;
    this.health = this.gameState.unitTypes[type].health;
    this.accumulatedMS = 0;
    this.extent = extent;
    this.origin = position.clone();
    this.destination = path[path.length - 1].clone();
    this.position = position.clone();
    this.nextPosition = path[1].clone();
    this.path = path;
    this.pathPosition = 0;
    this.deleted = false;
  }

  updatePath() {
    let path = this.gameState.board.solution.findPath(this.nextPosition, this.destination);
    this.path = this.path.slice(0, this.pathPosition + 1).concat(path);
  }

  get center() {
    return new Point(this.position.x + this.extent.x / 2, this.position.y + this.extent.y / 2);
  }
}

export class UnitType extends Schema {
  @type("string")
  name: string;
  @type("number")
  msPerMove: number;
  @type("number")
  health: number;
  @type("number")
  damagePerSecond: number;
  constructor(name: string, msPerMove: number, health: number, damagePerSecond: number) {
    super();
    this.name = name;
    this.msPerMove = msPerMove;
    this.health = health;
    this.damagePerSecond = damagePerSecond;
  }
}

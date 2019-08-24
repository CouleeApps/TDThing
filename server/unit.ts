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
  center: Point;
  @type(Point)
  origin: Point;
  @type(Point)
  destination: Point;
  @type(Point)
  position: Point;
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
    let position = path[0];

    this.id = id;
    this.type = type;
    this.side = side;
    this.health = this.gameState.unitTypes[type].health;
    this.accumulatedMS = 0;
    this.extent = extent;
    this.center = new Point(position.x + extent.x / 2, position.y + extent.y / 2);
    this.origin = position;
    this.destination = path[path.length - 1];
    this.position = position;
    this.pathPosition = 0;
    this.deleted = false;
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
  damagePerMS: number;
  constructor(name: string, msPerMove: number, health: number, damagePerMS: number) {
    super();
    this.name = name;
    this.msPerMove = msPerMove;
    this.health = health;
    this.damagePerMS = damagePerMS;
  }
}

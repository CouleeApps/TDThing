import {Schema, ArraySchema, type} from "@colyseus/schema";
import {Point} from "./math";
import {Cell} from "./board";
import {GameState} from "./game";
import {Unit} from "./unit";

export class Tower extends Schema {
  gameState: GameState;
  @type("number")
  id: number;
  @type(Point)
  origin: Point;
  @type(Point)
  center: Point;
  @type(Point)
  extent: Point;
  @type("string")
  side: string;
  @type("string")
  type: string;
  @type([ Point ])
  cells: ArraySchema<Point>;
  @type("number")
  health: number;
  reachable: Point[];
  inRange: Unit[];

  constructor(gameState: GameState, id: number, origin: Point, type: string, side: string) {
    super();
    this.gameState = gameState;

    let extent = this.gameState.towerTypes[type].extent.clone();
    let cells = new ArraySchema();
    this.gameState.getTowerPoses(origin, type).forEach((pos: any) => {
      cells.push(pos);
      this.gameState.board.setCell(pos, Cell.towerCell(id));
    });

    this.id = id;
    this.origin = origin;
    this.center = new Point(origin.x + extent.x / 2, origin.y + extent.y / 2);
    this.extent = extent;
    this.side = side;
    this.type = type;
    this.cells = cells;
    this.health = this.gameState.towerTypes[type].health;
    this.inRange = [];
    this.reachable = this.gameState.towerTypes[this.type].reachable.map((pos: Point) => {
      return new Point(pos.x + this.origin.x, pos.y + this.origin.y);
    }).filter((pos: Point) => {
      return (pos.x >= 0) && (pos.y >= 0) && (pos.x < this.gameState.board.extent.x) && (pos.y < this.gameState.board.extent.y);
    });
  }
}

export class TowerType extends Schema {
  @type("string")
  name: string;
  @type(Point)
  extent: Point;
  @type("number")
  health: number;
  @type("number")
  damagePerMS: number;
  @type("number")
  range: number;
  @type([ Point ])
  reachable: ArraySchema<Point>;

  constructor(name: string, extent: Point, health: number, damagePerMS: number, range: number) {
    super();
    this.name = name;
    this.extent = extent;
    this.health = health;
    this.damagePerMS = damagePerMS;
    this.range = range;

    // Find effective area
    let reachable = new ArraySchema();
    let origin = new Point(
      extent.x / 2,
      extent.y / 2
    );
    // Rough outer bounds to check
    let bounds = {
      min: new Point(
        Math.floor(origin.x - range),
        Math.floor(origin.y - range)
      ),
      max: new Point(
        Math.ceil(origin.x + range),
        Math.ceil(origin.y + range)
      ),
    };
    // Filter to only include tiles in range
    for (let x = bounds.min.x; x < bounds.max.x; x ++) {
      for (let y = bounds.min.y; y < bounds.max.y; y ++) {
        if (((x + 0.5) - origin.x) * ((x + 0.5) - origin.x) + ((y + 0.5) - origin.y) * ((y + 0.5) - origin.y) <= range * range) {
          reachable.push(new Point(x, y));
        }
      }
    }
    this.reachable = reachable;
  }
}
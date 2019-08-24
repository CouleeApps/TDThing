import {Point, Rect} from "./math";
import {Tower, TowerType} from "./tower";
import {Unit, UnitType} from "./unit";
import {Board, Cell} from "./board";
import {Schema, ArraySchema, MapSchema, type} from "@colyseus/schema";

export class GameState extends Schema {
  @type([ Tower ])
  towers: ArraySchema<Tower>;
  @type([ Unit ])
  units: ArraySchema<Unit>;
  @type(Board)
  board: Board;
  @type({ map: TowerType })
  towerTypes: MapSchema<TowerType>;
  @type({ map: UnitType })
  unitTypes: MapSchema<TowerType>;
  lastTowerId: number;
  lastUnitId: number;

  constructor(board: Board) {
    super();
    this.towers = new ArraySchema();
    this.units = new ArraySchema();
    this.board = board;

    this.towerTypes = new MapSchema({
      "normal": new TowerType(
        "normal",
        new Point(2, 2),
        100,
        0.001,
        5
      ),
      "chonky": new TowerType(
        "chonky",
        new Point(3, 3),
        400,
        0.1,
        3
      ),
      // TODO: More of these
    });
    this.unitTypes = new MapSchema({
      "normal": new UnitType(
        "normal",
        100,
        25,
        0.001
      ),
      // TODO: More of these
    });
    this.lastTowerId = 1;
    this.lastUnitId = 1;
    this.init();
  }

  init() {
  }

  getTower(towerId: number) {
    return this.towers.find((tower) => tower.id === towerId);
  }

  getTowerByPos(boardPos: Point) {
    for (let i = 0; i < this.towers.length; i ++) {
      let tower = this.towers[i];
      let on = tower.cells.some(function(pos) {
        return pos.equals(boardPos);
      });
      if (on) {
        return tower;
      }
    }
    return null;
  }

  addTower(boardPos: Point, type: string, side: string) {
    let tower = new Tower(this, this.lastTowerId++, boardPos, type, side);
    this.towers.push(tower);
    return tower;
  }

  removeTower(boardPos: Point) {
    let tower = this.getTowerByPos(boardPos);
    if (tower !== null) {
      tower.cells.forEach((pos: Point) => {
        this.board.setCell(pos, Cell.emptyCell());
      });
      this.towers.splice(this.towers.indexOf(tower), 1);
    }
  }

  getTowerPoses(origin: Point, type: string) {
    return this.board.getSquarePoses(origin, this.towerTypes[type].extent);
  }

  // If a tower can be placed unobstructed at the given location
  canPlaceTower(origin: Point, type: string) {
    if (origin.x < 0 || origin.y < 0 || origin.x >= this.board.extent.x || origin.y >= this.board.extent.y) {
      return false;
    }
    let poses = this.getTowerPoses(origin, type);
    return poses.every((pos) => {
      let state = this.board.getCell(pos).state;
      return state === "" || state === "hover";
    });
  }

  getUnit(unitId: number) {
    return this.units.find((unit) => unit.id === unitId);
  }

  spawnUnit(side: string, type: string) {
    let unit = new Unit(this, this.lastUnitId++, side, type);
    this.units.push(unit);
    return unit;
  }

  destroyUnit(unit: Unit) {
    this.units.splice(this.units.indexOf(unit), 1);
  }

  // Returns a list of events that happened
  moveUnits(deltaMS: number) {
    let events: any[] = [];
    let topPath = this.board.getSolution("top");
    let bottomPath = this.board.getSolution("bottom");
    this.units.forEach((unit) => {
      let path = (unit.side === "top" ? topPath : bottomPath);
      unit.accumulatedMS += deltaMS;
      if (unit.accumulatedMS >= this.unitTypes[unit.type].msPerMove) {
        // TODO: Interpolate? Might do that in interface
        unit.accumulatedMS -= this.unitTypes[unit.type].msPerMove;
        unit.pathPosition += 1;
        unit.position = path[unit.pathPosition];

        events.push({
          type: "unitMove",
          data: {
            unit: unit
          }
        });

        if (unit.position === unit.destination || unit.pathPosition >= path.length) {
          // TODO: Damage to base
          this.destroyUnit(unit);
          events.push({
            type: "unitDestroy",
            data: {
              unit: unit
            }
          });
          return;
        }

        // Update which towers we're in range of
        // this.towers.forEach((tower) => {
        //   let range = tower
        // });
      }
    });

    return events;
  }

  // Returns a list of events that happened
  towerAttack(deltaMS: number) {
    let events: any[] = [];
    this.towers.forEach((tower) => {
      let reaching: Unit[] = [];
      reaching = reaching.concat(this.units).filter((unit) => {
        return unit.side !== tower.side && tower.reachable.some((pos: Point) => pos.equals(unit.position));
      });
      if (reaching.length > 0) {
        // TODO: Different targeting methods
        reaching.sort((u1, u2) => {
          return u1.center.distSq(tower.center) - u2.center.distSq(tower.center);
        });
        // Attack one at once
        let unit = reaching[0];

        unit.health -= this.towerTypes[tower.type].damagePerMS * deltaMS;
        events.push({
          type: "towerAttack",
          data: {
            tower: tower.id,
            unit: unit.id
          }
        });
        if (unit.health <= 0) {
          this.destroyUnit(unit);
          events.push({
            type: "unitDestroy",
            data: {
              unit: unit
            }
          });
        }
      }
    });
    return events;
  }
}

export class ClientState extends Schema {
  gameState: GameState;
  @type("string")
  side: string;
  @type(Rect)
  playableRegion: Rect;
  @type("number")
  health: number;

  constructor(gameState: GameState, side: string, region: Rect) {
    super();
    this.gameState = gameState;
    this.side = side;
    this.playableRegion = region;
    this.health = 100;
  }

  // If the player can place a tower, unobstructed, maintaining the path
  canPlaceTowerWithPath(boardPos: Point, type: string) {
    if (!this.gameState.canPlaceTower(boardPos, type)) {
      return false;
    }
    let poses = this.gameState.getTowerPoses(boardPos, type);
    if (poses.some((pos) => !this.playableRegion.contains(pos))) {
      return false;
    }
    this.gameState.addTower(boardPos, type, "");
    let path = this.gameState.board.getSolution();
    let can = path.length > 0;
    this.gameState.removeTower(boardPos);
    return can;
  }
}

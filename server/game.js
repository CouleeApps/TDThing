const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const ArraySchema = schema.ArraySchema;
const MapSchema = schema.MapSchema;
const Point = require("./math").Point;
const Rect = require("./math").Rect;
const Cell = require("./board").Cell;
const Board = require("./board").Board;
const Unit = require("./unit").Unit;
const UnitType = require("./unit").UnitType;
const Tower = require("./tower").Tower;
const TowerType = require("./tower").TowerType;

class GameState extends Schema {
  constructor(board) {
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

  getTower(towerId) {
    return this.towers.find((tower) => tower.id === towerId);
  }

  getTowerByPos(boardPos) {
    for (let i = 0; i < this.towers.length; i ++) {
      let tower = this.towers[i];
      let on = tower.cells.some(function(pos) {
        return eq(pos, boardPos);
      });
      if (on) {
        return tower;
      }
    }
    return null;
  }

  addTower(boardPos, type, side) {
    let tower = new Tower(this, this.lastTowerId++, boardPos, type, side);
    this.towers.push(tower);
    return tower;
  }

  removeTower(boardPos) {
    let tower = this.getTowerByPos(boardPos);
    tower.cells.forEach((pos) => {
      this.board.setCell(pos, Cell.emptyCell());
    });
    this.towers.splice(this.towers.indexOf(tower), 1);
  }

  getTowerReachable(tower) {
    return this.towerTypes[tower.type].reachable.map((pos) => {
      return new Point(pos.x + tower.origin.x, pos.y + tower.origin.y);
    }).filter((pos) => {
      return (pos.x >= 0) && (pos.y >= 0) && (pos.x < this.board.extent.x) && (pos.y < this.board.extent.y);
    });
  }

  getTowerPoses(origin, type) {
    return this.board.getSquarePoses(origin, this.towerTypes[type].extent);
  }

  // If a tower can be placed unobstructed at the given location
  canPlaceTower(origin, type) {
    if (origin.x < 0 || origin.y < 0 || origin.x >= this.board.extent.x || origin.y >= this.board.extent.y) {
      return false;
    }
    let poses = this.getTowerPoses(origin, type);
    return poses.every((pos) => {
      let state = this.board.getCell(pos).state;
      return state === "" || state === "hover";
    });
  }

  getUnit(unitId) {
    return this.units.find((unit) => unit.id === unitId);
  }

  spawnUnit(side, type) {
    let unit = new Unit(this, this.lastUnitId++, side, type);
    this.units.push(unit);
    return unit;
  }

  destroyUnit(unit) {
    this.units.splice(this.units.indexOf(unit), 1);
  }

  // Returns a list of events that happened
  moveUnits(deltaMS) {
    let events = [];
    let topPath = this.board.getSolution("top");
    let bottomPath = this.board.getSolution("bottom").reverse();
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

        if (unit.position === unit.destination) {
          // TODO: Damage to base
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

  // Returns a list of events that happened
  towerAttack(deltaMS) {
    let events = [];
    this.towers.forEach((tower) => {
      let reaching = this.units.filter((unit) => {
        return unit.side !== tower.side && this.getTowerReachable(tower).some((pos) => eq(pos, unit.position));
      });
      if (reaching.length > 0) {
        // TODO: Different targeting methods
        reaching.sort((u1, u2) => {
          return distSq(u1.center, tower.center) - distSq(u2.center, tower.center);
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
schema.defineTypes(GameState, {
  towers: [ Tower ],
  units: [ Unit ],
  board: Board,
  towerTypes: { map: TowerType },
  unitTypes: { map: UnitType },
});

class ClientState extends Schema {
  constructor(gameState, region) {
    super();
    this.gameState = gameState;
    this.playableRegion = region;
    this.health = 100;
  }

  // If the player can place a tower, unobstructed, maintaining the path
  canPlaceTowerWithPath(boardPos, type) {
    if (!this.gameState.canPlaceTower(boardPos, type)) {
      return false;
    }
    let poses = this.gameState.getTowerPoses(boardPos, type);
    if (poses.some((pos) => !inRect(this.playableRegion, pos))) {
      return false;
    }
    this.gameState.addTower(boardPos, type, "");
    let path = this.gameState.board.getSolution();
    let can = path.length > 0;
    this.gameState.removeTower(boardPos, type);
    return can;
  }
}
schema.defineTypes(ClientState, {
  playableRegion: Rect,
  health: "number",
});

function eq(p0, p1) {
  return p0.x === p1.x && p0.y === p1.y;
}
function distSq(p0, p1) {
  return (p0.x - p1.x) * (p0.x - p1.x) + (p0.y - p1.y) * (p0.y - p1.y);
}
function inRect(rect, p) {
  return p.x >= rect.x && p.y >= rect.y && p.x < rect.x + rect.width && p.y < rect.y + rect.height;
}

module.exports = {
  GameState: GameState,
  ClientState: ClientState,
  eq: eq,
  distSq: distSq,
  inRect: inRect,
};

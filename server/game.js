const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const ArraySchema = schema.ArraySchema;
const MapSchema = schema.MapSchema;

class Point extends Schema {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }
  static from(object) {
    return new Point(object.x, object.y);
  }
  get width() {
    return this.x;
  }
  get height() {
    return this.y;
  }
  set width(x) {
    this.x = x;
  }
  set height(y) {
    this.y = y;
  }
}
schema.defineTypes(Point, {
  x: "number",
  y: "number"
});

class Cell extends Schema {
  constructor(state) {
    super();

    this.state = state;
    this.tower = 0;
  }
  static emptyCell() {
    return new Cell("");
  }
  static spawnerCell() {
    return new Cell("spawner");
  }
  static towerCell(towerId) {
    let cell = new Cell("tower");
    cell.tower = towerId;
    return cell;
  }
}
schema.defineTypes(Cell, {
  state: "string",
  tower: "number"
});

class Board extends Schema {
  constructor(width, height) {
    super();

    this.extent = new Point(width, height);
    this.cells = new ArraySchema();
    this.spawners = new ArraySchema(new Point(0, 0), new Point(0, 0));
    this._solution = [];
    this.init();
  }
  init() {
    // Init the board with nothing
    this.cells = new ArraySchema();
    for (let y = 0; y < this.extent.height; y++) {
      for (let x = 0; x < this.extent.width; x++) {
        this.cells.push(Cell.emptyCell());
      }
    }
    this._updateSolution();
  }

  // Lazy functions
  getCell(boardPos) {
    return this.cells[boardPos.x + this.extent.width * boardPos.y];
  }
  setCell(boardPos, cell) {
    this.cells[boardPos.x + this.extent.width * boardPos.y] = cell;
    this._updateSolution();
  }

  getSquarePoses(boardPos, extent) {
    if (boardPos.x >= this.extent.width - extent.x) {
      boardPos.x = this.extent.width - extent.x;
    }
    if (boardPos.y >= this.extent.height - extent.y) {
      boardPos.y = this.extent.height - extent.y;
    }

    let poses = [];
    for (let y = 0; y < extent.y; y ++) {
      for (let x = 0; x < extent.x; x ++) {
        poses.push(new Point(
          boardPos.x + x,
          boardPos.y + y
        ));
      }
    }

    return poses;
  }

  createSpawners(s1, s2) {
    this.setCell(new Point(s1.x, s1.y), Cell.spawnerCell());
    this.setCell(new Point(s2.x, s2.y), Cell.spawnerCell());
    this.spawners = new ArraySchema(s1, s2);
  }

  getSolution() {
    return this._solution;
  }

  _updateSolution() {
    let toKey = (pos) => pos.x + " " + pos.y;
    // BFS!
    let queue = [this.spawners[0]];
    let paths = {};
    paths[toKey(this.spawners[0])] = [this.spawners[0]];

    while (queue.length > 0) {
      let top = queue.shift();
      if (top === this.spawners[1]) {
        break;
      }
      let neighbors = [
        new Point(top.x + 1, top.y),
        new Point(top.x - 1, top.y),
        new Point(top.x, top.y + 1),
        new Point(top.x, top.y - 1),
      ].filter((n) => {
        // In bounds
        if (n.x < 0 || n.y < 0 || n.x >= this.extent.width || n.y >= this.extent.height)
          return false;
        // Searched
        if (paths[toKey(n)] !== undefined)
          return false;
        // Pending
        if (queue.indexOf(n) !== -1)
          return false;
        // Taken
        return this.getCell(n).state === "" || this.getCell(n).state === "spawner";
      });
      neighbors.forEach((n) => {
        queue.push(n);
        paths[toKey(n)] = [top].concat(paths[toKey(top)]);
      });
    }
    if (paths[toKey(this.spawners[1])] === undefined) {
      this._solution = [];
    } else {
      this._solution = [this.spawners[1]].concat(paths[toKey(this.spawners[1])]);
    }
  }
}
schema.defineTypes(Board, {
  extent: Point,
  spawners: [ Point ],
  cells: [ Cell ]
});

class Tower extends Schema {
  constructor(gameState, id, origin, type, side) {
    super();
    this.gameState = gameState;

    let extent = this.gameState.towerTypes[type].extent;
    let cells = new ArraySchema();
    this.gameState.getTowerPoses(origin, type).forEach((pos) => {
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
  }
}
schema.defineTypes(Tower, {
  id: "number",
  origin: Point,
  center: Point,
  extent: Point,
  side: "string",
  type: "string",
  cells: [ Point ],
  health: "number",
});

class Unit extends Schema {
  constructor(gameState, id, side, type) {
    super();
    this.gameState = gameState;

    let path = this.gameState.board.getSolution();
    if (side === "top") {
      path.reverse();
    }
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
  }
}
schema.defineTypes(Unit, {
  id: "number",
  type: "string",
  side: "string",
  health: "number",
  accumulatedMS: "number",
  extent: Point,
  center: Point,
  origin: Point,
  destination: Point,
  position: Point,
  pathPosition: "number",
});

class TowerType extends Schema {
  constructor(name, extent, health, damagePerMS, range) {
    super();
    this.name = name;
    this.extent = extent;
    this.health = health;
    this.damagePerMS = damagePerMS;
    this.range = range;
  }
}
schema.defineTypes(TowerType, {
  name: "string",
  extent: Point,
  health: "number",
  damagePerMS: "number",
  range: "number",
});

class UnitType extends Schema {
  constructor(name, msPerMove, health, damagePerMS) {
    super();
    this.name = name;
    this.msPerMove = msPerMove;
    this.health = health;
    this.damagePerMS = damagePerMS;
  }
}
schema.defineTypes(UnitType, {
  name: "string",
  msPerMove: "number",
  health: "number",
  damagePerMS: "number",
});

class GameState extends Schema {
  constructor(board) {
    super();
    this.towers = new ArraySchema();
    this.units = new ArraySchema();
    this.board = board;

    this.towerTypes = {
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
    };
    this.unitTypes = {
      "normal": new UnitType(
        "normal",
        100,
        25,
        0.001
      ),
      // TODO: More of these
    };
    this.lastTowerId = 1;
    this.lastUnitId = 1;
    this.init();
  }

  init() {
    // Find all towers' effective areas
    Object.keys(this.towerTypes).forEach((type) => {
      let reachable = [];
      let range = this.towerTypes[type].range;
      let origin = new Point(
        this.towerTypes[type].extent.x / 2,
        this.towerTypes[type].extent.y / 2
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
      this.towerTypes[type].reachable = reachable;
    });
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
      return (pos.x >= 0) && (pos.y >= 0) && (pos.x < this.board.extent.width) && (pos.y < this.board.extent.height);
    });
  }

  getTowerPoses(origin, type) {
    return this.board.getSquarePoses(origin, this.towerTypes[type].extent);
  }

  // If a tower can be placed unobstructed at the given location
  canPlaceTower(origin, type) {
    if (origin.x < 0 || origin.y < 0 || origin.x >= this.board.extent.width || origin.y >= this.board.extent.height) {
      return false;
    }
    let poses = this.getTowerPoses(origin, type);
    return poses.every((pos) => {
      let state = this.board.getCell(pos).state;
      return state === "" || state === "hover";
    });
  }

  tryBump(boardPos, type) {
    let bumps = [
      boardPos,
      new Point(boardPos.x - 1, boardPos.y),
      new Point(boardPos.x, boardPos.y - 1),
      new Point(boardPos.x - 1, boardPos.y - 1)
    ];
    for (let i = 0; i < bumps.length; i ++) {
      if (this.canPlaceTower(bumps[i], type)) {
        return bumps[i];
      }
    }
    return boardPos;
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
    let fpath = this.board.getSolution();
    let rpath = this.board.getSolution().reverse();
    this.units.forEach((unit) => {
      let path = (unit.side === "top" ? rpath : fpath);
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
  // towerTypes: "",
  // unitTypes: "",
});

class ClientState {
  constructor(gameState) {
    this.gameState = gameState;
    this.mouseState = "placing";
    this.lastMouse = new Point(0, 0);
    this.playableRegion = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    this.placeType = "normal";
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
  Point: Point,
  Board: Board,
  GameState: GameState,
  ClientState: ClientState,
  eq: eq,
  distSq: distSq,
  inRect: inRect,
};

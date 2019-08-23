
class Board {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.spawners = [{x: 0, y: 0}, {x: 0, y: 0}];
    this.init();
  }
  init() {
    // Init the board with nothing
    for (let x = 0; x < this.width; x++) {
      let row = [];
      for (let y = 0; y < this.height; y++) {
        row.push(emptyCell());
      }
      this.cells.push(row);
    }
  }

  // Lazy functions
  getCell(boardPos) {
    return this.cells[boardPos.x][boardPos.y];
  }
  setCell(boardPos, cell) {
    this.cells[boardPos.x][boardPos.y] = cell;
  }

  getSquarePoses(boardPos, extent) {
    if (boardPos.x >= this.width - extent.x) {
      boardPos.x = this.width - extent.x;
    }
    if (boardPos.y >= this.height - extent.y) {
      boardPos.y = this.height - extent.y;
    }

    let poses = [];
    for (let y = 0; y < extent.y; y ++) {
      for (let x = 0; x < extent.x; x ++) {
        poses.push({
          x: boardPos.x + x,
          y: boardPos.y + y
        })
      }
    }

    return poses;
  }

  createSpawners(s1, s2) {
    this.cells[s1.x][s1.y].state = "spawner";
    this.cells[s2.x][s2.y].state = "spawner";
    this.spawners = [s1, s2];
  }

  getSolution() {
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
        {x: top.x + 1, y: top.y},
        {x: top.x - 1, y: top.y},
        {x: top.x, y: top.y + 1},
        {x: top.x, y: top.y - 1},
      ].filter((n) => {
        // In bounds
        if (n.x < 0 || n.y < 0 || n.x >= this.width || n.y >= this.height)
          return false;
        // Searched
        if (paths[toKey(n)] !== undefined)
          return false;
        // Pending
        if (queue.indexOf(n) !== -1)
          return false;
        // Taken
        return this.getCell(n).state === "empty" || this.getCell(n).state === "spawner";
      });
      neighbors.forEach((n) => {
        queue.push(n);
        paths[toKey(n)] = [top].concat(paths[toKey(top)]);
      });
    }
    if (paths[toKey(this.spawners[1])] === undefined) {
      return [];
    }
    return [this.spawners[1]].concat(paths[toKey(this.spawners[1])]);
  }
}

class GameState {
  constructor(board) {
    this.towers = [];
    this.units = [];
    this.board = board;

    this.towerTypes = {
      "normal": {
        extent: {
          x: 2,
          y: 2
        },
        health: 100,
        damagePerMS: 0.001,
        range: 5
      },
      "chonky": {
        extent: {
          x: 3,
          y: 3
        },
        health: 400,
        damagePerMS: 0.001,
        range: 3
      },
    };
    this.unitTypes = {
      "normal": {
        msPerMove: 100,
        health: 25,
        damagePerMS: 0.001
      }
    };
    this.init();
  }

  init() {
    // Find all towers' effective areas
    Object.keys(this.towerTypes).forEach((type) => {
      let reachable = [];
      let range = this.towerTypes[type].range;
      let origin = {
        x: this.towerTypes[type].extent.x / 2,
        y: this.towerTypes[type].extent.y / 2
      };
      // Rough outer bounds to check
      let bounds = {
        min: {
          x: Math.floor(origin.x - range),
          y: Math.floor(origin.y - range)
        },
        max: {
          x: Math.ceil(origin.x + range),
          y: Math.ceil(origin.y + range)
        },
      };
      // Filter to only include tiles in range
      for (let x = bounds.min.x; x < bounds.max.x; x ++) {
        for (let y = bounds.min.y; y < bounds.max.y; y ++) {
          if (((x + 0.5) - origin.x) * ((x + 0.5) - origin.x) + ((y + 0.5) - origin.y) * ((y + 0.5) - origin.y) <= range * range) {
            reachable.push({x: x, y: y});
          }
        }
      }
      this.towerTypes[type].reachable = reachable;
    });
  }

  getTower(boardPos) {
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

  createTower(origin, type) {
    let extent = this.towerTypes[type].extent;
    let cells = this.getTowerPoses(origin, type);
    cells.forEach((pos) => {
      this.board.setCell(pos, towerCell(origin));
    });

    let reachable = this.towerTypes[type].reachable.map((pos) => {
      return {x: pos.x + origin.x, y: pos.y + origin.y};
    }).filter((pos) => {
      return (pos.x >= 0) && (pos.y >= 0) && (pos.x < this.board.width) && (pos.y < this.board.height);
    });

    return {
      origin: origin,
      center: {
        x: origin.x + extent.x / 2,
        y: origin.y + extent.y / 2,
      },
      extent: extent,
      type: type,
      cells: cells,
      reachable: reachable,
      health: this.towerTypes[type].health,
    };
  }

  addTower(boardPos, type) {
    let tower = this.createTower(boardPos, type);
    this.towers.push(tower);
    return tower;
  }

  removeTower(boardPos) {
    let tower = this.getTower(boardPos);
    tower.cells.forEach((pos) => {
      this.board.setCell(pos, emptyCell());
    });
    this.towers.splice(this.towers.indexOf(tower), 1);
  }

  getTowerPoses(origin, type) {
    return this.board.getSquarePoses(origin, this.towerTypes[type].extent);
  }

  // If a tower can be placed unobstructed at the given location
  canPlaceTower(origin, type) {
    if (origin.x < 0 || origin.y < 0 || origin.x >= this.board.width || origin.y >= this.board.height) {
      return false;
    }
    let poses = this.getTowerPoses(origin, type);
    return poses.every((pos) => {
      let state = this.board.getCell(pos).state;
      return state === "empty" || state === "hover";
    });
  }

  tryBump(boardPos, type) {
    let bumps = [
      boardPos,
      {x: boardPos.x - 1, y: boardPos.y},
      {x: boardPos.x, y: boardPos.y - 1},
      {x: boardPos.x - 1, y: boardPos.y - 1}
    ];
    for (let i = 0; i < bumps.length; i ++) {
      if (this.canPlaceTower(bumps[i], type)) {
        return bumps[i];
      }
    }
    return boardPos;
  }

  spawnUnit(side, type) {
    let path = this.board.getSolution();
    if (side === "top") {
      path.reverse();
    }
    let unit = {
      type: type,
      side: side,
      path: path,
      health: this.unitTypes[type].health,
      accumulatedMS: 0,
      extent: {x: 1, y: 1},
      origin: path[0],
      destination: path[path.length - 1],
      position: path[0],
      pathPosition: 0
    };
    this.units.push(unit);
  }

  destroyUnit(unit) {
    this.units.splice(this.units.indexOf(unit), 1);
  }

  moveUnits(deltaMS) {
    let updated = false;
    this.units.forEach((unit) => {
      unit.accumulatedMS += deltaMS;
      if (unit.accumulatedMS >= this.unitTypes[unit.type].msPerMove) {
        unit.accumulatedMS -= this.unitTypes[unit.type].msPerMove;
        unit.pathPosition += 1;
        unit.position = unit.path[unit.pathPosition];
        unit.center =

        updated = true;

        if (unit.position === unit.destination) {
          this.destroyUnit(unit);
        }
      }
    });

    return updated;
  }

  towerAttack(deltaMS) {
    let updated = false;
    this.towers.forEach((tower) => {
      let reaching = this.units.filter((unit) => {
        return tower.reachable.some((pos) => eq(pos, unit.position));
      });
      if (reaching.length > 0) {
        updated = true;

        reaching.sort((u1, u2) => {
          distSq(u1.position)
        })

        reaching.forEach((unit) => {
          unit.health -= this.towerTypes[tower.type].damagePerMS * deltaMS;
          if (unit.health <= 0) {
            this.destroyUnit(unit);
          }
        });
      }
    });
    return updated;
  }
}

class ClientState {
  constructor(gameState) {
    this.gameState = gameState;
    this.mouseState = "placing";
    this.lastMouse = {x: 0, y: 0};
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
    this.gameState.addTower(boardPos, type);
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

function emptyCell() {
  return {
    state: "empty",
  };
}

function emptyOpponentCell() {
  return {
    state: "opponent",
  };
}

function towerCell(towerOrigin) {
  return {
    state: "tower",
    towerOrigin: towerOrigin
  };
}

if (typeof(module) !== "undefined") {
  module.exports = {
    Board: Board,
    GameState: GameState,
    ClientState: ClientState,
    eq: eq,
    inRect: inRect,
    emptyCell: emptyCell,
    emptyOpponentCell: emptyOpponentCell,
    towerCell: towerCell,
  }
}

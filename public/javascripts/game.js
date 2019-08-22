
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

  getSquarePoses(boardPos) {
    if (boardPos.x >= this.width - 2) {
      boardPos.x = this.width - 2;
    }
    if (boardPos.y >= this.height - 2) {
      boardPos.y = this.height - 2;
    }

    let squarePoses = [
      boardPos,
      {x: boardPos.x + 1, y: boardPos.y},
      {x: boardPos.x, y: boardPos.y + 1},
      {x: boardPos.x + 1, y: boardPos.y + 1},
    ];

    return squarePoses;
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
    let backPointers = {};
    backPointers[toKey(this.spawners[0])] = [this.spawners[0]];

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
        if (backPointers[toKey(n)] !== undefined)
          return false;
        // Pending
        if (queue.indexOf(n) !== -1)
          return false;
        // Taken
        return board.getCell(n).state === "empty" || board.getCell(n).state === "spawner";
      });
      neighbors.forEach((n) => {
        queue.push(n);
        backPointers[toKey(n)] = [top].concat(backPointers[toKey(top)]);
      });
    }
    if (backPointers[toKey(this.spawners[1])] === undefined) {
      return [];
    }
    return [this.spawners[1]].concat(backPointers[toKey(this.spawners[1])]);
  }
}

class State {
  constructor(board) {
    this.mouseState = "placing";
    this.lastMouse = {x: 0, y: 0};
    this.playableRegion = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    this.towers = [];
    this.board = board;
  }

  init() {

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

  createTower(origin) {
    let cells = this.board.getSquarePoses(origin);
    this.board.getSquarePoses(origin).forEach((pos) => {
      this.board.setCell(pos, towerCell(origin));
    });
    return {
      origin: origin,
      type: "normal",
      cells: cells
    };
  }

  addTower(boardPos) {
    let tower = this.createTower(boardPos);
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

  canPlaceTowerWithPath(boardPos) {
    if (!canPlaceTower(boardPos)) {
      return false;
    }
    this.addTower(boardPos);
    let path = this.board.getSolution();
    let can = path.length > 0;
    this.removeTower(boardPos);
    return can;
  }

}

function eq(p0, p1) {
  return p0.x === p1.x && p0.y === p1.y;
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

function canPlaceTower(boardPos) {
  if (boardPos.x < 0 || boardPos.y < 0 || boardPos.x >= board.width || boardPos.y >= board.height) {
    return false;
  }
  let squarePoses = board.getSquarePoses(boardPos);

  if (squarePoses.some((pos) => !inRect(state.playableRegion, pos))) {
    return false;
  }

  return squarePoses.every((pos) => {
    let state = board.getCell(pos).state;
    return state === "empty" || state === "hover";
  });
}

function tryBump(boardPos) {
  let bumps = [
    boardPos,
    {x: boardPos.x - 1, y: boardPos.y},
    {x: boardPos.x, y: boardPos.y - 1},
    {x: boardPos.x - 1, y: boardPos.y - 1}
  ];
  for (let i = 0; i < bumps.length; i ++) {
    if (canPlaceTower(bumps[i])) {
      return bumps[i];
    }
  }
  return boardPos;
}

if (typeof(module) !== "undefined") {
  module.exports = {
    Board: Board,
    State: State,
    eq: eq,
    inRect: inRect,
    emptyCell: emptyCell,
    emptyOpponentCell: emptyOpponentCell,
    towerCell: towerCell,
    canPlaceTower: canPlaceTower,
    tryBump: tryBump,
  }
}

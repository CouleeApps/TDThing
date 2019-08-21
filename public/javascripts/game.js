
// <editor-fold desc="Init">

const board = {
  width: 1,
  height: 1,
  cells: []
};

function initBoard() {
  // Init the board with nothing
  for (let x = 0; x < board.width; x++) {
    let row = [];
    for (let y = 0; y < board.height; y++) {
      row.push(emptyCell());
    }
    board.cells.push(row);
  }
}

// </editor-fold>

// <editor-fold desc="Helper functions">


// Lazy functions
function getCell(boardPos) {
  return board.cells[boardPos.x][boardPos.y];
}
function setCell(boardPos, cell) {
  board.cells[boardPos.x][boardPos.y] = cell;
}

function eq(p0, p1) {
  return p0.x === p1.x && p0.y === p1.y;
}
function inRect(rect, p) {
  return p.x >= rect.x && p.y >= rect.y && p.x < rect.x + rect.width && p.y < rect.y + rect.height;
}

// </editor-fold>

let state = {
  mouseState: "placing",
  lastMouse: {x: 0, y: 0},
  playableRegion: {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  },
  towers: []
};

function initState() {
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

function getSquarePoses(boardPos) {
  if (boardPos.x >= board.width - 2) {
    boardPos.x = board.width - 2;
  }
  if (boardPos.y >= board.height - 2) {
    boardPos.y = board.height - 2;
  }

  let squarePoses = [
    boardPos,
    {x: boardPos.x + 1, y: boardPos.y},
    {x: boardPos.x, y: boardPos.y + 1},
    {x: boardPos.x + 1, y: boardPos.y + 1},
  ];

  return squarePoses;
}

function canPlace(boardPos) {
  if (boardPos.x < 0 || boardPos.y < 0 || boardPos.x >= board.width || boardPos.y >= board.height) {
    return false;
  }
  let squarePoses = getSquarePoses(boardPos);

  if (squarePoses.some((pos) => !inRect(state.playableRegion, pos))) {
    return false;
  }

  return squarePoses.every(function(pos) {
    let state = getCell(pos).state;
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
    if (canPlace(bumps[i])) {
      return bumps[i];
    }
  }
  return boardPos;
}

function resolveTower(boardPos) {
  for (let i = 0; i < state.towers.length; i ++) {
    let tower = state.towers[i];
    let on = tower.cells.some(function(pos) {
      return eq(pos, boardPos);
    });
    if (on) {
      return tower;
    }
  }
  return null;
}

function createTower(origin) {
  let cells = getSquarePoses(origin);
  getSquarePoses(origin).forEach(function (pos) {
    setCell(pos, towerCell(origin));
  });
  return {
    origin: origin,
    type: "normal",
    cells: cells
  };
}

function addTower(boardPos) {
  let tower = createTower(boardPos);
  state.towers.push(tower);
  return tower;
}

function removeTower(boardPos) {
  let tower = resolveTower(boardPos);
  tower.cells.forEach(function (pos) {
    setCell(pos, emptyCell());
  });
  state.towers.splice(state.towers.indexOf(tower), 1);
}

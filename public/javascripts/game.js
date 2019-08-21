
// <editor-fold desc="Init">

let canvas = $("canvas");

/* @var CanvasRenderingContext2D context */
let context = canvas[0].getContext('2d');

const board = {
  width: 24,
  height: 32,
  cells: []
};
const extent = {
  width: 480,
  height: 640
};

// Init the board with nothing
for (let x = 0; x < board.width; x ++) {
  let row = [];
  for (let y = 0; y < board.height; y ++) {
    row.push({
      state: "empty",
      fillStyle: y >= (board.height / 2) ? "#000" : "#444",
      strokeStyle: "#fff"
    });
  }
  board.cells.push(row);
}

// </editor-fold>

// <editor-fold desc="Helper functions">

// Board position -> canvas rect
function getCellRect(boardPos) {
  return {
    x: boardPos.x * (extent.width / board.width),
    y: boardPos.y * (extent.height / board.height),
    width: (extent.width / board.width),
    height: (extent.height / board.height)
  };
}
// Canvas position -> board position
function getBoardPos(canvasPos) {
  return {
    x: Math.floor(canvasPos.x / (extent.width / board.width)),
    y: Math.floor(canvasPos.y / (extent.height / board.height)),
  };
}
// Lazy function
function getCell(boardPos) {
  return board.cells[boardPos.x][boardPos.y];
}

function eq(p0, p1) {
  return p0.x === p1.x && p0.y === p1.y;
}

canvas.width(extent.width);
canvas.height(extent.height);
canvas.attr({
  width: extent.width,
  height: extent.height
});

function drawCell(cell, boardPos) {
  let rect = getCellRect(boardPos);
  if (cell.fillStyle !== "") {
    context.fillStyle = cell.fillStyle;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  if (cell.strokeStyle !== "") {
    context.strokeStyle = cell.strokeStyle;
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}

function drawCanvas() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, extent.width, extent.height);

  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      let cell = getCell({x: x, y: y});
      drawCell(cell, {x: x, y: y});
    }
  }
}

// </editor-fold>

drawCanvas();

let hoverCellState = {
  state: "empty",
  fillStyle: "rgba(255,255,255,0.5)",
  strokeStyle: ""
};

let hoverTowerState = {
  state: "empty",
  fillStyle: "rgba(0,0,0,0.3)",
  strokeStyle: ""
};

let state = {
  mouseState: "placing",
  lastMouse: {x: 0, y: 0},
  towers: []
};

function drawState() {
  drawCanvas();


  let currentTower = resolveTower(state.lastMouse);
  if (currentTower) {
    getSquarePoses(state.lastMouse).forEach(function (pos) {
      drawCell(hoverTowerState, pos);
    });
  } else if (canPlace(state.lastMouse)) {
    getSquarePoses(state.lastMouse).forEach(function (pos) {
      drawCell(hoverCellState, pos);
    });
  }
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
  if (boardPos.y < board.height / 2) {
    return false;
  }

  let squarePoses = getSquarePoses(boardPos);
  return squarePoses.every(function(pos) {
    let state = getCell(pos).state;
    return state === "empty" || state === "hover";
  });
}

function tryBump(boardPos) {
  if (canPlace(boardPos)) {
    return boardPos;
  }
  if (canPlace({x: boardPos.x - 1, y: boardPos.y})) {
    return {x: boardPos.x - 1, y: boardPos.y};
  }
  if (canPlace({x: boardPos.x, y: boardPos.y - 1})) {
    return {x: boardPos.x, y: boardPos.y - 1};
  }
  if (canPlace({x: boardPos.x - 1, y: boardPos.y - 1})) {
    return {x: boardPos.x - 1, y: boardPos.y - 1};
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

function addTower(boardPos) {
  let cells = getSquarePoses(boardPos);
  getSquarePoses(boardPos).forEach(function (pos) {
    let cell = getCell(pos);
    cell.state = "click";
    cell.fillStyle = "#0f0";
  });
  let tower = {
    origin: boardPos,
    type: "normal",
    cells: cells
  };
  state.towers.push(tower);
  return tower;
}

function removeTower(boardPos) {
  let tower = resolveTower(boardPos);
  tower.cells.forEach(function (pos) {
    let cell = getCell(pos);
    cell.state = "empty";
    cell.fillStyle = "#000";
  });
  state.towers.splice(state.towers.indexOf(tower), 1);
}

canvas.mousemove(function(e) {
  let boardPos = getBoardPos({x: e.offsetX, y: e.offsetY});
  boardPos = tryBump(boardPos);

  if (!canPlace(boardPos)) {
    let tower = resolveTower(boardPos);
    if (tower !== null) {
      boardPos = tower.origin;
    }
  }

  state.lastMouse = boardPos;
  drawState();
});

canvas.mousedown(function(e) {
  let boardPos = getBoardPos({x: e.offsetX, y: e.offsetY});
  boardPos = tryBump(boardPos);

  let tower = resolveTower(boardPos);
  if (tower === null) {
    if (canPlace(boardPos)) {
      //Create Tower
      addTower(boardPos);
    }
  } else {
    //Delete Tower
    removeTower(boardPos);
    boardPos = tower.origin;
  }

  state.lastMouse = boardPos;
  drawState();
});

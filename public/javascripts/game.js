
class Point {
  constructor(x, y) {
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

function eq(p0, p1) {
  return p0.x === p1.x && p0.y === p1.y;
}
function distSq(p0, p1) {
  return (p0.x - p1.x) * (p0.x - p1.x) + (p0.y - p1.y) * (p0.y - p1.y);
}
function inRect(rect, p) {
  return p.x >= rect.x && p.y >= rect.y && p.x < rect.x + rect.width && p.y < rect.y + rect.height;
}

function board() {
  return gameState().board;
}
function gameState() {
  return room.state.gameState;
}
function clientState() {
  return room.state.clientStates[isTop ? "top" : "bottom"];
}

function getCell(board, pos) {
  return board.cells[pos.x + board.extent.x * pos.y];
}

function getTowerByPos(gameState, boardPos) {
  for (let i = 0; i < gameState.towers.length; i ++) {
    let tower = gameState.towers[i];
    if (tower.deleted)
      continue;
    let on = tower.cells.some(function(pos) {
      return eq(pos, boardPos);
    });
    if (on) {
      return tower;
    }
  }
  return null;
}

function getSquarePoses(board, boardPos, extent) {
  if (boardPos.x >= board.extent.x - extent.x) {
    boardPos.x = board.extent.x - extent.x;
  }
  if (boardPos.y >= board.extent.y - extent.y) {
    boardPos.y = board.extent.y - extent.y;
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

function getTowerPoses(gameState, origin, type) {
  return getSquarePoses(gameState.board, origin, gameState.towerTypes[type].extent);
}

function getTowerReachable(gameState, tower) {
  return gameState.towerTypes[tower.type].reachable.map((pos) => {
    return new Point(pos.x + tower.origin.x, pos.y + tower.origin.y);
  }).filter((pos) => {
    return (pos.x >= 0) && (pos.y >= 0) && (pos.x < gameState.board.extent.x) && (pos.y < gameState.board.extent.y);
  });
}

function canPlaceTower(gameState, origin, type) {
  if (origin.x < 0 || origin.y < 0 || origin.x >= gameState.board.extent.x || origin.y >= gameState.board.extent.y) {
    return false;
  }
  let poses = getTowerPoses(gameState, origin, type);
  return poses.every((pos) => {
    let state = getCell(gameState.board, pos).state;
    return state === "" || state === "hover";
  });
}

function tryBump(gameState, boardPos, type) {
  let bumps = [
    boardPos,
    new Point(boardPos.x - 1, boardPos.y),
    new Point(boardPos.x, boardPos.y - 1),
    new Point(boardPos.x - 1, boardPos.y - 1)
  ];
  for (let i = 0; i < bumps.length; i ++) {
    if (canPlaceTower(gameState, bumps[i], type)) {
      return bumps[i];
    }
  }
  return boardPos;
}

// If the player can place a tower, unobstructed, maintaining the path
function canPlaceTowerWithPath(clientState, boardPos, type) {
  if (!canPlaceTower(gameState(), boardPos, type)) {
    return false;
  }
  let poses = getTowerPoses(gameState(), boardPos, type);
  if (poses.some((pos) => !inRect(clientState.playableRegion, pos))) {
    return false;
  }
  // gameState().addTower(boardPos, type, "");
  // let path = board().getSolution();
  // let can = path.length > 0;
  // gameState().removeTower(boardPos, type);
  // return can;
  return true;
}

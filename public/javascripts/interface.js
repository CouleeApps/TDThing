
let canvas = $("canvas");

/* @var CanvasRenderingContext2D context */
let context = canvas[0].getContext('2d');

const extent = new Point(480, 640);

let interfaceState = {
  lastMouse: new Point(0, 0),
  placeType: "normal",
};

const styles = {
  "hoverCell": (context, rect) => {
    context.fillStyle = "rgba(255,255,255,0.5)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "hoverTower": (context, rect) => {
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "towerRange": (context, rect) => {
    context.fillStyle = "rgba(255,0,0,0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "opponent": (context, rect) => {
    context.fillStyle = "rgba(255,255,255,0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "error": (context, rect) => {
    context.fillStyle = "rgba(255, 0, 0, 0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "empty": (context, rect) => {
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
  "tower": (context, rect) => {
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "path": (context, rect) => {
    context.fillStyle = "rgba(0, 0, 255, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
  "spawner": (context, rect) => {
    context.fillStyle = "rgba(255, 0, 0, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
};

const towerStyles = {
  "normal": (tower, context, rect) => {
    context.fillStyle = "rgba(0, 255, 0, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
  "chonky": (tower, context, rect) => {
    context.fillStyle = "rgba(255, 0, 255, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
};

const unitStyles = {
  "normal": (unit, context, rect) => {
    let alpha = unit.health / gameState().unitTypes[unit.type].health;
    context.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
};

// Board position -> canvas rect
function getCellRect(boardPos) {
  return {
    x: boardPos.x * (extent.x / board().extent.x),
    y: boardPos.y * (extent.y / board().extent.y),
    width: (extent.x / board().extent.x),
    height: (extent.y / board().extent.y)
  };
}
function getTowerRect(tower) {
  return {
    x: tower.origin.x * (extent.x / board().extent.x),
    y: tower.origin.y * (extent.y / board().extent.y),
    width: tower.extent.x * (extent.x / board().extent.x),
    height: tower.extent.y * (extent.y / board().extent.y)
  };
}
// Canvas position -> board position
function getBoardPos(canvasPos) {
  return new Point(
    Math.floor(canvasPos.x / (extent.x / board().extent.x)),
    Math.floor(canvasPos.y / (extent.y / board().extent.y)),
  );
}

function initCanvas() {
  canvas.width(extent.x);
  canvas.height(extent.y);
  canvas.attr({
    width: extent.x,
    height: extent.y
  });
}

function initInterface() {
  initCanvas();
  $("#towerTypes").empty();
  Object.keys(gameState().towerTypes).forEach((type) => {
    let button = $("<button></button>")
      .text(type)
      .click(() => {
        interfaceState.placeType = type;
        drawState();
      });
    $("#towerTypes").append(button);
  });
  $("#unitTypes").empty();
  Object.keys(gameState().unitTypes).forEach((type) => {
    let button = $("<button></button>")
      .text(type)
      .click(() => {
        room.send({
          type: "spawnUnit",
          value: {
            type: type
          }
        })
      });
    $("#unitTypes").append(button);
  });
}

function drawCell(state, boardPos) {
  let rect = getCellRect(boardPos);
  let style = styles[state];
  if (style !== undefined) {
    style(context, rect);
  }
}

function drawTower(tower) {
  let rect = getTowerRect(tower);
  let style = towerStyles[tower.type];
  if (style !== undefined) {
    style(tower, context, rect);
  }
}

function drawUnit(unit) {
  let rect = getCellRect(unit.position);
  let style = unitStyles[unit.type];
  if (style !== undefined) {
    style(unit, context, rect);
  }
}

function drawCanvas() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, extent.x, extent.y);

  for (let y = 0; y < board().extent.y; y++) {
    for (let x = 0; x < board().extent.x; x++) {
      let cell = getCell(board(), new Point(x, y));
      drawCell(cell.state || "empty", new Point(x, y));
    }
  }
}

function drawState() {
  drawCanvas();

  for (let y = 0; y < board().extent.y; y ++) {
    for (let x = 0; x < board().extent.x; x ++) {
      let boardPos = new Point(x, y);
      if (!inRect(clientState().playableRegion, boardPos)) {
        drawCell("opponent", boardPos);
      }
    }
  }

  gameState().towers.filter((tower) => !tower.deleted).forEach(drawTower);
  gameState().units.filter((tower) => !tower.deleted).forEach(drawUnit);

  let currentTower = getTowerByPos(gameState(), interfaceState.lastMouse);
  if (currentTower) {
    getTowerPoses(gameState(), interfaceState.lastMouse, currentTower.type).forEach((pos) => {
      drawCell("hoverTower", pos);
    });
    getTowerReachable(gameState(), currentTower).forEach((pos) => {
      drawCell("towerRange", pos);
    });
  } else if (canPlaceTower(gameState(), interfaceState.lastMouse, interfaceState.placeType)) {
    let type = canPlaceTowerWithPath(clientState(), interfaceState.lastMouse, interfaceState.placeType) ? "hoverCell" : "error";
    getTowerPoses(gameState(), interfaceState.lastMouse, interfaceState.placeType).forEach((pos) => {
      drawCell(type, pos);
    });
    gameState().towerTypes[interfaceState.placeType].reachable.map((pos) => {
      return new Point(pos.x + interfaceState.lastMouse.x, pos.y + interfaceState.lastMouse.y);
    }).filter((pos) => {
      return (pos.x >= 0) && (pos.y >= 0) && (pos.x < board().extent.x) && (pos.y < board().extent.y);
    }).forEach((pos) => {
      drawCell("towerRange", pos);
    });
  }
}

canvas.mousemove((e) => {
  let boardPos = getBoardPos(new Point(e.offsetX, e.offsetY));
  boardPos = tryBump(gameState(), boardPos, interfaceState.placeType);

  if (canPlaceTower(gameState(), boardPos, interfaceState.placeType)) {
  } else {
    let tower = getTowerByPos(gameState(), boardPos);
    if (tower !== null) {
      boardPos = tower.origin;
    }
  }

  interfaceState.lastMouse = boardPos;
  drawState();
});

canvas.mousedown((e) => {
  let boardPos = getBoardPos(new Point(e.offsetX, e.offsetY));
  boardPos = tryBump(gameState(), boardPos, interfaceState.placeType);

  let tower = getTowerByPos(gameState(), boardPos);
  if (tower === null) {
    if (canPlaceTowerWithPath(clientState(), interfaceState.lastMouse, interfaceState.placeType)) {
      //Create Tower
      room.send({
        type: "addTower",
        value: {
          origin: boardPos,
          type: interfaceState.placeType
        }
      });
    }
  } else {
    //Delete Tower
    boardPos = tower.origin;
    room.send({
      type: "removeTower",
      value: {
        origin: boardPos,
        type: interfaceState.placeType
      }
    });
  }

  interfaceState.lastMouse = boardPos;
  drawState();
});

$(document.body).keydown((e) => {
  if (e.keyCode === 13) {
    let path = board().getSolution();

    path.forEach((pos) => {
      drawCell("path", pos);
    });
  }
});

// Debug only
$("#lazyTop").click((e) => {
  let towers = [{x: 13, y: 0}, {x: 10, y: 0}, {x: 13, y: 2}, {x: 11, y: 3}, {x: 9, y: 3}, {x: 7, y: 3}, {x: 5, y: 3}, {x: 3, y: 3}, {x: 1, y: 3}, {x: 1, y: 1}, {x: 4, y: 0}, {x: 7, y: 1}, {x: 0, y: 6}, {x: 2, y: 6}, {x: 8, y: 6}, {x: 14, y: 5}, {x: 16, y: 3}, {x: 16, y: 1}, {x: 19, y: 0}, {x: 18, y: 3}, {x: 20, y: 3}, {x: 22, y: 3}, {x: 22, y: 1}, {x: 23, y: 6}, {x: 21, y: 6}, {x: 19, y: 6}, {x: 17, y: 6}, {x: 12, y: 8}, {x: 15, y: 8}, {x: 12, y: 10}, {x: 14, y: 11}, {x: 16, y: 11}, {x: 18, y: 9}, {x: 20, y: 9}, {x: 22, y: 9}, {x: 23, y: 14}, {x: 22, y: 11}, {x: 21, y: 14}, {x: 19, y: 14}, {x: 19, y: 12}, {x: 17, y: 14}, {x: 15, y: 14}, {x: 13, y: 14}, {x: 11, y: 13}, {x: 9, y: 11}, {x: 5, y: 11}, {x: 3, y: 11}, {x: 1, y: 9}, {x: 0, y: 14}, {x: 2, y: 14}, {x: 4, y: 14}, {x: 6, y: 14}, {x: 8, y: 14}, {x: 1, y: 11}, {x: 10, y: 6}, {x: 12, y: 6}, {x: 9, y: 9}, {x: 7, y: 11}, {x: 6, y: 8}, {x: 4, y: 8}, {x: 5, y: 5}];
  towers.forEach((pos) => {
    //Create Tower
    room.send({
      type: "addTower",
      value: {
        origin: pos,
        type: interfaceState.placeType
      }
    });
  });
});

$("#lazyBottom").click((e) => {
  let towers = [{x: 10, y: 0}, {x: 13, y: 0}, {x: 10, y: 2}, {x: 12, y: 3}, {x: 14, y: 3}, {x: 16, y: 3}, {x: 18, y: 3}, {x: 20, y: 3}, {x: 22, y: 3}, {x: 22, y: 1}, {x: 19, y: 0}, {x: 16, y: 1}, {x: 23, y: 6}, {x: 21, y: 6}, {x: 15, y: 6}, {x: 9, y: 5}, {x: 7, y: 3}, {x: 7, y: 1}, {x: 4, y: 0}, {x: 5, y: 3}, {x: 3, y: 3}, {x: 1, y: 3}, {x: 1, y: 1}, {x: 0, y: 6}, {x: 2, y: 6}, {x: 4, y: 6}, {x: 6, y: 6}, {x: 11, y: 8}, {x: 8, y: 8}, {x: 11, y: 10}, {x: 9, y: 11}, {x: 7, y: 11}, {x: 5, y: 9}, {x: 3, y: 9}, {x: 1, y: 9}, {x: 0, y: 14}, {x: 1, y: 11}, {x: 2, y: 14}, {x: 4, y: 14}, {x: 4, y: 12}, {x: 6, y: 14}, {x: 8, y: 14}, {x: 10, y: 14}, {x: 12, y: 13}, {x: 14, y: 11}, {x: 18, y: 11}, {x: 20, y: 11}, {x: 22, y: 9}, {x: 23, y: 14}, {x: 21, y: 14}, {x: 19, y: 14}, {x: 17, y: 14}, {x: 15, y: 14}, {x: 22, y: 11}, {x: 13, y: 6}, {x: 11, y: 6}, {x: 14, y: 9}, {x: 16, y: 11}, {x: 17, y: 8}, {x: 19, y: 8}, {x: 18, y: 5}, {x: 10, y: 31}, {x: 13, y: 31}, {x: 10, y: 29}, {x: 12, y: 28}, {x: 14, y: 28}, {x: 16, y: 28}, {x: 18, y: 28}, {x: 20, y: 28}, {x: 22, y: 28}, {x: 22, y: 30}, {x: 19, y: 31}, {x: 16, y: 30}, {x: 23, y: 25}, {x: 21, y: 25}, {x: 15, y: 25}, {x: 9, y: 26}, {x: 7, y: 28}, {x: 7, y: 30}, {x: 4, y: 31}, {x: 5, y: 28}, {x: 3, y: 28}, {x: 1, y: 28}, {x: 1, y: 30}, {x: 0, y: 25}, {x: 2, y: 25}, {x: 4, y: 25}, {x: 6, y: 25}, {x: 11, y: 23}, {x: 8, y: 23}, {x: 11, y: 21}, {x: 9, y: 20}, {x: 7, y: 20}, {x: 5, y: 22}, {x: 3, y: 22}, {x: 1, y: 22}, {x: 0, y: 17}, {x: 1, y: 20}, {x: 2, y: 17}, {x: 4, y: 17}, {x: 4, y: 19}, {x: 6, y: 17}, {x: 8, y: 17}, {x: 10, y: 17}, {x: 12, y: 18}, {x: 14, y: 20}, {x: 18, y: 20}, {x: 20, y: 20}, {x: 22, y: 22}, {x: 23, y: 17}, {x: 21, y: 17}, {x: 19, y: 17}, {x: 17, y: 17}, {x: 15, y: 17}, {x: 22, y: 20}, {x: 13, y: 25}, {x: 11, y: 25}, {x: 14, y: 22}, {x: 16, y: 20}, {x: 17, y: 23}, {x: 19, y: 23}, {x: 18, y: 26}];
  towers.forEach((pos) => {
    //Create Tower
    room.send({
      type: "addTower",
      value: {
        origin: pos,
        type: interfaceState.placeType
      }
    });
  });
});

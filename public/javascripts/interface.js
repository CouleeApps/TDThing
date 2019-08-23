
let canvas = $("canvas");

/* @var CanvasRenderingContext2D context */
let context = canvas[0].getContext('2d');

const extent = {
  width: 480,
  height: 640
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
    let alpha = unit.health / gameState.unitTypes[unit.type].health;
    context.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
};

// Board position -> canvas rect
function getCellRect(boardPos) {
  return {
    x: boardPos.x * (extent.width / board.width),
    y: boardPos.y * (extent.height / board.height),
    width: (extent.width / board.width),
    height: (extent.height / board.height)
  };
}
function getTowerRect(tower) {
  return {
    x: tower.origin.x * (extent.width / board.width),
    y: tower.origin.y * (extent.height / board.height),
    width: tower.extent.x * (extent.width / board.width),
    height: tower.extent.y * (extent.height / board.height)
  };
}
// Canvas position -> board position
function getBoardPos(canvasPos) {
  return {
    x: Math.floor(canvasPos.x / (extent.width / board.width)),
    y: Math.floor(canvasPos.y / (extent.height / board.height)),
  };
}

function initCanvas() {
  canvas.width(extent.width);
  canvas.height(extent.height);
  canvas.attr({
    width: extent.width,
    height: extent.height
  });
}

function initInterface() {
  initCanvas();
  $("#towerTypes").empty();
  Object.keys(gameState.towerTypes).forEach((type) => {
    let button = $("<button></button>")
      .text(type)
      .click(() => {
        clientState.placeType = type;
        drawState();
      });
    $("#towerTypes").append(button);
  });
  $("#unitTypes").empty();
  Object.keys(gameState.unitTypes).forEach((type) => {
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
  context.fillRect(0, 0, extent.width, extent.height);

  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      let cell = board.getCell({x: x, y: y});
      drawCell(cell.state, {x: x, y: y});
    }
  }
}

function drawState() {
  drawCanvas();

  for (let y = 0; y < board.height; y ++) {
    for (let x = 0; x < board.width; x ++) {
      let boardPos = {x: x, y: y};
      if (!inRect(clientState.playableRegion, boardPos)) {
        drawCell("opponent", boardPos);
      }
    }
  }

  gameState.towers.forEach(drawTower);
  gameState.units.forEach(drawUnit);

  let currentTower = gameState.getTower(clientState.lastMouse);
  if (currentTower) {
    gameState.getTowerPoses(clientState.lastMouse, currentTower.type).forEach((pos) => {
      drawCell("hoverTower", pos);
    });
    currentTower.reachable.forEach((pos) => {
      drawCell("towerRange", pos);
    });
  } else if (gameState.canPlaceTower(clientState.lastMouse, clientState.placeType)) {
    let type = clientState.canPlaceTowerWithPath(clientState.lastMouse, clientState.placeType) ? "hoverCell" : "error";
    gameState.getTowerPoses(clientState.lastMouse, clientState.placeType).forEach((pos) => {
      drawCell(type, pos);
    });
    gameState.towerTypes[clientState.placeType].reachable.map((pos) => {
      return {x: pos.x + clientState.lastMouse.x, y: pos.y + clientState.lastMouse.y};
    }).filter((pos) => {
      return (pos.x >= 0) && (pos.y >= 0) && (pos.x < board.width) && (pos.y < board.height);
    }).forEach((pos) => {
      drawCell("towerRange", pos);
    });
  }
}

canvas.mousemove((e) => {
  let boardPos = getBoardPos({x: e.offsetX, y: e.offsetY});
  boardPos = gameState.tryBump(boardPos, clientState.placeType);

  if (gameState.canPlaceTower(boardPos, clientState.placeType)) {
  } else {
    let tower = gameState.getTower(boardPos);
    if (tower !== null) {
      boardPos = tower.origin;
    }
  }

  clientState.lastMouse = boardPos;
  drawState();
});

canvas.mousedown((e) => {
  let boardPos = getBoardPos({x: e.offsetX, y: e.offsetY});
  boardPos = gameState.tryBump(boardPos, clientState.placeType);

  let tower = gameState.getTower(boardPos);
  if (tower === null) {
    if (clientState.canPlaceTowerWithPath(clientState.lastMouse, clientState.placeType)) {
      //Create Tower
      room.send({
        type: "addTower",
        value: {
          origin: boardPos,
          type: clientState.placeType
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
        type: clientState.placeType
      }
    });
  }

  clientState.lastMouse = boardPos;
  drawState();
});

$(document.body).keydown((e) => {
  if (e.keyCode === 13) {
    let path = board.getSolution();

    path.forEach((pos) => {
      drawCell("path", pos);
    });
  }
});

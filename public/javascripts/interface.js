
let canvas = $("canvas");

/* @var CanvasRenderingContext2D context */
let context = canvas[0].getContext('2d');

const extent = {
  width: 480,
  height: 640
};

const styles = {
  "hoverCell": function(context, rect) {
    context.fillStyle = "rgba(255,255,255,0.5)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "hoverTower": function(context, rect) {
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "opponent": function(context, rect) {
    context.fillStyle = "rgba(255,255,255,0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "error": function(context, rect) {
    context.fillStyle = "rgba(255, 0, 0, 0.3)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
  "empty": function(context, rect) {
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
  "tower": function(context, rect) {
    context.fillStyle = "rgba(0, 255, 0, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
  "path": function(context, rect) {
    context.fillStyle = "rgba(0, 0, 255, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
  "spawner": function(context, rect) {
    context.fillStyle = "rgba(255, 0, 0, 1.0)";
    context.strokeStyle = "#fff";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  },
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

function drawCell(state, boardPos) {
  let rect = getCellRect(boardPos);
  let style = styles[state];
  if (style !== undefined) {
    style(context, rect);
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
      if (!inRect(state.playableRegion, boardPos)) {
        drawCell("opponent", boardPos);
      }
    }
  }

  let currentTower = state.getTower(state.lastMouse);
  if (currentTower) {
    board.getSquarePoses(state.lastMouse).forEach((pos) => {
      drawCell("hoverTower", pos);
    });
  } else if (canPlaceTower(state.lastMouse)) {
    let type = state.canPlaceTowerWithPath(state.lastMouse) ? "hoverCell" : "error";
    board.getSquarePoses(state.lastMouse).forEach((pos) => {
      drawCell(type, pos);
    });
  }
}

canvas.mousemove(function(e) {
  let boardPos = getBoardPos({x: e.offsetX, y: e.offsetY});
  boardPos = tryBump(boardPos);

  if (canPlaceTower(boardPos)) {
    let tower = state.getTower(boardPos);
  } else {
    let tower = state.getTower(boardPos);
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

  let tower = state.getTower(boardPos);
  if (tower === null) {
    if (canPlaceTower(boardPos) && state.canPlaceTowerWithPath(state.lastMouse)) {
      //Create Tower
      room.send({
        type: "addTower",
        value: boardPos
      });
    }
  } else {
    //Delete Tower
    boardPos = tower.origin;
    room.send({
      type: "removeTower",
      value: boardPos
    });
  }

  state.lastMouse = boardPos;
  drawState();
});

$(document.body).keydown(function(e) {
  if (e.keyCode === 13) {
    let path = board.getSolution();

    path.forEach((pos) => {
      drawCell("path", pos);
    });
  }
});

initCanvas();

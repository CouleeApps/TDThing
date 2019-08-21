
let canvas = $("canvas");

/* @var CanvasRenderingContext2D context */
let context = canvas[0].getContext('2d');

const extent = {
  width: 480,
  height: 640
};

const styles = {
  "hoverCell": {
    fillStyle: "rgba(255,255,255,0.5)",
    strokeStyle: ""
  },
  "hoverTower": {
    fillStyle: "rgba(0,0,0,0.3)",
    strokeStyle: ""
  },
  "opponent": {
    fillStyle: "rgba(255,255,255,0.3)",
    strokeStyle: ""
  },
  "empty": {
    fillStyle: "rgba(0, 0, 0, 1.0)",
    strokeStyle: "#fff"
  },
  "tower": {
    fillStyle: "rgba(0, 255, 0, 1.0)",
    strokeStyle: "#fff"
  },
  "spawner": {
    fillStyle: "rgba(255, 0, 0, 1.0)",
    strokeStyle: "#fff"
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
    if (style.fillStyle !== "") {
      context.fillStyle = style.fillStyle;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    if (style.strokeStyle !== "") {
      context.strokeStyle = style.strokeStyle;
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }
}

function drawCanvas() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, extent.width, extent.height);

  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      let cell = getCell({x: x, y: y});
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

  let currentTower = resolveTower(state.lastMouse);
  if (currentTower) {
    getSquarePoses(state.lastMouse).forEach(function (pos) {
      drawCell("hoverTower", pos);
    });
  } else if (canPlace(state.lastMouse)) {
    getSquarePoses(state.lastMouse).forEach(function (pos) {
      drawCell("hoverCell", pos);
    });
  }
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

      room.send({
        type: "board",
        value: board.cells
      });
    }
  } else {
    //Delete Tower
    removeTower(boardPos);
    boardPos = tower.origin;

    room.send({
      type: "board",
      value: board.cells
    });
  }

  state.lastMouse = boardPos;
  drawState();
});

initCanvas();


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
  },
};

const unitStyles = {
  "normal": (unit, context, rect) => {
    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.beginPath();
    context.ellipse(rect.center().x, rect.center().y, rect.width * 0.25, rect.height * 0.25, 0, 0, Math.PI * 2);
    context.fill();
  },
  "chonky": (unit, context, rect) => {
    context.fillStyle = "rgba(160, 160, 160, 1.0)";
    context.beginPath();
    context.ellipse(rect.center().x, rect.center().y, rect.width * 0.4, rect.height * 0.4, 0, 0, Math.PI * 2);
    context.fill();
  },
};


function drawHealthBar(rect, healthProp) {
  let healthBarSize = 4;

  context.fillStyle = "rgba(0, 255, 0, 1.0)";
  context.beginPath();
  context.rect(rect.x, rect.y + rect.height - healthBarSize, rect.width * healthProp, healthBarSize);
  context.fill();
  context.fillStyle = "rgba(255, 0, 0, 1.0)";
  context.beginPath();
  context.rect(rect.x + rect.width * healthProp, rect.y + rect.height - healthBarSize, rect.width - rect.width * healthProp, healthBarSize);
  context.fill();
  let border = rect.inset(1);
  context.strokeStyle = "rgba(0, 0, 0, 1.0)";
  context.beginPath();
  context.rect(border.x, border.y + border.height - healthBarSize, border.width, healthBarSize);
  context.stroke();
}

function drawCell(state, boardPos) {
  let rect = getCellRect(boardPos);
  let style = styles[state];
  if (style !== undefined) {
    style(context, rect);
  }
}

function drawTowerRange(center, type) {
  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  context.strokeStyle = "#fff";
  context.beginPath();
  let canvasCenter = getCanvasPos(center);
  let range = gameState().towerTypes[type].range;
  let s = stretch();
  context.ellipse(canvasCenter.x, canvasCenter.y, range * s.x, range * s.y, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawTower(tower) {
  let rect = getTowerRect(tower);
  let style = towerStyles[tower.type];
  if (style !== undefined) {
    style(tower, context, rect);
  }

  let healthProp = tower.health / gameState().towerTypes[tower.type].health;
  drawHealthBar(rect, healthProp);
}

function drawTowerAttack(tower, unit) {
  // Draw a beam from tower to unit
  let lineStart = getCanvasPos(tower.center);
  let lineEnd = getUnitDrawRect(unit).center();
  context.strokeStyle = "rgba(255, 0, 0, 1.0)";
  context.beginPath();
  context.moveTo(lineStart.x, lineStart.y);
  context.lineTo(lineEnd.x, lineEnd.y);
  context.stroke();
}

function drawUnit(unit) {
  let rect = getUnitDrawRect(unit);
  let style = unitStyles[unit.type];
  if (style !== undefined) {
    style(unit, context, rect);
  }

  let healthProp = unit.health / gameState().unitTypes[unit.type].health;
  drawHealthBar(rect, healthProp);
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
  context.lineWidth = 1;
  drawCanvas();

  for (let y = 0; y < board().extent.y; y ++) {
    for (let x = 0; x < board().extent.x; x ++) {
      let boardPos = new Point(x, y);
      if (!inRect(clientState().playableRegion, boardPos)) {
        drawCell("opponent", boardPos);
      }
    }
  }

  // Drawing layers:
  // - Tower bases on the bottom
  // - Lasers on top of bases
  // - Units on very top
  // TODO: Health bars very top?
  gameState().towers.filter((tower) => !tower.deleted).forEach(drawTower);
  context.lineWidth = 3;
  gameState().towers.filter((tower) => !tower.deleted).forEach((tower) => {
    if (tower.target !== undefined && tower.target !== 0) {
      let unit = getUnit(tower.target);
      if (unit !== null) {
        drawTowerAttack(tower, unit);
      }
    }
  });
  context.lineWidth = 1;
  gameState().units.filter((tower) => !tower.deleted).forEach(drawUnit);

  let currentTower = getTowerByPos(gameState(), interfaceState.lastMouse);
  if (currentTower) {
    drawTowerRange(currentTower.center, currentTower.type);
    drawTower(currentTower);
  } else if (canPlaceTower(gameState(), interfaceState.lastMouse, interfaceState.placeType)) {
    let type = canPlaceTowerWithPath(clientState(), interfaceState.lastMouse, interfaceState.placeType) ? "hoverCell" : "error";
    getTowerPoses(gameState(), interfaceState.lastMouse, interfaceState.placeType).forEach((pos) => {
      drawCell(type, pos);
    });
    drawTowerRange(interfaceState.lastMouse.add(Point.from(gameState().towerTypes[interfaceState.placeType].extent).scale(0.5)), interfaceState.placeType);
  }

  if (interfaceState.selectedTower) {
    drawTowerRange(interfaceState.selectedTower.center, interfaceState.selectedTower.type);
    drawTower(interfaceState.selectedTower);
  }
}

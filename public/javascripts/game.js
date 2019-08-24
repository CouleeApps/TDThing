
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

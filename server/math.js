const schema = require('@colyseus/schema');
const Schema = schema.Schema;

class Point extends Schema {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;

    if (isNaN(x) || isNaN(y)) {
      console.error("Got NaN!");
    }
  }
  static from(object) {
    return new Point(object.x, object.y);
  }
}
schema.defineTypes(Point, {
  x: "number",
  y: "number"
});

class Rect extends Schema {
  constructor(x, y, width, height) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}
schema.defineTypes(Rect, {
  x: "number",
  y: "number",
  width: "number",
  height: "number",
});

module.exports = {
  Point: Point,
  Rect: Rect,
};

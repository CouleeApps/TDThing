const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const Point = require("./math").Point;

class Unit extends Schema {
  constructor(gameState, id, side, type) {
    super();
    this.gameState = gameState;

    let path = this.gameState.board.getSolution();
    if (side === "top") {
      path.reverse();
    }
    // Units are always 1x1
    let extent = new Point(1, 1);
    let position = path[0];

    this.id = id;
    this.type = type;
    this.side = side;
    this.health = this.gameState.unitTypes[type].health;
    this.accumulatedMS = 0;
    this.extent = extent;
    this.center = new Point(position.x + extent.x / 2, position.y + extent.y / 2);
    this.origin = position;
    this.destination = path[path.length - 1];
    this.position = position;
    this.pathPosition = 0;
  }
}
schema.defineTypes(Unit, {
  id: "number",
  type: "string",
  side: "string",
  health: "number",
  accumulatedMS: "number",
  extent: Point,
  center: Point,
  origin: Point,
  destination: Point,
  position: Point,
  pathPosition: "number",
});

class UnitType extends Schema {
  constructor(name, msPerMove, health, damagePerMS) {
    super();
    this.name = name;
    this.msPerMove = msPerMove;
    this.health = health;
    this.damagePerMS = damagePerMS;
  }
}
schema.defineTypes(UnitType, {
  name: "string",
  msPerMove: "number",
  health: "number",
  damagePerMS: "number",
});

module.exports = {
  Unit: Unit,
  UnitType: UnitType,
};

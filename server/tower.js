const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const ArraySchema = schema.ArraySchema;
const Point = require("./math").Point;
const Cell = require("./board").Cell;

class Tower extends Schema {
  constructor(gameState, id, origin, type, side) {
    super();
    this.gameState = gameState;

    let extent = this.gameState.towerTypes[type].extent;
    let cells = new ArraySchema();
    this.gameState.getTowerPoses(origin, type).forEach((pos) => {
      cells.push(pos);
      this.gameState.board.setCell(pos, Cell.towerCell(id));
    });

    this.id = id;
    this.origin = origin;
    this.center = new Point(origin.x + extent.x / 2, origin.y + extent.y / 2);
    this.extent = extent;
    this.side = side;
    this.type = type;
    this.cells = cells;
    this.health = this.gameState.towerTypes[type].health;
  }
}
schema.defineTypes(Tower, {
  id: "number",
  origin: Point,
  center: Point,
  extent: Point,
  side: "string",
  type: "string",
  cells: [ Point ],
  health: "number",
});

class TowerType extends Schema {
  constructor(name, extent, health, damagePerMS, range) {
    super();
    this.name = name;
    this.extent = extent;
    this.health = health;
    this.damagePerMS = damagePerMS;
    this.range = range;

    // Find effective area
    let reachable = new ArraySchema();
    let origin = new Point(
      extent.x / 2,
      extent.y / 2
    );
    // Rough outer bounds to check
    let bounds = {
      min: new Point(
        Math.floor(origin.x - range),
        Math.floor(origin.y - range)
      ),
      max: new Point(
        Math.ceil(origin.x + range),
        Math.ceil(origin.y + range)
      ),
    };
    // Filter to only include tiles in range
    for (let x = bounds.min.x; x < bounds.max.x; x ++) {
      for (let y = bounds.min.y; y < bounds.max.y; y ++) {
        if (((x + 0.5) - origin.x) * ((x + 0.5) - origin.x) + ((y + 0.5) - origin.y) * ((y + 0.5) - origin.y) <= range * range) {
          reachable.push(new Point(x, y));
        }
      }
    }
    this.reachable = reachable;
  }
}
schema.defineTypes(TowerType, {
  name: "string",
  extent: Point,
  health: "number",
  damagePerMS: "number",
  range: "number",
  reachable: [ Point ],
});

module.exports = {
  Tower: Tower,
  TowerType: TowerType,
};

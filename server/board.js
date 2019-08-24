const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const ArraySchema = schema.ArraySchema;
const MapSchema = schema.MapSchema;
const Point = require("./math").Point;

class Cell extends Schema {
  constructor(state) {
    super();

    this.state = state;
    this.tower = 0;
  }
  static emptyCell() {
    return new Cell("");
  }
  static spawnerCell() {
    return new Cell("spawner");
  }
  static towerCell(towerId) {
    let cell = new Cell("tower");
    cell.tower = towerId;
    return cell;
  }
}
schema.defineTypes(Cell, {
  state: "string",
  tower: "number"
});

class Paths extends Schema {
  constructor(board) {
    super();
    this.board = board;

    this.needsUpdate = false;
    this.top = new ArraySchema();
    this.bottom = new ArraySchema();
  }

  get(fromSide = "top") {
    if (this.needsUpdate) {
      this._update();
    }
    if (fromSide === "top") {
      return this.top;
    } else {
      return this.bottom;
    }
  }

  findPath(start, end) {
    let toKey = (pos) => pos.x + " " + pos.y;
    // BFS!
    let queue = [start];
    let paths = {};
    paths[toKey(start)] = [start];

    while (queue.length > 0) {
      let top = queue.shift();
      if (top === end) {
        break;
      }
      let neighbors = [
        new Point(top.x + 1, top.y),
        new Point(top.x - 1, top.y),
        new Point(top.x, top.y + 1),
        new Point(top.x, top.y - 1),
      ].filter((n) => {
        // In bounds
        if (n.x < 0 || n.y < 0 || n.x >= this.board.extent.x || n.y >= this.board.extent.y)
          return false;
        // Searched
        if (paths[toKey(n)] !== undefined)
          return false;
        // Pending
        if (queue.indexOf(n) !== -1)
          return false;
        // Taken
        let cell = this.board.getCell(n);
        return cell.state === "" || cell.state === "spawner";
      });
      neighbors.forEach((n) => {
        queue.push(n);
        paths[toKey(n)] = [top].concat(paths[toKey(top)]);
      });
    }
    if (paths[toKey(end)] === undefined) {
      return new ArraySchema();
    } else {
      return new ArraySchema(end).concat(paths[toKey(end)]);
    }
  }

  update() {
    this.needsUpdate = true;
  }

  _update() {
    this.needsUpdate = false;
    this.top = this.findPath(this.board.spawners.top, this.board.spawners.bottom);
    this.bottom = this.findPath(this.board.spawners.bottom, this.board.spawners.top);
  }
}
schema.defineTypes(Paths, {
  top: [ Point ],
  bottom: [ Point ]
});

class Board extends Schema {
  constructor(width, height) {
    super();

    this.extent = new Point(width, height);
    this.cells = new ArraySchema();
    this.spawners = new MapSchema({
      top: new Point(0, 0),
      bottom: new Point(0, 0)
    });
    this.solution = new Paths(this);
    this.init();
  }
  init() {
    // Init the board with nothing
    this.cells = new ArraySchema();
    for (let y = 0; y < this.extent.y; y++) {
      for (let x = 0; x < this.extent.x; x++) {
        this.cells.push(Cell.emptyCell());
      }
    }
    this.solution.update();
  }

  // Lazy functions
  getCell(boardPos) {
    return this.cells[boardPos.x + this.extent.x * boardPos.y];
  }
  setCell(boardPos, cell) {
    this.cells[boardPos.x + this.extent.x * boardPos.y] = cell;
    this.solution.update();
  }

  getSquarePoses(boardPos, extent) {
    if (boardPos.x >= this.extent.x - extent.x) {
      boardPos.x = this.extent.x - extent.x;
    }
    if (boardPos.y >= this.extent.y - extent.y) {
      boardPos.y = this.extent.y - extent.y;
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

  createSpawners(top, bottom) {
    this.setCell(new Point(top.x, top.y), Cell.spawnerCell());
    this.setCell(new Point(bottom.x, bottom.y), Cell.spawnerCell());
    this.spawners.top = top;
    this.spawners.bottom = bottom;
    this.solution.update();
  }

  getSolution(fromSide = "top") {
    return this.solution.get(fromSide);
  }
}
schema.defineTypes(Board, {
  extent: Point,
  spawners: { map: Point },
  cells: [ Cell ],
  solution: Paths
});

module.exports = {
  Cell: Cell,
  Board: Board,
};

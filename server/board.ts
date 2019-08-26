import {Schema, ArraySchema, MapSchema, type} from "@colyseus/schema";
import {Point} from "./math";
import TinyQueue from "tinyqueue";

export class Cell extends Schema {
  @type("string")
  state: string;

  @type("number")
  tower: number;

  constructor(state: string) {
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
  static towerCell(towerId: number) {
    let cell = new Cell("tower");
    cell.tower = towerId;
    return cell;
  }
}

export class Paths extends Schema {
  board: Board;
  needsUpdate: boolean;
  @type([ Point ])
  top: ArraySchema<Point>;
  @type([ Point ])
  bottom: ArraySchema<Point>;
  exclude: Point[];

  constructor(board: Board) {
    super();
    this.board = board;

    this.needsUpdate = false;
    this.top = new ArraySchema();
    this.bottom = new ArraySchema();

    this.exclude = [];
  }

  get(fromSide: string = "top") {
    if (this.needsUpdate) {
      this._update();
    }
    if (fromSide === "top") {
      return this.top;
    } else {
      return this.bottom;
    }
  }

  findPath(start: Point, end: Point) {
    let toKey = (pos: Point) => pos.x + " " + pos.y;
    // BFS!
    let queue = new TinyQueue([start], (a, b) => {
      return a.distSq(end) - b.distSq(end);
    });
    let paths = new Map<string, [Point]>();
    paths.set(toKey(start), [start]);

    while (queue.length > 0) {
      let top = queue.pop();
      if (top === end || top === undefined) {
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
        if (paths.get(toKey(n)) !== undefined)
          return false;
        // Excluded
        if (this.exclude.some((pt) => pt.equals(n)))
          return false;
        // Taken
        let cell = this.board.getCell(n);
        return cell.state === "" || cell.state === "spawner";
      });
      neighbors.forEach((n) => {
        queue.push(n);
        // @ts-ignore
        paths.set(toKey(n), [top].concat(paths.get(toKey(top))));
      });
    }
    if (paths.get(toKey(end)) === undefined) {
      return new ArraySchema();
    } else {
      // @ts-ignore
      return new ArraySchema(end).concat(paths.get(toKey(end))).reverse();
    }
  }

  setExclude(exclude: Point[]) {
    if (this.exclude.length !== exclude.length ||
        this.exclude.some((pt, index) => !exclude[index].equals(pt))) {
      this.exclude = exclude;
      this.update();
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

export class Board extends Schema {
  @type(Point)
  extent: Point;
  @type([ Cell ])
  cells: ArraySchema<Cell>;
  @type({ map: Point })
  spawners: MapSchema<Point>;
  @type(Paths)
  solution: Paths;

  constructor(width: number, height: number) {
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
  getCell(boardPos: Point) {
    return this.cells[boardPos.x + this.extent.x * boardPos.y];
  }
  setCell(boardPos: Point, cell: Cell) {
    this.cells[boardPos.x + this.extent.x * boardPos.y] = cell;
    this.solution.update();
  }

  getSquarePoses(boardPos: Point, extent: Point) {
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

  createSpawners(top: Point, bottom: Point) {
    this.setCell(new Point(top.x, top.y), Cell.spawnerCell());
    this.setCell(new Point(bottom.x, bottom.y), Cell.spawnerCell());
    this.spawners.top = top;
    this.spawners.bottom = bottom;
    this.solution.update();
  }

  getSolution(fromSide = "top", exclude: Point[] = []) {
    this.solution.setExclude(exclude);
    return this.solution.get(fromSide).map((pt) => pt.clone());
  }
}

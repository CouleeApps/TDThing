import {Schema, type} from "@colyseus/schema";

export class Point extends Schema {
  @type("number")
  x: number;
  @type("number")
  y: number;
  constructor(x: number | undefined, y: number | undefined) {
    super();
    this.x = x || 0;
    this.y = y || 0;

    if (isNaN(this.x) || isNaN(this.y)) {
      console.error("Got NaN!");
    }
  }
  static from(object: { x: number, y: number }) {
    return new Point(object.x, object.y);
  }
}

export class Rect extends Schema {
  @type("number")
  x: number;
  @type("number")
  y: number;
  @type("number")
  width: number;
  @type("number")
  height: number;
  constructor(x: number, y: number, width: number, height: number) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

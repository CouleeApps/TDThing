import {Point, Rect} from "./math";
import {TargetStyle, Tower, TowerType} from "./tower";
import {Unit, UnitType} from "./unit";
import {Board, Cell} from "./board";
import {ArraySchema, MapSchema, Schema, type} from "@colyseus/schema";
import * as fs from "fs";

export class ClientState extends Schema {
  gameState: GameState;
  @type("string")
  username: string | undefined;
  @type("string")
  side: string;
  @type(Rect)
  playableRegion: Rect;
  @type("number")
  health: number;
  @type("number")
  money: number;
  @type("boolean")
  ready: boolean;
  @type([ "string" ])
  unitQueue: ArraySchema<string>;

  constructor(gameState: GameState, side: string, region: Rect) {
    super();
    this.gameState = gameState;
    this.side = side;
    this.playableRegion = region;
    this.health = 100;
    this.money = 200;
    this.ready = false;
    this.unitQueue = new ArraySchema<string>();
  }

  reset() {
    this.username = undefined;
  }

  canSpend(amount: number): boolean {
    return this.money >= amount;
  }

  spend(amount: number) {
    this.money -= amount;
  }

  canPlace(): boolean {
    return this.gameState.roundState === RoundState.Constructing && !this.ready;
  }

  // If the player can place a tower, unobstructed, maintaining the path
  canPlaceTowerWithPath(boardPos: Point, type: string) {
    if (!this.gameState.canPlaceTower(boardPos, type)) {
      return false;
    }
    let poses = this.gameState.getTowerPoses(boardPos, type);
    if (poses.some((pos) => !this.playableRegion.contains(pos))) {
      return false;
    }
    let path = this.gameState.board.getSolution("top", poses);
    return path.length > 0;
  }
}

export enum RoundState {
  Waiting = "Waiting",
  Constructing = "Constructing",
  Playing = "Playing",
}

export class GameState extends Schema {
  @type([ Tower ])
  towers: ArraySchema<Tower>;
  @type([ Unit ])
  units: ArraySchema<Unit>;
  @type(Board)
  board: Board;
  @type({ map: TowerType })
  towerTypes: MapSchema<TowerType>;
  @type({ map: UnitType })
  unitTypes: MapSchema<UnitType>;
  @type({ map: ClientState })
  clientStates: MapSchema<ClientState>;
  @type([ "string" ])
  targetStyles: ArraySchema<TargetStyle>;
  @type("string")
  roundState: RoundState;
  lastTowerId: number;
  lastUnitId: number;

  shittyDelete: boolean = true;

  constructor(board: Board) {
    super();
    this.towers = new ArraySchema();
    this.units = new ArraySchema();
    this.board = board;
    this.clientStates = new MapSchema<ClientState>();
    this.roundState = RoundState.Waiting;

    this.towerTypes = new MapSchema();
    let towerConts = fs.readFileSync('server/config/towerTypes.json');
    let towerTypes = JSON.parse(towerConts.toString()) as [any];
    towerTypes.forEach((type) => {
      this.towerTypes[type["name"]] = new TowerType(type);
    });

    this.unitTypes = new MapSchema();
    let unitConts = fs.readFileSync('server/config/unitTypes.json');
    let unitTypes = JSON.parse(unitConts.toString()) as [any];
    unitTypes.forEach((type) => {
      this.unitTypes[type["name"]] = new UnitType(type);
    });

    this.targetStyles = new ArraySchema(
      TargetStyle.First,
      TargetStyle.Last,
      TargetStyle.Strongest,
      TargetStyle.Weakest,
      TargetStyle.Nearest,
      TargetStyle.Furthest,
    );
    this.lastTowerId = 1;
    this.lastUnitId = 1;
    this.init();
  }

  init() {
  }

  getTower(towerId: number) {
    return this.towers.filter((tower) => !tower.deleted).find((tower) => tower.id === towerId);
  }

  getTowerByPos(boardPos: Point) {
    for (let i = 0; i < this.towers.length; i ++) {
      let tower = this.towers[i];
      if (tower.deleted)
        continue;
      let on = tower.cells.some(function(pos) {
        return pos.equals(boardPos);
      });
      if (on) {
        return tower;
      }
    }
    return null;
  }

  addTower(boardPos: Point, type: string, side: string) {
    let tower = new Tower(this, this.lastTowerId++, boardPos, type, side);
    this.towers.push(tower);
    return tower;
  }

  removeTower(tower: Tower) {
    tower.cells.forEach((pos: Point) => {
      this.board.setCell(pos, Cell.emptyCell());
    });
    // TODO: When splice is no longer broken, use it instead of this hack
    if (this.shittyDelete) {
      tower.deleted = true;
    } else {
      let index = this.towers.indexOf(tower);
      this.towers.splice(index, 1);
    }
  }

  getTowerPoses(origin: Point, type: string) {
    return this.board.getSquarePoses(origin, this.towerTypes[type].extent);
  }

  // If a tower can be placed unobstructed at the given location
  canPlaceTower(origin: Point, type: string) {
    if (origin.x < 0 || origin.y < 0 || origin.x >= this.board.extent.x || origin.y >= this.board.extent.y) {
      return false;
    }
    let poses = this.getTowerPoses(origin, type);
    return poses.every((pos) => {
      let state = this.board.getCell(pos).state;
      return state === "" || state === "hover";
    });
  }

  getUnit(unitId: number) {
    return this.units.find((unit) => unit.id === unitId);
  }

  spawnUnit(side: string, type: string) {
    let unit = new Unit(this, this.lastUnitId++, side, type);
    this.units.push(unit);
    return unit;
  }

  destroyUnit(unit: Unit) {
    // TODO: Huge hack here too
    if (this.shittyDelete) {
      unit.deleted = true;
    } else {
      this.units.splice(this.units.indexOf(unit), 1);
    }
  }

  checkStart() {
    if (this.roundState === RoundState.Constructing &&
      this.clientStates["top"].ready && this.clientStates["bottom"].ready) {
      // Start!
      this.startRound()
    }
  }

  startRound() {
    this.roundState = RoundState.Playing;
    let startSide = (side: string) => {
      this.clientStates[side].ready = false;
      this.clientStates[side].unitQueue.forEach((type: string, index: number) => {
        setTimeout(() => {
          this.spawnUnit(side, type);
        }, index * 500);
      });
      this.clientStates[side].unitQueue.splice(0);
    };
    startSide("top");
    startSide("bottom");
  }

  updateRound(deltaMS: number) {
    switch (this.roundState) {
      case RoundState.Waiting:
        break;
      case RoundState.Constructing:
        break;
      case RoundState.Playing:
        this.moveUnits(deltaMS);
        this.towerAttack(deltaMS);

        if (this.units.filter((unit) => !unit.deleted).length === 0) {
          // Everything is dead, round over
          this.roundState = RoundState.Waiting;
          setTimeout(() => this.roundState = RoundState.Constructing, 1000);
        }

        break;
    }
  }

  // Returns a list of events that happened
  moveUnits(deltaMS: number) {
    let events: any[] = [];
    let topPath = this.board.getSolution("top");
    let bottomPath = this.board.getSolution("bottom");
    this.units.filter((tower) => !tower.deleted).forEach((unit) => {
      let path = (unit.side === "top" ? topPath : bottomPath);
      unit.accumulatedMS += deltaMS;
      if (unit.accumulatedMS >= this.unitTypes[unit.type].msPerMove) {
        if (unit.position === unit.destination || unit.pathPosition >= unit.path.length - 1) {
          // TODO: Damage to base
          this.destroyUnit(unit);
          events.push({
            type: "unitDestroy",
            data: {
              unit: unit
            }
          });
          return;
        } else {
          // TODO: Interpolate? Might do that in interface
          unit.accumulatedMS -= this.unitTypes[unit.type].msPerMove;
          unit.pathPosition += 1;
          unit.position = unit.path[unit.pathPosition].clone();
          if (unit.pathPosition !== unit.path.length - 1) {
            unit.nextPosition = unit.path[unit.pathPosition + 1].clone();
          }

          events.push({
            type: "unitMove",
            data: {
              unit: unit
            }
          });
        }

        // Update which towers we're in range of
        // this.towers.forEach((tower) => {
        //   let range = tower
        // });
      }
    });

    return events;
  }

  // Returns a list of events that happened
  towerAttack(deltaMS: number) {
    let events: any[] = [];
    this.towers.filter((tower) => !tower.deleted).forEach((tower) => {
      let reaching: Unit[] = [];
      reaching = reaching.concat(this.units).filter((unit) => {
        return !unit.deleted && unit.side !== tower.side && tower.reachable.some((pos: Point) => pos.equals(unit.position));
      });
      if (reaching.length > 0) {
        switch (tower.targetStyle) {
          case TargetStyle.First:
            reaching.sort((u1, u2) => u2.pathPosition - u1.pathPosition);
            break;
          case TargetStyle.Last:
            reaching.sort((u1, u2) => u1.pathPosition - u2.pathPosition);
            break;
          case TargetStyle.Strongest:
            reaching.sort((u1, u2) => u2.health - u1.health);
            break;
          case TargetStyle.Weakest:
            reaching.sort((u1, u2) => u1.health - u2.health);
            break;
          case TargetStyle.Nearest:
            reaching.sort((u1, u2) => u1.center.distSq(tower.center) - u2.center.distSq(tower.center));
            break;
          case TargetStyle.Furthest:
            reaching.sort((u1, u2) => u2.center.distSq(tower.center) - u1.center.distSq(tower.center));
            break;
        }

        // Attack one at once
        let unit = reaching[0];
        tower.target = unit.id;

        unit.health -= this.towerTypes[tower.type].damagePerSecond * deltaMS / 1000;
        tower.health -= this.unitTypes[unit.type].damagePerSecond * deltaMS / 1000;
        events.push({
          type: "attack",
          data: {
            tower: tower.id,
            unit: unit.id
          }
        });
        if (unit.health <= 0) {
          this.destroyUnit(unit);
          events.push({
            type: "unitDestroy",
            data: {
              unit: unit
            }
          });
        }
      } else {
        tower.target = 0;
      }
    });
    let updatePaths = false;
    for (let i = 0; i < this.towers.length; i ++) {
      let tower = this.towers[i];
      if (tower.deleted)
        continue;

      if (tower.health <= 0) {
        this.removeTower(tower);
        events.push({
          type: "towerDestroy",
          data: {
            tower: tower
          }
        });
        if (!this.shittyDelete) {
          i--;
        }
        updatePaths = true;
      }
    }
    if (updatePaths) {
      this.units.filter((unit) => !unit.deleted).forEach((unit) => unit.updatePath());
    }
    return events;
  }
}

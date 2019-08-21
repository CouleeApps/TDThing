
const Colyseus = require("colyseus");
const http = require("http");
const game = require("../public/javascripts/game");

class TDMPRoom extends Colyseus.Room {
  constructor() {
    super();
    this.maxClients = 2;

    this.board = {
      width: 25,
      height: 33,
      cells: []
    };

    this.topRegion = {
      x: 0,
      y: 0,
      width: this.board.width,
      height: 16
    };
    this.bottomRegion = {
      x: 0,
      y: 17,
      width: this.board.width,
      height: 16
    };

    this.initBoard();
  }

  initBoard() {
    // Init the board with nothing
    for (let x = 0; x < this.board.width; x++) {
      let row = [];
      for (let y = 0; y < this.board.height; y++) {
        row.push(TDMPRoom.emptyCell());
      }
      this.board.cells.push(row);
    }
    this.board.cells[12][0].state = "spawner";
    this.board.cells[12][this.board.height - 1].state = "spawner";
  }

  static emptyCell() {
    return {
      state: "empty"
    };

  }

  static inRect(rect, p) {
    return p.x >= rect.x && p.y >= rect.y && p.x < rect.x + rect.width && p.y < rect.y + rect.height;
  }

  onInit(options) {
    console.log("BasicRoom created!", options);
  }

  onJoin(client) {
    this.chat(`${client.sessionId} joined.`);
    let isTop = this.clients.length === 0 || !this.clients[0].isTop;
    client.isTop = isTop;
    client.region = isTop ? this.topRegion : this.bottomRegion;
    this.send(client, {
      type: "layout",
      value: {
        board: {
          width: this.board.width,
          height: this.board.height
        },
        playableRegion: client.region
      }
    });
    this.send(client, {
      type: "board",
      value: this.board.cells
    });
  }

  onLeave(client) {
    this.chat(`${ client.sessionId } left.`);
  }

  onMessage(client, data) {
    switch (data.type) {
      case "chat":
        this.chat(`(${client.sessionId}) ${data.value}`);
        break;
      case "board":
        for (let x = 0; x < this.board.width; x ++) {
          for (let y = 0; y < this.board.height; y ++) {
            if (TDMPRoom.inRect(client.region, {x: x, y: y})) {
              this.board.cells[x][y] = data.value[x][y];
            }
          }
        }

        this.clients.filter((c) => c !== client).forEach((c) => this.send(c, {
          type: "board",
          value: this.board.cells
        }));

        break;
    }
  }

  onDispose() {
    console.log("Dispose BasicRoom");
  }

  chat(message) {
    this.broadcast({
      type: "chat",
      value: message
    });
  }

}


module.exports = function(app) {
  const server = http.createServer(app);

  let gameServer = new Colyseus.Server({
    server
  });

  gameServer.register("tdmp", TDMPRoom);
  gameServer.listen(3020, "0.0.0.0");

  return function(err, req, res, next) {
  };
};
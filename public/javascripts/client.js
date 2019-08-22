
let board = new Board();
let state = new State(board);

let client = new Colyseus.Client('ws://' + window.location.hostname + ':3020');
let room = client.join("tdmp");
room.onJoin.add(() => {
  console.log(client.id, "joined", room.name);

  drawState();
});
room.onMessage.add((data) => {
  switch (data.type) {
    case "layout":
      board.width = data.value.board.width;
      board.height = data.value.board.height;
      state.playableRegion = data.value.playableRegion;
      board.init();
      state.init();
      drawState();
      break;
    case "chat":
      console.log("Got message: " + data.value);
      break;
    case "board":
      board.cells = data.value.cells;
      board.spawners = data.value.spawners;
      state.towers = data.value.towers;
      drawState();
      break;
  }
});

function chat(message) {
  room.send({
    type: "chat",
    value: message
  })
}

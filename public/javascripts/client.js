
let board = new Board();
let gameState = new GameState(board);
let clientState = new ClientState(gameState);

let client = new Colyseus.Client('ws://' + window.location.hostname + ':3020');
let room = client.join("tdmp");
room.onJoin.add(() => {
  console.log(client.id, "joined", room.name);

  drawState();
});
room.onMessage.add((data) => {
  switch (data.type) {
    case "setup":
      board.width = data.value.board.width;
      board.height = data.value.board.height;
      gameState.towerTypes = data.value.towerTypes;
      gameState.unitTypes = data.value.unitTypes;
      clientState.playableRegion = data.value.playableRegion;

      board.init();
      gameState.init();
      initInterface();

      drawState();
      break;
    case "chat":
      console.log("Got message: " + data.value);
      break;
    case "board":
      board.cells = data.value.cells;
      board.spawners = data.value.spawners;
      drawState();
      break;
    case "state":
      gameState.towers = data.value.towers;
      gameState.units = data.value.units;
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

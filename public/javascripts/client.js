
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
      initBoard();
      initState();
      drawState();
      break;
    case "chat":
      console.log("Got message: " + data.value);
      break;
    case "board":
      board.cells = data.value;
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

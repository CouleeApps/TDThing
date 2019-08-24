
// let clientState = new ClientState(gameState);

let client = new Colyseus.Client('ws://' + window.location.hostname + ':3020');
let room = client.join("tdmp");
room.onJoin.add(() => {
  console.log(client.id, "joined", room.name);
});
room.onMessage.add((data) => {
  switch (data.type) {
    case "setup":
      clientState.playableRegion = data.value.playableRegion;
      initInterface();
      drawState();
      break;
    case "chat":
      console.log("Got message: " + data.value);
      break;
  }
});
room.state.onChange = (changes) => {
  changes.forEach(change => {
    console.log(change.field);
    console.log(change.value);
    console.log(change.previousValue);
  });
};

function chat(message) {
  room.send({
    type: "chat",
    value: message
  })
}

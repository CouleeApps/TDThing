
let side = "top";
let client = new Colyseus.Client('ws://' + window.location.hostname + ':3020');
let room = client.join("tdmp");
room.onJoin.add(() => {
  console.log(client.id, "joined", room.name);

  room.state.onChange = (changes) => {
    changes.forEach(change => {
//       console.log(change.field);
//       console.log(change.value);
//       console.log(change.previousValue);
    });
    drawState();
  };
  room.state.gameState.towers.onAdd = (item, index) => {
    console.log(item, "has been added at", index);

    // add your player entity to the game world!
    // If you want to track changes on a child object inside a map, this is a common pattern:
    item.onChange = function(changes) {
      changes.forEach(change => {
        console.log(change.field);
        console.log(change.value);
        console.log(change.previousValue);
      })
    };

    // force "onChange" to be called immediately
    item.triggerAll();

    drawState();
  };
});
room.onMessage.add((data) => {
  switch (data.type) {
    case "setup":
      side = data.value.side;
      initInterface();
      drawState();
      break;
    case "chat":
      addChatLine(data.value.from, data.value.text);
      break;
  }
});

function chat(message) {
  room.send({
    type: "chat",
    value: message
  })
}

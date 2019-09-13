
let side = "top";
let client = new Colyseus.Client('ws://' + window.location.hostname + ':3020');
let connectionState = {
  room: null,
  initialized: false
};

function send(message) {
  return connectionState.room.send(message);
}

client.joinOrCreate("tdmp", {}).then((room) => {
  connectionState.room = room;
  console.log("Room Id:", room.sessionId);

  room.onStateChange.once((state) => {
    console.log(state);
    initInterface();
    drawState();
    updateInterface();
  });
  room.onStateChange((state) => {
    drawState();
    updateInterface();
  });

  room.onMessage((data) => {
    switch (data.type) {
      case "setup":
        side = data.value.side;
        break;
      case "chat":
        addChatLine(data.value.from, data.value.text);
        break;
    }
  });
}).catch((e) => {
  console.error("Join Error: ", e);
});

function chat(message) {
  send({
    type: "chat",
    value: message
  })
}


let canvas = $("canvas");

/* @var CanvasRenderingContext2D context */
let context = canvas[0].getContext('2d');
let dpi = window.devicePixelRatio || 1;

const extent = new Point(480 * dpi, 640 * dpi);

let interfaceState = {
  lastMouse: new Point(0, 0),
  placeType: "normal",
  selectedTower: null,
};

function initCanvas() {
  canvas.width(extent.x / dpi);
  canvas.height(extent.y / dpi);
  canvas.attr({
    width: extent.x,
    height: extent.y
  });
}

function initInterface() {
  initCanvas();
  $("#towerTypes")
    .empty()
    .append(
      $("<button/>")
        .text("None")
        .click(() => {
          interfaceState.placeType = null;
          drawState();
        })
    );
  Object.keys(gameState().towerTypes).forEach((type) => {
    let button = $("<button/>")
      .text(type)
      .click(() => {
        interfaceState.placeType = type;
        drawState();
      });
    $("#towerTypes").append(button);
  });
  $("#unitTypes").empty();
  Object.keys(gameState().unitTypes).forEach((type) => {
    let button = $("<button/>")
      .text(type)
      .click(() => {
        send({
          type: "queueUnit",
          value: {
            type: type
          }
        })
      });
    $("#unitTypes").append(button);
  });
  $("#targetStyles").empty();
  gameState().targetStyles.forEach((style) => {
    let id = "targetStyle-" + style;
    let button = $("<input/>")
      .attr({
        type: "radio",
        id: id,
        name: "targetStyle",
        disabled: "disabled"
      })
      .addClass("targetStyle")
      .click(() => {
        if (interfaceState.selectedTower !== null) {
          send({
            type: "setTargetStyle",
            value: {
              id: interfaceState.selectedTower.id,
              style: style
            }
          })
        }
      });
    let label = $("<label/>")
      .append(button)
      .append(style)
      .attr({for: id});
    $("#targetStyles")
      .append(label)
      .append("<br/>");
  });
  $("#destroyTower").click((e) => {
    if (interfaceState.selectedTower !== null) {
      send({
        type: "removeTower",
        value: {
          id: interfaceState.selectedTower.id,
        }
      });
      selectTower(null);
    }
  });
  $("#readyButton").click((e) => {
    send({
      type: "ready",
      value: {}
    });
  });
  initChatInterface();
}

function initChatInterface() {
  $("#chatEntry").keydown((e) => {
    if (e.keyCode === 13) {
      send({
        type: "chat",
        value: {
          text: $("#chatEntry").val()
        }
      });
      $("#chatEntry").val("");
    }
  });
  let joinChat = (e) => {
    let username = $("#chatUsername").val().trim();
    if (username === "")
      return;

    send({
      type: "setUsername",
      value: {
        username: username
      }
    });
    $("#chatJoin").hide();
    $("#chatInner").show();
    $("#chatEntry").focus();
  };
  $("#chatJoinButton").click(joinChat);
  $("#chatUsername").keydown((e) => {
    if (e.keyCode === 13) {
      joinChat(e);
    }
  });
}

function updateInterface() {
  $("#money").text("Money: " + clientState().money);

  let isConstructing = gameState().roundState === "Constructing" && !clientState().ready;
  if (isConstructing) {
    $(".constructModeOnly").show();
  } else {
    $(".constructModeOnly").hide();
  }

  $("#unitQueue").empty();

  clientState().unitQueue.reduce((prev, current) => {
    if (prev.length === 0) {
      return [[current, 1]];
    } else if (prev[prev.length - 1][0] === current) {
      return prev.slice(0, prev.length - 1).concat([[current, prev[prev.length - 1][1] + 1]]);
    } else {
      return prev.concat([[current, 1]]);
    }
  }, []).forEach((unit) => {
    $("#unitQueue").append(
      $("<div/>")
        .text(unit[0] + " x " + unit[1])
    )
  });
}

function selectTower(tower) {
  interfaceState.selectedTower = tower;
  if (tower === null) {
    $("#towerStats")
      .empty()
      .append(
        $("<span/>").text("No Selection")
      );
    $(".targetStyle").prop("checked", false).attr({disabled: "disabled"});
  } else {
    $("#towerStats")
      .empty()
      .append(
        $("<span/>").text("Health: " + tower.health)
      );
    $(".targetStyle").prop("checked", false).removeAttr("disabled");
    $("#targetStyle-" + tower.targetStyle).prop("checked", true);
  }
}

function addChatLine(from, text) {
  $("#chat").append(
    $("<div/>")
      .addClass("chatMessage")
      .append(
        $("<strong/>")
          .text(from)
          .append(":&nbsp;")
      )
      .append(
        $("<span/>")
          .text(text)
      )
  );
}

canvas.mousemove((e) => {
  if (interfaceState.placeType !== null) {
    let boardPos = getBoardPos(new Point(e.offsetX * dpi, e.offsetY * dpi));
    boardPos = tryBump(gameState(), boardPos, interfaceState.placeType);

    if (!canPlaceTower(gameState(), boardPos, interfaceState.placeType)) {
      let tower = getTowerByPos(gameState(), boardPos);
      if (tower !== null) {
        boardPos = tower.origin;
      }
    }

    interfaceState.lastMouse = boardPos;
    drawState();
  }
});

canvas.mousedown((e) => {
  let boardPos = getBoardPos(new Point(e.offsetX * dpi, e.offsetY * dpi));

  let tower = getTowerByPos(gameState(), boardPos);
  if (tower === null) {
    if (interfaceState.placeType !== null) {
      let placePos = tryBump(gameState(), boardPos, interfaceState.placeType);
      if (canPlaceTowerWithPath(clientState(), placePos, interfaceState.placeType)) {
        //Create Tower
        send({
          type: "addTower",
          value: {
            origin: boardPos,
            type: interfaceState.placeType
          }
        });
      }
    }
  } else {
    //Select Tower
    boardPos = tower.origin;
    if (tower.side !== side || (interfaceState.selectedTower !== null && interfaceState.selectedTower.id === tower.id)) {
      selectTower(null);
    } else {
      selectTower(tower);
    }
  }

  interfaceState.lastMouse = boardPos;
  drawState();
  e.preventDefault();
});

// Debug only
$("#lazyTop").click((e) => {
  let towers = [{x: 13, y: 0}, {x: 10, y: 0}, {x: 13, y: 2}, {x: 11, y: 3}, {x: 9, y: 3}, {x: 7, y: 3}, {x: 5, y: 3}, {x: 3, y: 3}, {x: 1, y: 3}, {x: 1, y: 1}, {x: 4, y: 0}, {x: 7, y: 1}, {x: 0, y: 6}, {x: 2, y: 6}, {x: 8, y: 6}, {x: 14, y: 5}, {x: 16, y: 3}, {x: 16, y: 1}, {x: 19, y: 0}, {x: 18, y: 3}, {x: 20, y: 3}, {x: 22, y: 3}, {x: 22, y: 1}, {x: 23, y: 6}, {x: 21, y: 6}, {x: 19, y: 6}, {x: 17, y: 6}, {x: 12, y: 8}, {x: 15, y: 8}, {x: 12, y: 10}, {x: 14, y: 11}, {x: 16, y: 11}, {x: 18, y: 9}, {x: 20, y: 9}, {x: 22, y: 9}, {x: 23, y: 14}, {x: 22, y: 11}, {x: 21, y: 14}, {x: 19, y: 14}, {x: 19, y: 12}, {x: 17, y: 14}, {x: 15, y: 14}, {x: 13, y: 14}, {x: 11, y: 13}, {x: 9, y: 11}, {x: 5, y: 11}, {x: 3, y: 11}, {x: 1, y: 9}, {x: 0, y: 14}, {x: 2, y: 14}, {x: 4, y: 14}, {x: 6, y: 14}, {x: 8, y: 14}, {x: 1, y: 11}, {x: 10, y: 6}, {x: 12, y: 6}, {x: 9, y: 9}, {x: 7, y: 11}, {x: 6, y: 8}, {x: 4, y: 8}, {x: 5, y: 5}];
  towers.forEach((pos) => {
    //Create Tower
    send({
      type: "addTower",
      value: {
        origin: pos,
        type: interfaceState.placeType
      }
    });
  });
});

$("#lazyBottom").click((e) => {
  let towers = [{x: 10, y: 0}, {x: 13, y: 0}, {x: 10, y: 2}, {x: 12, y: 3}, {x: 14, y: 3}, {x: 16, y: 3}, {x: 18, y: 3}, {x: 20, y: 3}, {x: 22, y: 3}, {x: 22, y: 1}, {x: 19, y: 0}, {x: 16, y: 1}, {x: 23, y: 6}, {x: 21, y: 6}, {x: 15, y: 6}, {x: 9, y: 5}, {x: 7, y: 3}, {x: 7, y: 1}, {x: 4, y: 0}, {x: 5, y: 3}, {x: 3, y: 3}, {x: 1, y: 3}, {x: 1, y: 1}, {x: 0, y: 6}, {x: 2, y: 6}, {x: 4, y: 6}, {x: 6, y: 6}, {x: 11, y: 8}, {x: 8, y: 8}, {x: 11, y: 10}, {x: 9, y: 11}, {x: 7, y: 11}, {x: 5, y: 9}, {x: 3, y: 9}, {x: 1, y: 9}, {x: 0, y: 14}, {x: 1, y: 11}, {x: 2, y: 14}, {x: 4, y: 14}, {x: 4, y: 12}, {x: 6, y: 14}, {x: 8, y: 14}, {x: 10, y: 14}, {x: 12, y: 13}, {x: 14, y: 11}, {x: 18, y: 11}, {x: 20, y: 11}, {x: 22, y: 9}, {x: 23, y: 14}, {x: 21, y: 14}, {x: 19, y: 14}, {x: 17, y: 14}, {x: 15, y: 14}, {x: 22, y: 11}, {x: 13, y: 6}, {x: 11, y: 6}, {x: 14, y: 9}, {x: 16, y: 11}, {x: 17, y: 8}, {x: 19, y: 8}, {x: 18, y: 5}, {x: 10, y: 31}, {x: 13, y: 31}, {x: 10, y: 29}, {x: 12, y: 28}, {x: 14, y: 28}, {x: 16, y: 28}, {x: 18, y: 28}, {x: 20, y: 28}, {x: 22, y: 28}, {x: 22, y: 30}, {x: 19, y: 31}, {x: 16, y: 30}, {x: 23, y: 25}, {x: 21, y: 25}, {x: 15, y: 25}, {x: 9, y: 26}, {x: 7, y: 28}, {x: 7, y: 30}, {x: 4, y: 31}, {x: 5, y: 28}, {x: 3, y: 28}, {x: 1, y: 28}, {x: 1, y: 30}, {x: 0, y: 25}, {x: 2, y: 25}, {x: 4, y: 25}, {x: 6, y: 25}, {x: 11, y: 23}, {x: 8, y: 23}, {x: 11, y: 21}, {x: 9, y: 20}, {x: 7, y: 20}, {x: 5, y: 22}, {x: 3, y: 22}, {x: 1, y: 22}, {x: 0, y: 17}, {x: 1, y: 20}, {x: 2, y: 17}, {x: 4, y: 17}, {x: 4, y: 19}, {x: 6, y: 17}, {x: 8, y: 17}, {x: 10, y: 17}, {x: 12, y: 18}, {x: 14, y: 20}, {x: 18, y: 20}, {x: 20, y: 20}, {x: 22, y: 22}, {x: 23, y: 17}, {x: 21, y: 17}, {x: 19, y: 17}, {x: 17, y: 17}, {x: 15, y: 17}, {x: 22, y: 20}, {x: 13, y: 25}, {x: 11, y: 25}, {x: 14, y: 22}, {x: 16, y: 20}, {x: 17, y: 23}, {x: 19, y: 23}, {x: 18, y: 26}];
  towers.forEach((pos) => {
    //Create Tower
    send({
      type: "addTower",
      value: {
        origin: pos,
        type: interfaceState.placeType
      }
    });
  });
});

let osc;
let controller;
let gui;

let params = {
  var1: 50,
};

function setup() {
  createCanvas(400, 400);

  osc = new OSC();
  osc.open({ host: "localhost", port: 8080 });

  osc.on("/update", (message) => {
    const address = message.args[0];
    switch (true) {
      case address.startsWith("/fader1"):
        params.var1 = map(message.args[1], 0, 1, 0, 200);
        gui.updateDisplay(); // Update the GUI display

        // Handle fader1
        break;

      default:
        console.log("Unhandled OSC address:", address);
        break;
    }
  });

  gui = new dat.GUI();
  const folder = gui.addFolder("Settings");
  controller = folder.add(params, "var1", 0, 200, 5);
  controller.onChange((val) => {
    console.log("Value updated:", map(val, 0, 200, 0, 1));

    let message = new OSC.Message("/message", "/fader1", map(val, 10, 200, 0, 1));
    osc.send(message);
  });
}

function draw() {
  background(220);
  circle(width / 2, height / 2, params.var1);
}

function keyPressed() {
  gui.updateDisplay(); // Update the GUI display

  if (key == "g") {
    gui.show(); // Show
  }
  if (key == "G") {
    gui.hide(); // Show
  }
}

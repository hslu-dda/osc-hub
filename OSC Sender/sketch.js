// Sketch A (Sender)
let osc;
let redSlider;
let greenSlider;
let backgroundRed = 0;
let backgroundGreen = 0;

function setup() {
  createCanvas(400, 400);

  // Create sliders
  redSlider = createSlider(0, 255, 0);
  redSlider.position(10, height + 10);
  greenSlider = createSlider(0, 255, 0);
  greenSlider.position(10, height + 30);

  osc = new OSC();
  osc.open({ host: "localhost", port: 8080 });

  osc.on("/update", (message) => {
    const address = message.args[0];
    switch (true) {
      case address.startsWith("/sketchB/slider1"):
        backgroundRed = message.args[1];
        break;

      case address.startsWith("/sketchB/slider2"):
        backgroundGreen = message.args[1];
        break;

      case address.startsWith("/fader1"):
        // Handle fader1
        break;

      default:
        console.log("Unhandled OSC address:", address);
        break;
    }
  });
}

function draw() {
  background(backgroundRed, backgroundGreen, 220);

  // Send with specific OSC addresses
  if (redSlider.value() !== redSlider.lastValue) {
    let message = new OSC.Message("/message", "/sketchA/slider1", redSlider.value());
    osc.send(message);
    redSlider.lastValue = redSlider.value();
  }

  if (greenSlider.value() !== greenSlider.lastValue) {
    let message = new OSC.Message("/message", "/sketchA/slider2", greenSlider.value());
    osc.send(message);
    greenSlider.lastValue = greenSlider.value();
  }
}

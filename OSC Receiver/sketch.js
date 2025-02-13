// Sketch B (Receiver)
let osc;
let redSlider;
let greenSlider;
let fader1;
let lastFaderValue = 0; // Track fader value separately

let backgroundRed = 0;
let backgroundGreen = 0;
let backgroundBlue = 0;

function setup() {
  createCanvas(400, 400);

  redSlider = createSlider(0, 255, 0);
  redSlider.position(10, height + 10);
  greenSlider = createSlider(0, 255, 0);
  greenSlider.position(10, height + 30);
  fader1 = createSlider(0, 255, 0);
  fader1.position(10, height + 50);
  fader1.value(100);
  osc = new OSC();
  osc.open({ host: "localhost", port: 8080 });

  osc.on("/update", (message) => {
    const address = message.args[0];
    switch (true) {
      case address.startsWith("/sketchA/slider1"):
        backgroundRed = message.args[1];
        break;

      case address.startsWith("/sketchA/slider2"):
        backgroundGreen = message.args[1];
        break;

      case address.startsWith("/fader1"):
        backgroundBlue = map(message.args[1], 0, 1, 0, 255);
        fader1.value(backgroundBlue);
        fader1.lastValue = backgroundBlue; // Prevent re-sending

        break;

      default:
        console.log("Unhandled OSC address:", address);
        break;
    }
  });
}

function draw() {
  background(backgroundRed, backgroundGreen, backgroundBlue);
  if (redSlider.value() !== redSlider.lastValue) {
    let message = new OSC.Message("/message", "/sketchB/slider1", redSlider.value());
    osc.send(message);
    redSlider.lastValue = redSlider.value();
  }

  if (greenSlider.value() !== greenSlider.lastValue) {
    let message = new OSC.Message("/message", "/sketchB/slider2", greenSlider.value());
    osc.send(message);
    greenSlider.lastValue = greenSlider.value();
  }

  // Only send if value has actually changed
  let currentFaderValue = fader1.value();
  if (abs(currentFaderValue - lastFaderValue) > 0.1) {
    // Add small threshold to prevent jitter
    const normalizedValue = map(currentFaderValue, 0, 255, 0, 1);
    let message = new OSC.Message("/message", "/fader1", normalizedValue);
    osc.send(message);
    lastFaderValue = currentFaderValue;
  }
}

let osc;

let params = {
  var1: 50,
};

function setup() {
  osc = new OSC();
  osc.open({ host: "localhost", port: 8080 });

  let gui = new dat.GUI();
  const folder = gui.addFolder("Settings");
  controller = folder.add(params, "var1", 0, 200, 5);
  controller.onChange((val) => {
    console.log("Value updated:", map(val, 0, 200, 0, 1));

    let message = new OSC.Message("/message", "/fader1", map(val, 10, 200, 0, 1));
    osc.send(message);
  });
}

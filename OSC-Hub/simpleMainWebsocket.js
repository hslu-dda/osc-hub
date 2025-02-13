const { app, BrowserWindow } = require("electron");
const OSC = require("osc-js");
let mainWindow;

// Create an OSC WebSocket Server
const osc = new OSC({ plugin: new OSC.WebsocketServerPlugin() });

// Handle incoming messages
osc.on("/message", (message) => {
  console.log(`Received message on /message:`, message.args);

  // Create and send the update message more explicitly
  const updateMessage = new OSC.Message("/update", ...message.args);
  console.log("Forwarding to /update:", updateMessage.args);

  try {
    osc.send(updateMessage);
    console.log("Forward completed");
  } catch (error) {
    console.error("Error forwarding message:", error);
  }
});

// Add a general message handler to see all incoming messages
osc.on("*", (message) => {
  console.log(`Debug - Received on ${message.address}:`, message.args);
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadFile("index.html");

  osc.open({ host: "0.0.0.0", port: 8080 });
  console.log("Electron OSC Server running on ws://localhost:8080");

  // Send heartbeat message every second
  setInterval(() => {
    const timestamp = new Date().toLocaleTimeString();
    try {
      osc.send(new OSC.Message("/update", `Server heartbeat: ${timestamp}`));
      console.log("Sent heartbeat");
    } catch (error) {
      console.error("Error sending heartbeat:", error);
    }
  }, 5000);
});

// Add connection event handlers
osc.on("open", (client) => {
  console.log("New client connected");
});

osc.on("close", (client) => {
  console.log("Client disconnected");
});

osc.on("error", (error) => {
  console.error("Server error:", error);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

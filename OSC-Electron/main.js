const { app, BrowserWindow, ipcMain } = require("electron");
const OSC = require("osc-js");
const osc = require("node-osc");
const os = require("os");
let mainWindow;

// Track cleanup state
let isCleaningUp = false;

// Track TouchOSC IP
let touchOscIp = null;

// Heartbeat control
let heartbeatInterval = null;
let heartbeatDelay = 5000;

// Get IP address for UDP OSC
const networks = os.networkInterfaces();
const ip =
  Object.values(networks)
    .flat()
    .find((n) => !n.internal && n.family === "IPv4")?.address || "127.0.0.1";

// Create WebSocket OSC Server (for p5.js)
const wsOsc = new OSC({ plugin: new OSC.WebsocketServerPlugin() });

// Create UDP OSC Server/Client (for TouchOSC)
let oscServer, oscClient;

function setupUDPOSC(port = 12000) {
  try {
    oscServer = new osc.Server(port, "0.0.0.0");
    oscClient = new osc.Client("127.0.0.1", 9000);

    console.log(`[UDP OSC] Server listening on port ${port} (${ip})`);
    console.log(`[UDP OSC] Client ready for TouchOSC on port 9000`);

    // When receiving from TouchOSC, forward to WebSocket clients
    oscServer.on("message", (msg, rinfo) => {
      if (isCleaningUp) return;

      console.log("[UDP] Received from TouchOSC:", msg, "from:", rinfo);
      // Store the TouchOSC IP address
      touchOscIp = rinfo.address;

      // Recreate client with the correct IP if needed
      if (oscClient?.host !== touchOscIp) {
        if (oscClient) oscClient.close();
        oscClient = new osc.Client(touchOscIp, 9000);
        console.log(`[UDP OSC] Client updated to send to ${touchOscIp}:9000`);
      }

      if (!isCleaningUp && wsOsc) {
        wsOsc.send(new OSC.Message("/update", msg[0], ...msg.slice(1)));
      }

      if (mainWindow && !isCleaningUp) {
        mainWindow.webContents.send("osc-message", {
          type: "udp",
          message: msg,
          from: `${rinfo.address}:${rinfo.port}`,
        });
      }
    });
  } catch (error) {
    console.error("[UDP OSC] Setup error:", error.message);
  }
}

// Function to start heartbeat
function startHeartbeat(delay) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  heartbeatDelay = delay;
  heartbeatInterval = setInterval(() => {
    if (!isCleaningUp && wsOsc) {
      const timestamp = new Date().toLocaleTimeString();
      wsOsc.send(new OSC.Message("/update", `Server heartbeat: ${timestamp}`));
    }
  }, heartbeatDelay);
  console.log(`Heartbeat started with ${delay}ms interval`);
}

// Function to stop heartbeat
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("Heartbeat stopped");
  }
}

// Cleanup function for proper shutdown
async function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.log("Cleaning up resources...");

  // Stop heartbeat first
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("Heartbeat stopped");
  }

  // Close UDP OSC Server
  if (oscServer) {
    try {
      oscServer.close();
      console.log("UDP OSC Server closed");
    } catch (error) {
      console.log("UDP OSC Server already closed or error:", error.message);
    }
    oscServer = null;
  }

  // Close UDP OSC Client
  if (oscClient) {
    try {
      oscClient.close();
      console.log("UDP OSC Client closed");
    } catch (error) {
      console.log("UDP OSC Client already closed or error:", error.message);
    }
    oscClient = null;
  }

  // Close WebSocket OSC Server
  if (wsOsc) {
    try {
      // Reset event handlers
      wsOsc.eventHandler = {
        _subscriptions: new Map(),
        _patterns: new Map(),
      };

      // Close WebSocket server using the proper OSC.js method
      if (wsOsc.plugin && wsOsc.plugin.server) {
        wsOsc.plugin.server.close();
      }
      console.log("WebSocket OSC Server closed");
    } catch (error) {
      console.log("WebSocket OSC Server error during cleanup:", error.message);
    }
  }

  // Clear any remaining event listeners
  if (mainWindow) {
    mainWindow.removeAllListeners();
  }
}

// Handle WebSocket messages from p5.js
wsOsc.on("/message", (message) => {
  if (isCleaningUp) return;
  console.log(`[WS] Received from p5.js:`, message.args);

  // Forward to WebSocket clients
  if (!isCleaningUp && wsOsc) {
    const updateMessage = new OSC.Message("/update", ...message.args);
    wsOsc.send(updateMessage);
  }

  // Send to UI
  if (mainWindow && !isCleaningUp) {
    mainWindow.webContents.send("osc-message", {
      type: "websocket",
      message: message.args,
      from: "WebSocket Client",
    });
  }

  // Forward to TouchOSC if we know its IP
  if (!isCleaningUp && touchOscIp && message.args[0]?.startsWith("/")) {
    if (!oscClient || oscClient.host !== touchOscIp) {
      if (oscClient) oscClient.close();
      oscClient = new osc.Client(touchOscIp, 9000);
    }
    oscClient.send(message.args[0], ...message.args.slice(1));
    console.log(`[WS->UDP] Forwarded to TouchOSC at ${touchOscIp}:9000`);
  }
});

wsOsc.on("*", (message) => {
  if (!isCleaningUp) {
    console.log(`[WS] Debug - Received on ${message.address}:`, message.args);
  }
});

// Set up IPC handlers for heartbeat control
ipcMain.on("heartbeat-control", (event, { enabled, delay }) => {
  if (isCleaningUp) return;

  if (enabled) {
    startHeartbeat(delay);
  } else {
    stopHeartbeat();
  }
  // Send back current status
  event.reply("heartbeat-status", {
    enabled: heartbeatInterval !== null,
    delay: heartbeatDelay,
  });
});

// Handle test messages
ipcMain.on("send-test-message", (event, message) => {
  if (isCleaningUp) return;

  // Send to WebSocket clients
  if (wsOsc) {
    wsOsc.send(new OSC.Message("/update", message.message[1]));
  }

  // Send to UI for logging
  if (mainWindow) {
    mainWindow.webContents.send("osc-message", {
      type: "websocket",
      message: message.message,
      from: "Test Button",
    });
  }

  // Forward to TouchOSC if connected
  if (touchOscIp && oscClient) {
    oscClient.send("/update", message.message[1]);
    console.log(`[TEST->UDP] Forwarded to TouchOSC at ${touchOscIp}:9000`);
  }
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 820,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Start both servers
  setupUDPOSC(12000);

  try {
    wsOsc.open({ host: "0.0.0.0", port: 8080 });
    console.log("WebSocket OSC server started successfully");
    if (mainWindow && !isCleaningUp) {
      mainWindow.webContents.send("ws-status", {
        status: "Connected",
        clients: wsOsc.clients?.size || 0,
      });
    }
  } catch (error) {
    console.error("WebSocket OSC server failed to start:", error);
    if (mainWindow && !isCleaningUp) {
      mainWindow.webContents.send("ws-status", {
        status: "Error",
        error: error.message,
      });
    }
  }

  console.log("OSC Servers running:");
  console.log("- WebSocket (p5.js): ws://localhost:8080");
  console.log(`- UDP (TouchOSC): ${ip}:12000`);

  // Start initial heartbeat
  startHeartbeat(5000);
});

wsOsc.on("open", (client) => {
  if (isCleaningUp) return;
  console.log("[WS] New client connected");
  if (mainWindow) {
    mainWindow.webContents.send("ws-client", {
      event: "connected",
      id: client,
    });
    // Update status with current number of clients
    mainWindow.webContents.send("ws-status", {
      status: "Connected",
      clients: wsOsc.clients?.size || 1,
    });
  }
});

wsOsc.on("close", (client) => {
  if (isCleaningUp) return;
  console.log("[WS] Client disconnected");
  if (mainWindow) {
    mainWindow.webContents.send("ws-client", {
      event: "disconnected",
      id: client,
    });
    mainWindow.webContents.send("ws-status", {
      status: "Connected",
      clients: wsOsc.clients?.size || 0,
    });
  }
});

wsOsc.on("error", (error) => {
  if (isCleaningUp) return;
  console.error("[WS] Server error:", error);
  if (mainWindow) {
    mainWindow.webContents.send("ws-status", {
      status: "Error",
      error: error.message,
    });
  }
});

// Ensure cleanup and quit - Single point of exit
app.on("before-quit", (event) => {
  if (!isCleaningUp) {
    event.preventDefault();
    cleanup().finally(() => {
      app.quit();
    });
  }
});

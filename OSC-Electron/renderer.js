// Get required electron components
const { ipcRenderer } = require("electron");

// DOM Elements
const elements = {
  heartbeatToggle: document.getElementById("heartbeat-toggle"),
  heartbeatDelay: document.getElementById("heartbeat-delay"),
  wsStatus: document.getElementById("ws-status"),
  wsClients: document.getElementById("ws-clients"),
  udpServer: document.getElementById("udp-server"),
  messageContainer: document.getElementById("message-container"),
};

// Heartbeat state
let heartbeatEnabled = false;

// Initialize IP address
async function fetchServerIP() {
  try {
    const networks = await require("os").networkInterfaces();
    const ip =
      Object.values(networks)
        .flat()
        .find((n) => !n.internal && n.family === "IPv4")?.address || "127.0.0.1";
    elements.udpServer.innerText = `${ip}:12000`;
  } catch (error) {
    console.error("Error getting IP:", error);
    elements.udpServer.innerText = "Error fetching IP";
  }
}

// Update heartbeat controls UI
function updateHeartbeatControls(enabled, delay) {
  heartbeatEnabled = enabled;
  elements.heartbeatToggle.textContent = enabled ? "Stop Heartbeat" : "Start Heartbeat";
  elements.heartbeatToggle.className = enabled ? "button button-stop" : "button button-start";
  if (delay) elements.heartbeatDelay.value = delay;
}

// Message logging
function addMessage(type, content) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  msgDiv.innerHTML = `[${timestamp}] ${content}`;
  elements.messageContainer.insertBefore(msgDiv, elements.messageContainer.firstChild);

  // Keep only last 50 messages
  if (elements.messageContainer.children.length > 50) {
    elements.messageContainer.removeChild(elements.messageContainer.lastChild);
  }
}

// Event Listeners
elements.heartbeatToggle.addEventListener("click", () => {
  const newState = !heartbeatEnabled;
  ipcRenderer.send("heartbeat-control", {
    enabled: newState,
    delay: parseInt(elements.heartbeatDelay.value),
  });
});

elements.heartbeatDelay.addEventListener("change", () => {
  if (heartbeatEnabled) {
    ipcRenderer.send("heartbeat-control", {
      enabled: true,
      delay: parseInt(elements.heartbeatDelay.value),
    });
  }
});

// IPC Event Handlers
ipcRenderer.on("heartbeat-status", (event, { enabled, delay }) => {
  updateHeartbeatControls(enabled, delay);
});

ipcRenderer.on("ws-status", (event, data) => {
  elements.wsStatus.innerText = data.status;
  elements.wsStatus.className = `status-text status-${data.status.toLowerCase()}`;
  elements.wsClients.innerText = data.clients || 0;
});

ipcRenderer.on("osc-message", (event, data) => {
  const messageType = data.type || "udp";
  addMessage(messageType, `${JSON.stringify(data.message)} from ${data.from}`);
});

ipcRenderer.on("ws-client", (event, data) => {
  addMessage("websocket", `Client ${data.event}: ${data.id}`);
});

// Initialize
fetchServerIP();
updateHeartbeatControls(false, 5000); // Start with heartbeat disabled

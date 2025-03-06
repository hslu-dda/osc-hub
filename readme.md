# OSC Hub

A WebSocket and UDP bridge for OSC (Open Sound Control) communication between web applications, p5.js sketches, and OSC-compatible software like TouchOSC.

## Overview

The OSC Hub is an Electron application that facilitates communication between:

1. **WebSocket clients** (like p5.js sketches) using the osc-js library
2. **UDP clients** (like TouchOSC) using the node-osc library
3. **Other OSC-compatible software** (Max/MSP, Pure Data, SuperCollider, etc.)

This hub acts as a central relay, allowing multiple clients to communicate without requiring direct OSC implementation in the browser.

## Features

- WebSocket server for browser-based clients (port 8080)
- UDP server for hardware/software OSC clients (port 12000)
- Automatic discovery of TouchOSC clients
- Message relay between all connected clients
- Heartbeat system to verify connectivity
- Clean shutdown and resource management
- Electron-based user interface for monitoring

## Connection Details

- **WebSocket Server (for p5.js)**: `ws://localhost:8080`
- **UDP Server (for TouchOSC)**: Your local IP address, port 12000
- **TouchOSC Output**: Automatically detected, port 9000

## Using with p5.js Sketches

Two example p5.js sketches are provided: a sender and a receiver. Both use the osc-js library.

### Setting Up a p5.js Sketch

1. Include the osc-js library in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/osc-js/lib/osc.min.js"></script>
```

2. Initialize OSC connection in your sketch:

```javascript
let osc;

function setup() {
  // Initialize OSC
  osc = new OSC();
  osc.open({ host: "localhost", port: 8080 });

  // Listen for incoming messages
  osc.on("/update", (message) => {
    console.log("Received:", message.args);
    // Handle your messages here
  });
}
```

### Sending OSC Messages

Send messages using the `/message` address pattern, which the hub will relay:

```javascript
// Format: send to /message with first arg as target address, followed by data
let message = new OSC.Message("/message", "/myAddress", 123, "value");
osc.send(message);
```

### Receiving OSC Messages

Listen for messages on the `/update` address pattern:

```javascript
osc.on("/update", (message) => {
  const address = message.args[0]; // First arg is the original address
  const value = message.args[1]; // Second arg is the value

  switch (true) {
    case address.startsWith("/slider1"):
      // Handle slider1 data
      break;
    case address.startsWith("/fader1"):
      // Handle fader1 data
      break;
  }
});
```

## Example Sketches

Two example sketches are included:

### Sketch A (Sender)

- Uses sliders to send RGB values
- Listens for values from Sketch B to update its background

### Sketch B (Receiver)

- Receives values from Sketch A
- Sends its own slider values back to Sketch A
- Also works with TouchOSC faders

## Using with TouchOSC

1. Configure TouchOSC to send to your computer's IP address on port 12000
2. Configure TouchOSC to receive on port 9000
3. Create OSC controls with addresses like `/fader1`, `/fader2`, etc.

The hub will automatically detect TouchOSC's IP address when it receives the first message.

## Message Format

The hub uses a consistent message format for relaying messages:

- **WebSocket to WebSocket**: Messages sent to `/message` are relayed to all clients on `/update`
- **UDP to WebSocket**: Messages from TouchOSC are relayed to WebSocket clients on `/update`
- **WebSocket to UDP**: Messages with proper OSC addresses are forwarded to TouchOSC

## Heartbeat System

The hub sends regular heartbeat messages to all WebSocket clients to verify connectivity. This can be controlled through the UI or via IPC messages.

## Troubleshooting

- **Connection Issues**: Check that your firewall allows connections on ports 8080 and 12000
- **Message Not Received**: Ensure you're using the correct address patterns (/message for sending, /update for receiving)
- **TouchOSC Not Connecting**: Make sure your device is on the same network and the ports are configured correctly

## License

This project is licensed under the MIT License - see the LICENSE file for details.

const { WebSocketServer } = require('ws');

class TelemetryWsServer {
  constructor(httpServer) {
    this.clients = new Set();
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws/telemetry' });

    // VULNERABILITY A07: WebSocket server accepts connections without authentication token validation.
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe') {
            ws.subscribedDeviceIds = msg.device_ids;
          }
        } catch (_) {
          // ignore malformed messages
        }
      });
    });

    console.log('WebSocket server listening at /ws/telemetry');
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  close() {
    this.wss.close();
  }
}

module.exports = { TelemetryWsServer };

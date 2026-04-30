import { Hono } from 'hono'

// --- 1. The Durable Object Class ---
export class LogRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = []; // Keep track of active WebSockets
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Handle WebSocket Upgrades
    if (url.pathname === '/ws') {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const { 0: client, 1: server } = new WebSocketPair();

      this.state.acceptWebSocket(server);
      this.sessions.push(server);

      // Send log history to the new client immediately
      const logs = await this.state.storage.get("logs") || [];
      server.send(JSON.stringify({ type: 'history', logs }));

      return new Response(null, { status: 101, webSocket: client });
    }

    // Handle incoming logs from Unity
    if (url.pathname === '/log' && request.method === 'POST') {
      const data = await request.json();
      if (data && data.message) {
        // 1. Save to DO storage
        let logs = await this.state.storage.get("logs") || [];
        logs.push(data.message);
        await this.state.storage.put("logs", logs);

        // 2. Broadcast to all connected WebSockets instantly
        const broadcastData = JSON.stringify({ type: 'new_log', log: data.message });
        for (const session of this.sessions) {
          try {
            session.send(broadcastData);
          } catch (err) {
            // Error handling for dead connections
            this.sessions = this.sessions.filter(s => s !== session);
          }
        }
        return new Response(JSON.stringify({ status: "success" }), { status: 200 });
      }
    }

    // Not actually in use: regular HTTP history endpoint
    if (url.pathname === '/get_logs') {
      const logs = await this.state.storage.get("logs") || [];
      return new Response(JSON.stringify(logs), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response("Not found", { status: 404 });
  }

  // Handle WebSocket disconnections
  webSocketClose(ws, code, reason, wasClean) {
    this.sessions = this.sessions.filter(session => session !== ws);
  }

  webSocketError(ws, error) {
    this.sessions = this.sessions.filter(session => session !== ws);
  }

  // Handle incoming WebSocket messages (like pings from client)
  webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err) {
      // Ignore non-JSON messages
    }
  }
}

// --- 2. The Worker Entrypoint (Hono App) ---
const app = new Hono()

// Helper to forward requests to the single Durable Object instance
const forwardToDurableObject = async (c) => {
  // We use a hardcoded name "mrux-logs" so all clients connect to the same room
  const id = c.env.LOG_ROOM.idFromName("mrux-logs");
  const stub = c.env.LOG_ROOM.get(id);
  return await stub.fetch(c.req.raw);
}

// Route the specific endpoints to the Durable Object
app.post('/log', forwardToDurableObject)
app.get('/get_logs', forwardToDurableObject)
app.get('/ws', forwardToDurableObject)

export default app
# 09 - WebSockets in FastAPI

## Overview

FastAPI has built-in WebSocket support through Starlette. If you've used the `ws` or `socket.io` packages in Node.js, the concepts are the same -- persistent bidirectional connections between client and server.

### Comparison

| Feature | socket.io (Node.js) | ws (Node.js) | FastAPI WebSocket |
|---|---|---|---|
| Protocol | Custom (falls back to WS) | Raw WebSocket | Raw WebSocket |
| Rooms/namespaces | Built-in | Manual | Manual |
| Auto-reconnect | Built-in (client) | Manual | Manual |
| Broadcasting | Built-in | Manual | Manual |
| Binary support | Yes | Yes | Yes |
| Complexity | High-level | Low-level | Low-level |

FastAPI's WebSocket support is more like the `ws` package than socket.io -- it gives you the raw WebSocket protocol without extra abstractions.

---

## Basic WebSocket Endpoint

### Node.js (ws package)

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```

### FastAPI

```python
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()  # Must accept the connection first
    print("Client connected")

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            print(f"Received: {data}")

            # Send response
            await websocket.send_text(f"Echo: {data}")
    except Exception:
        print("Client disconnected")
```

### Key Differences

1. **Decorator-based routing**: `@app.websocket("/ws")` instead of a separate server
2. **Async/await**: Everything is async in FastAPI WebSocket handlers
3. **Same server**: WebSocket routes share the same server as HTTP routes
4. **Must call `accept()`**: Unlike `ws` in Node.js where the connection is already established

---

## WebSocket Methods

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # --- Sending Data ---
    await websocket.send_text("Hello!")                       # Send string
    await websocket.send_bytes(b"\x00\x01\x02")              # Send binary
    await websocket.send_json({"type": "greeting", "data": "hi"})  # Send JSON

    # --- Receiving Data ---
    text = await websocket.receive_text()        # Receive string
    binary = await websocket.receive_bytes()     # Receive binary
    json_data = await websocket.receive_json()   # Receive and parse JSON

    # --- Generic receive (returns dict with type info) ---
    message = await websocket.receive()
    # message = {"type": "websocket.receive", "text": "hello"}
    # or {"type": "websocket.receive", "bytes": b"..."}
    # or {"type": "websocket.disconnect"}

    # --- Closing ---
    await websocket.close(code=1000, reason="Done")
```

---

## Connection Manager Pattern

This is the most important WebSocket pattern -- managing multiple connections for broadcasting. It's the equivalent of socket.io rooms, but done manually.

### socket.io (Node.js)

```javascript
io.on('connection', (socket) => {
  socket.join('chat-room');
  io.to('chat-room').emit('message', { text: 'Hello everyone!' });
});
```

### FastAPI Connection Manager

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

class ConnectionManager:
    """Manages WebSocket connections (like a simple socket.io room)."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        """Send to all connected clients (like io.emit())."""
        for connection in self.active_connections:
            await connection.send_text(message)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            await connection.send_json(data)

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all connected clients
            await manager.broadcast(f"Someone said: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast("A user left the chat")
```

### Multi-Room Connection Manager

```python
class RoomManager:
    """Like socket.io rooms."""

    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room: str, websocket: WebSocket):
        await websocket.accept()
        if room not in self.rooms:
            self.rooms[room] = []
        self.rooms[room].append(websocket)

    def disconnect(self, room: str, websocket: WebSocket):
        if room in self.rooms:
            self.rooms[room].remove(websocket)
            if not self.rooms[room]:
                del self.rooms[room]

    async def broadcast_to_room(self, room: str, message: dict):
        """Like io.to(room).emit()"""
        if room in self.rooms:
            for connection in self.rooms[room]:
                await connection.send_json(message)

    async def broadcast_to_room_except(
        self, room: str, message: dict, exclude: WebSocket
    ):
        """Like socket.to(room).emit() -- excludes the sender."""
        if room in self.rooms:
            for connection in self.rooms[room]:
                if connection != exclude:
                    await connection.send_json(message)

room_manager = RoomManager()

@app.websocket("/ws/rooms/{room_name}")
async def room_endpoint(websocket: WebSocket, room_name: str):
    await room_manager.connect(room_name, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast to room, excluding sender
            await room_manager.broadcast_to_room_except(
                room_name,
                {"type": "message", "data": data},
                exclude=websocket,
            )
    except WebSocketDisconnect:
        room_manager.disconnect(room_name, websocket)
        await room_manager.broadcast_to_room(
            room_name,
            {"type": "system", "data": "A user left"},
        )
```

---

## Path Parameters and Query Parameters

WebSocket routes support the same parameters as HTTP routes.

```python
@app.websocket("/ws/users/{user_id}")
async def user_websocket(websocket: WebSocket, user_id: int):
    await websocket.accept()
    await websocket.send_json({"message": f"Connected as user {user_id}"})

    while True:
        data = await websocket.receive_json()
        await websocket.send_json({"user_id": user_id, "echo": data})
```

### Query Parameters

```python
# Connect: ws://localhost:8000/ws?token=abc123&room=general
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = None,
    room: str = "default",
):
    if not token or not verify_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    await websocket.send_json({"room": room, "status": "connected"})
    # ...
```

---

## WebSocket Authentication

### Method 1: Query Parameter Token (Simple)

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    # Verify before accepting
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    user = verify_jwt(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await websocket.accept()
    await websocket.send_json({"message": f"Welcome, {user['name']}"})

    # ... handle messages
```

Client:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws?token=eyJ...');
```

### Method 2: First Message Authentication

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Wait for auth message
    try:
        auth_data = await websocket.receive_json()
        if auth_data.get("type") != "auth":
            await websocket.close(code=4001, reason="Expected auth message")
            return

        user = verify_jwt(auth_data.get("token", ""))
        if not user:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close(code=4001)
            return

        await websocket.send_json({"type": "auth_success", "user": user["name"]})

        # Now handle regular messages
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "echo", "data": data})

    except WebSocketDisconnect:
        pass
```

Client:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'auth', token: 'eyJ...' }));
};
```

### Method 3: Cookie Authentication

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Cookies are sent automatically by the browser
    cookies = websocket.cookies
    session_id = cookies.get("session_id")

    if not session_id or not verify_session(session_id):
        await websocket.close(code=4001, reason="Not authenticated")
        return

    await websocket.accept()
    # ...
```

---

## Real-World Chat Application

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from datetime import datetime
from pydantic import BaseModel
import json

app = FastAPI()

# --- Models ---
class ChatMessage(BaseModel):
    type: str  # "message", "join", "leave"
    username: str
    content: str = ""
    timestamp: str = ""

# --- Connection Manager ---
class ChatManager:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}  # username -> websocket
        self.message_history: list[dict] = []

    async def connect(self, username: str, websocket: WebSocket):
        if username in self.connections:
            await websocket.close(code=4002, reason="Username taken")
            return False

        await websocket.accept()
        self.connections[username] = websocket

        # Send message history to new user
        await websocket.send_json({
            "type": "history",
            "messages": self.message_history[-50:],  # Last 50 messages
        })

        # Broadcast join notification
        await self.broadcast({
            "type": "join",
            "username": username,
            "content": f"{username} joined the chat",
            "timestamp": datetime.now().isoformat(),
            "online_users": list(self.connections.keys()),
        })

        return True

    async def disconnect(self, username: str):
        if username in self.connections:
            del self.connections[username]
            await self.broadcast({
                "type": "leave",
                "username": username,
                "content": f"{username} left the chat",
                "timestamp": datetime.now().isoformat(),
                "online_users": list(self.connections.keys()),
            })

    async def broadcast(self, message: dict):
        self.message_history.append(message)
        # Keep only last 100 messages
        if len(self.message_history) > 100:
            self.message_history = self.message_history[-100:]

        disconnected = []
        for username, ws in self.connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(username)

        # Clean up dead connections
        for username in disconnected:
            del self.connections[username]

chat = ChatManager()

@app.websocket("/ws/chat/{username}")
async def chat_websocket(websocket: WebSocket, username: str):
    connected = await chat.connect(username, websocket)
    if not connected:
        return

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "message":
                await chat.broadcast({
                    "type": "message",
                    "username": username,
                    "content": data.get("content", ""),
                    "timestamp": datetime.now().isoformat(),
                })
    except WebSocketDisconnect:
        await chat.disconnect(username)

# Serve a simple HTML client for testing
@app.get("/chat")
def chat_page():
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Chat</h1>
        <div id="messages" style="height:400px; overflow-y:scroll; border:1px solid #ccc; padding:10px;"></div>
        <input id="input" type="text" placeholder="Type a message..." style="width:80%;">
        <button onclick="send()">Send</button>
        <script>
            const username = prompt("Enter your username:");
            const ws = new WebSocket(`ws://localhost:8000/ws/chat/${username}`);

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                const div = document.getElementById("messages");
                if (msg.type === "message") {
                    div.innerHTML += `<p><b>${msg.username}:</b> ${msg.content}</p>`;
                } else if (msg.type === "join" || msg.type === "leave") {
                    div.innerHTML += `<p style="color:gray;"><i>${msg.content}</i></p>`;
                } else if (msg.type === "history") {
                    msg.messages.forEach(m => {
                        if (m.type === "message") {
                            div.innerHTML += `<p><b>${m.username}:</b> ${m.content}</p>`;
                        }
                    });
                }
                div.scrollTop = div.scrollHeight;
            };

            function send() {
                const input = document.getElementById("input");
                ws.send(JSON.stringify({ type: "message", content: input.value }));
                input.value = "";
            }

            document.getElementById("input").addEventListener("keypress", (e) => {
                if (e.key === "Enter") send();
            });
        </script>
    </body>
    </html>
    """)
```

---

## Handling Binary Data

```python
@app.websocket("/ws/binary")
async def binary_websocket(websocket: WebSocket):
    await websocket.accept()

    while True:
        # Receive binary data (like file chunks)
        data = await websocket.receive_bytes()
        print(f"Received {len(data)} bytes")

        # Process and send back
        processed = data.upper()  # Example: uppercase for text bytes
        await websocket.send_bytes(processed)
```

---

## WebSocket with Background Processing

```python
import asyncio

@app.websocket("/ws/live-data")
async def live_data_endpoint(websocket: WebSocket):
    """Push data to the client at intervals (like a live dashboard)."""
    await websocket.accept()

    try:
        while True:
            # Simulate fetching live data
            data = {
                "timestamp": datetime.now().isoformat(),
                "cpu_usage": 45.2,
                "memory_usage": 67.8,
                "active_users": 142,
            }
            await websocket.send_json(data)
            await asyncio.sleep(1)  # Push every second
    except WebSocketDisconnect:
        print("Client disconnected from live data")
```

### Bidirectional: Push Updates + Receive Commands

```python
@app.websocket("/ws/dashboard")
async def dashboard_endpoint(websocket: WebSocket):
    await websocket.accept()

    async def send_updates():
        """Task: continuously push data."""
        while True:
            data = get_dashboard_data()
            await websocket.send_json({"type": "update", "data": data})
            await asyncio.sleep(2)

    async def receive_commands():
        """Task: listen for client commands."""
        while True:
            message = await websocket.receive_json()
            if message["type"] == "subscribe":
                # Handle subscription changes
                pass
            elif message["type"] == "refresh":
                data = get_dashboard_data()
                await websocket.send_json({"type": "update", "data": data})

    # Run both tasks concurrently
    try:
        await asyncio.gather(send_updates(), receive_commands())
    except WebSocketDisconnect:
        print("Dashboard client disconnected")
```

---

## Practice Exercises

### Exercise 1: Echo Server
Create a WebSocket echo server at `/ws/echo` that:
- Accepts text messages and sends them back with a timestamp
- Accepts JSON messages and echoes them with an added `received_at` field
- Handles disconnections gracefully

### Exercise 2: Chat Room
Build a multi-room chat system:
- `WS /ws/chat/{room_name}` -- join a room
- First message must be `{"type": "auth", "username": "..."}`
- Support message types: "message", "typing" (broadcast to room)
- Track and broadcast who's online in each room
- Send last 20 messages as history on join

### Exercise 3: Live Notifications
Create a notification system:
- `POST /notifications` -- HTTP endpoint to create a notification for a user
- `WS /ws/notifications/{user_id}` -- WebSocket for receiving notifications
- When a notification is created via HTTP, push it to the connected user in real-time
- Queue notifications for offline users and deliver when they connect

### Exercise 4: Collaborative Counter
Build a shared counter that multiple clients can increment:
- `WS /ws/counter` -- connect to see and modify the counter
- Messages: `{"action": "increment"}`, `{"action": "decrement"}`, `{"action": "reset"}`
- Broadcast the current count to ALL connected clients on every change
- Send the current count to new clients on connect

### Exercise 5: WebSocket + Authentication
Implement a secure WebSocket endpoint:
- Clients must pass a JWT token as a query parameter
- Verify the token before accepting the connection
- Close with code 4001 if the token is invalid or expired
- Once authenticated, allow the user to send/receive messages
- Include the username (from JWT) in all broadcast messages

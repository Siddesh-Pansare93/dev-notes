# 09 - WebSockets in FastAPI

## Overview

FastAPI mein WebSocket support built-in hai Starlette ke through. Agar tumne Node.js mein `ws` ya `socket.io` use kiye ho, toh concept bilkul same hi hai — client aur server ke beech ek persistent bidirectional connection, jaise Zomato delivery partner aur restaurant ke beech real-time chat hota hai.

### Comparison

| Feature | socket.io (Node.js) | ws (Node.js) | FastAPI WebSocket |
|---|---|---|---|
| Protocol | Custom (falls back to WS) | Raw WebSocket | Raw WebSocket |
| Rooms/namespaces | Built-in | Manual | Manual |
| Auto-reconnect | Built-in (client) | Manual | Manual |
| Broadcasting | Built-in | Manual | Manual |
| Binary support | Yes | Yes | Yes |
| Complexity | High-level | Low-level | Low-level |

FastAPI ka WebSocket support zyada `ws` package jaisa hai socket.io ke bajaay — tumhe raw WebSocket protocol milta hai bina extra layers ke.

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
    await websocket.accept()  # Pehle connection ko accept karna zaroori hai
    print("Client connected")

    try:
        while True:
            # Message receive karo
            data = await websocket.receive_text()
            print(f"Received: {data}")

            # Response bhejo
            await websocket.send_text(f"Echo: {data}")
    except Exception:
        print("Client disconnected")
```

### Key Differences

1. **Decorator-based routing**: `@app.websocket("/ws")` — alag server banane ki zaroorat nahi
2. **Async/await**: FastAPI mein sab kuch async hota hai WebSocket handlers mein
3. **Same server**: WebSocket routes aur HTTP routes ek hi server par chlte hain, jaise Zomato app mein food order aur delivery tracking same platform par chlti hai
4. **Must call `accept()`**: Node.js `ws` mein connection pehle se hi establish hota hai, yaha explicitly accept() call karna padta hai

---

## WebSocket Methods

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # --- Data Bhejno ---
    await websocket.send_text("Hello!")                       # String bhejo
    await websocket.send_bytes(b"\x00\x01\x02")              # Binary data bhejo
    await websocket.send_json({"type": "greeting", "data": "hi"})  # JSON bhejo

    # --- Data Receive Karo ---
    text = await websocket.receive_text()        # String receive karo
    binary = await websocket.receive_bytes()     # Binary receive karo
    json_data = await websocket.receive_json()   # JSON parse karke receive karo

    # --- Generic receive (type info ke saath dict milta hai) ---
    message = await websocket.receive()
    # message = {"type": "websocket.receive", "text": "hello"}
    # ya {"type": "websocket.receive", "bytes": b"..."}
    # ya {"type": "websocket.disconnect"}

    # --- Connection Band Karo ---
    await websocket.close(code=1000, reason="Done")
```

---

## Connection Manager Pattern

Ye sabse zaroori WebSocket pattern hai — multiple connections ko manage karna aur sabko broadcast karna. Socket.io rooms jaisa, par manually karna padta hai. Jaise Swiggy mein har restaurant ka ek separate manager hota hai jo har delivery ko track karta hai.

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
    """WebSocket connections ko manage karta hai (jaise socket.io room)."""

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
        """Sab connected clients ko bhejo (io.emit() jaisa)."""
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
            # Sab connected clients ko broadcast karo
            await manager.broadcast(f"Someone said: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast("A user left the chat")
```

### Multi-Room Connection Manager

```python
class RoomManager:
    """Socket.io rooms jaisa."""

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
        """io.to(room).emit() jaisa"""
        if room in self.rooms:
            for connection in self.rooms[room]:
                await connection.send_json(message)

    async def broadcast_to_room_except(
        self, room: str, message: dict, exclude: WebSocket
    ):
        """socket.to(room).emit() jaisa — sender ko exclude karta hai."""
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
            # Room ko broadcast karo, sender ko exclude karke
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

## Path Parameters aur Query Parameters

WebSocket routes mein bhi same parameters use ho sakte ho jaise HTTP routes mein.

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
    # Accept karne se pehle verify karo
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    user = verify_jwt(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await websocket.accept()
    await websocket.send_json({"message": f"Welcome, {user['name']}"})

    # ... messages handle karo
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

    # Auth message wait karo
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

        # Ab regular messages handle karo
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
    # Browser automatically cookies bhej deta hai
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

        # Naye user ko message history bhejo
        await websocket.send_json({
            "type": "history",
            "messages": self.message_history[-50:],  # Last 50 messages
        })

        # Sab ko join notification broadcast karo
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
        # Sirf last 100 messages rakhte ho
        if len(self.message_history) > 100:
            self.message_history = self.message_history[-100:]

        disconnected = []
        for username, ws in self.connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(username)

        # Dead connections ko clean up karo
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

# Testing ke liye simple HTML client serve karo
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

## Binary Data Handle Karna

```python
@app.websocket("/ws/binary")
async def binary_websocket(websocket: WebSocket):
    await websocket.accept()

    while True:
        # Binary data receive karo (file chunks jaisa)
        data = await websocket.receive_bytes()
        print(f"Received {len(data)} bytes")

        # Process karo aur wapas bhejo
        processed = data.upper()  # Example: uppercase for text bytes
        await websocket.send_bytes(processed)
```

---

## WebSocket with Background Processing

```python
import asyncio

@app.websocket("/ws/live-data")
async def live_data_endpoint(websocket: WebSocket):
    """Client ko intervals mein data push karo (live dashboard jaisa)."""
    await websocket.accept()

    try:
        while True:
            # Live data fetch karo (simulate)
            data = {
                "timestamp": datetime.now().isoformat(),
                "cpu_usage": 45.2,
                "memory_usage": 67.8,
                "active_users": 142,
            }
            await websocket.send_json(data)
            await asyncio.sleep(1)  # Har second push karo
    except WebSocketDisconnect:
        print("Client disconnected from live data")
```

### Bidirectional: Push Updates + Receive Commands

```python
@app.websocket("/ws/dashboard")
async def dashboard_endpoint(websocket: WebSocket):
    await websocket.accept()

    async def send_updates():
        """Task: continuously data push karo."""
        while True:
            data = get_dashboard_data()
            await websocket.send_json({"type": "update", "data": data})
            await asyncio.sleep(2)

    async def receive_commands():
        """Task: client commands listen karo."""
        while True:
            message = await websocket.receive_json()
            if message["type"] == "subscribe":
                # Subscription changes handle karo
                pass
            elif message["type"] == "refresh":
                data = get_dashboard_data()
                await websocket.send_json({"type": "update", "data": data})

    # Dono tasks ko concurrently run karo
    try:
        await asyncio.gather(send_updates(), receive_commands())
    except WebSocketDisconnect:
        print("Dashboard client disconnected")
```

---

## Practice Exercises

### Exercise 1: Echo Server
Ek WebSocket echo server `/ws/echo` mein banao jo:
- Text messages accept kare aur timestamp ke saath wapas bheje
- JSON messages accept kare aur ek `received_at` field ke saath echo kare
- Disconnections ko gracefully handle kare

### Exercise 2: Chat Room
Ek multi-room chat system banao:
- `WS /ws/chat/{room_name}` — room join karo
- Pehla message `{"type": "auth", "username": "..."}` hona chahiye
- Support message types: "message", "typing" (room ko broadcast karo)
- Track karo aur broadcast karo ki har room mein kaun online hai
- Join pe last 20 messages history ke saath send karo

### Exercise 3: Live Notifications
Ek notification system banao:
- `POST /notifications` — HTTP endpoint notification create karne ke liye
- `WS /ws/notifications/{user_id}` — WebSocket notifications receive karne ke liye
- Jab HTTP se notification create ho, usse real-time mein connected user ko push karo
- Offline users ke liye notifications queue karo aur deliver karo jab woh connect ho

### Exercise 4: Collaborative Counter
Ek shared counter banao jo multiple clients increment kar sakein:
- `WS /ws/counter` — connect karo counter dekne aur modify karne ke liye
- Messages: `{"action": "increment"}`, `{"action": "decrement"}`, `{"action": "reset"}`
- Har change par current count ko SABHИ connected clients ko broadcast karo
- Naye clients ko connect hote hi current count send karo

### Exercise 5: WebSocket + Authentication
Ek secure WebSocket endpoint implement karo:
- Clients ko JWT token query parameter mein pass karna chahiye
- Accept karne se pehle token verify karo
- Close karo code 4001 ke saath agar token invalid ya expired ho
- Authentication ke baad user ko messages send/receive karne do
- Sab broadcast messages mein username (JWT se) include karo

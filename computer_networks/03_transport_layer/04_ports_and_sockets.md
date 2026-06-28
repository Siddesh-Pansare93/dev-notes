# Port Numbers and Sockets

Port numbers and sockets are the addressing mechanism of the transport layer. While IP addresses identify hosts on a network, port numbers identify specific processes on a host. Together, they form **sockets** -- the endpoints of network communication.

---

## What You'll Learn

- What port numbers are and how they enable multiplexing
- The three port number ranges: well-known, registered, and ephemeral
- What sockets are and how they combine IPs and ports
- Socket programming fundamentals in Python
- How to inspect active connections using `netstat` and `ss`
- Common port numbers every network professional should know

---

## What Are Port Numbers?

A port number is a **16-bit unsigned integer** (0-65535) that identifies a specific process or service on a host. When a transport-layer segment arrives at a host, the operating system uses the destination port number to deliver the data to the correct application.

```
Incoming packets to host 192.168.1.100:

  Packet 1: dst_port=80   --> delivered to Web Server (Apache/Nginx)
  Packet 2: dst_port=22   --> delivered to SSH Server (sshd)
  Packet 3: dst_port=443  --> delivered to HTTPS Server
  Packet 4: dst_port=3306 --> delivered to MySQL Server

  +----------------------------------------------------------+
  |  Host: 192.168.1.100                                     |
  |                                                          |
  |  +----------+  +--------+  +---------+  +----------+    |
  |  | Web :80  |  | SSH:22 |  | HTTPS   |  | MySQL    |    |
  |  |          |  |        |  | :443    |  | :3306    |    |
  |  +----^-----+  +---^----+  +----^----+  +----^-----+    |
  |       |            |            |            |           |
  |  +----+------------+------------+------------+------+    |
  |  |              Transport Layer                     |    |
  |  |    Demultiplexing based on destination port      |    |
  |  +-------------------------------------------------+    |
  +----------------------------------------------------------+
```

---

## Port Number Ranges

IANA (Internet Assigned Numbers Authority) divides the port space into three ranges:

### Well-Known Ports (0-1023)

Reserved for standard services. On Unix/Linux systems, binding to these ports requires **root/administrator** privileges.

```
Range: 0 - 1023
Access: Requires elevated privileges
Purpose: Standard, globally recognized services
Examples: HTTP (80), HTTPS (443), SSH (22), DNS (53)
```

### Registered Ports (1024-49151)

Assigned by IANA to specific applications upon request. No special privileges are required (on most systems) to bind to these ports.

```
Range: 1024 - 49151
Access: Normal user privileges
Purpose: Application-specific services
Examples: MySQL (3306), PostgreSQL (5432), Redis (6379)
```

### Dynamic/Ephemeral Ports (49152-65535)

Assigned automatically by the OS to client-side connections. When your browser connects to a web server, the OS picks an ephemeral port as the source port.

```
Range: 49152 - 65535 (IANA standard)
       32768 - 60999 (Linux default)
Access: Assigned by the operating system
Purpose: Temporary client-side ports
Lifetime: Exists only for the duration of the connection
```

```
Example: Browser connecting to a web server

  Your computer                    Web server
  192.168.1.10:52431  --------->  93.184.216.34:443
                                        ^
  Ephemeral port                  Well-known port
  (assigned by OS)                (HTTPS)
```

### Port Range Summary

```
  0          1023     1024        49151    49152       65535
  |           |       |             |      |             |
  +===========+-------+-------------+------+=============+
  |Well-Known | (gap) | Registered  |(gap) | Ephemeral   |
  | Ports     |       | Ports       |      | Ports       |
  +===========+-------+-------------+------+=============+
  | HTTP, SSH |       | MySQL,      |      | Client-side |
  | DNS, FTP  |       | Redis, etc. |      | auto-assign |
  +-----------+-------+-------------+------+-------------+
```

---

## Common Ports Reference Table

| Port | Protocol | Service | Description |
|------|----------|---------|-------------|
| 20 | TCP | FTP Data | File Transfer Protocol (data channel) |
| 21 | TCP | FTP Control | File Transfer Protocol (command channel) |
| 22 | TCP | SSH | Secure Shell (remote login) |
| 23 | TCP | Telnet | Unencrypted remote login (deprecated) |
| 25 | TCP | SMTP | Simple Mail Transfer Protocol |
| 53 | TCP/UDP | DNS | Domain Name System |
| 67/68 | UDP | DHCP | Dynamic Host Configuration Protocol |
| 69 | UDP | TFTP | Trivial File Transfer Protocol |
| 80 | TCP | HTTP | HyperText Transfer Protocol |
| 110 | TCP | POP3 | Post Office Protocol v3 |
| 123 | UDP | NTP | Network Time Protocol |
| 143 | TCP | IMAP | Internet Message Access Protocol |
| 161/162 | UDP | SNMP | Simple Network Management Protocol |
| 443 | TCP | HTTPS | HTTP over TLS/SSL |
| 445 | TCP | SMB | Server Message Block (file sharing) |
| 465 | TCP | SMTPS | SMTP over TLS |
| 587 | TCP | SMTP | Mail submission (with STARTTLS) |
| 993 | TCP | IMAPS | IMAP over TLS |
| 995 | TCP | POP3S | POP3 over TLS |
| 3306 | TCP | MySQL | MySQL database server |
| 3389 | TCP | RDP | Remote Desktop Protocol |
| 5432 | TCP | PostgreSQL | PostgreSQL database server |
| 5672 | TCP | AMQP | RabbitMQ messaging |
| 6379 | TCP | Redis | Redis in-memory store |
| 8080 | TCP | HTTP Alt | Common alternative HTTP port |
| 8443 | TCP | HTTPS Alt | Common alternative HTTPS port |
| 27017 | TCP | MongoDB | MongoDB database server |

---

## The Socket Concept

A **socket** is an endpoint for communication, identified by the combination of an IP address and a port number. It is the interface between the application layer and the transport layer.

```
Socket = IP Address + Port Number

Example: 192.168.1.10:80

  +--------------------+
  | Socket             |
  | IP:   192.168.1.10 |
  | Port: 80           |
  +--------------------+
```

### TCP Connection as a Socket Pair

A TCP connection is uniquely identified by **two sockets** (a 4-tuple):

```
TCP Connection = (Source IP, Source Port, Destination IP, Destination Port)

Example:
  Client socket:  192.168.1.10:52431
  Server socket:  93.184.216.34:443
  Connection:     (192.168.1.10, 52431, 93.184.216.34, 443)

Multiple connections to the same server:
  Connection 1: (192.168.1.10, 52431, 93.184.216.34, 443)
  Connection 2: (192.168.1.10, 52432, 93.184.216.34, 443)
  Connection 3: (192.168.1.10, 52433, 93.184.216.34, 443)
  All three are distinct connections (different source ports).
```

### Socket Types

| Type | Constant | Protocol | Description |
|------|----------|----------|-------------|
| Stream socket | `SOCK_STREAM` | TCP | Reliable, ordered, byte-stream |
| Datagram socket | `SOCK_DGRAM` | UDP | Unreliable, unordered, message-based |
| Raw socket | `SOCK_RAW` | IP/ICMP | Direct access to lower-layer protocols |

---

## Socket Programming in Python

### TCP Server and Client

```python
# === TCP SERVER ===
import socket

def tcp_server(host='127.0.0.1', port=8080):
    # 1. Create socket
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # Allow port reuse (avoids "Address already in use" error)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # 2. Bind to address and port
    server_sock.bind((host, port))

    # 3. Listen for incoming connections (backlog=5)
    server_sock.listen(5)
    print(f"TCP server listening on {host}:{port}")

    while True:
        # 4. Accept a connection (blocks until client connects)
        client_sock, client_addr = server_sock.accept()
        print(f"Connection from {client_addr[0]}:{client_addr[1]}")

        # 5. Receive data
        data = client_sock.recv(1024)
        print(f"Received: {data.decode('utf-8')}")

        # 6. Send response
        response = f"Echo: {data.decode('utf-8')}"
        client_sock.sendall(response.encode('utf-8'))

        # 7. Close the client connection
        client_sock.close()

if __name__ == '__main__':
    tcp_server()
```

```python
# === TCP CLIENT ===
import socket

def tcp_client(host='127.0.0.1', port=8080):
    # 1. Create socket
    client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # 2. Connect to server (triggers 3-way handshake)
    client_sock.connect((host, port))
    print(f"Connected to {host}:{port}")

    # 3. Send data
    message = "Hello from TCP client!"
    client_sock.sendall(message.encode('utf-8'))
    print(f"Sent: {message}")

    # 4. Receive response
    data = client_sock.recv(1024)
    print(f"Received: {data.decode('utf-8')}")

    # 5. Close connection (triggers 4-way teardown)
    client_sock.close()

if __name__ == '__main__':
    tcp_client()
```

### Socket Lifecycle Comparison

```
TCP Socket Flow:                  UDP Socket Flow:

Server:                           Server:
  socket()                          socket()
  bind()                            bind()
  listen()                          recvfrom()  <-- blocks
  accept()  <-- blocks              sendto()
  recv()                            close()
  send()
  close()                         Client:
                                    socket()
Client:                             sendto()
  socket()                          recvfrom()
  connect()  <-- 3-way handshake    close()
  send()
  recv()
  close()   <-- 4-way teardown
```

---

## Viewing Connections: netstat and ss

### netstat (Cross-platform)

```bash
# Show all TCP connections
netstat -ant

# Show all UDP listeners
netstat -anu

# Show connections with process names (Linux, requires root)
netstat -tulnp

# Show connections with process names (Windows)
netstat -ano

# Example output:
Proto  Local Address       Foreign Address      State        PID
TCP    0.0.0.0:80          0.0.0.0:*            LISTENING    1234
TCP    192.168.1.10:52431  93.184.216.34:443    ESTABLISHED  5678
TCP    192.168.1.10:52432  93.184.216.34:443    ESTABLISHED  5678
UDP    0.0.0.0:53          0.0.0.0:*                         2345
```

### ss (Linux -- faster replacement for netstat)

```bash
# Show all TCP sockets
ss -t -a

# Show listening sockets with process info
ss -tlnp

# Show established connections
ss -t state established

# Filter by port
ss -t 'sport = :80'
ss -t 'dport = :443'

# Show socket statistics
ss -s

# Example output:
State    Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process
LISTEN   0       128     0.0.0.0:80           0.0.0.0:*          nginx
ESTAB    0       0       192.168.1.10:52431   93.184.216.34:443  firefox
ESTAB    0       0       192.168.1.10:52432   93.184.216.34:443  firefox
```

### Common Flags

| Flag | netstat | ss | Meaning |
|------|---------|-----|---------|
| TCP | `-t` | `-t` | Show TCP sockets |
| UDP | `-u` | `-u` | Show UDP sockets |
| Listening | `-l` | `-l` | Show only listening sockets |
| All | `-a` | `-a` | Show all sockets (listening + established) |
| Numeric | `-n` | `-n` | Don't resolve names (show IPs and port numbers) |
| Process | `-p` | `-p` | Show process using the socket |

### PowerShell (Windows)

```powershell
# Show all TCP connections
Get-NetTCPConnection | Format-Table -AutoSize

# Show listening ports
Get-NetTCPConnection -State Listen | Format-Table LocalPort, OwningProcess -AutoSize

# Find which process uses a specific port
Get-NetTCPConnection -LocalPort 80 | Select-Object LocalPort, OwningProcess
Get-Process -Id (Get-NetTCPConnection -LocalPort 80).OwningProcess
```

---

## Port Scanning and Security

### Why Port Scanning Matters

Attackers scan ports to discover running services and potential vulnerabilities. Defenders use port scanning to audit their own systems.

```
Port States (from scanner's perspective):

  Open     -- A service is accepting connections
  Closed   -- No service is listening (host responds with RST)
  Filtered -- Firewall is blocking the probe (no response)
```

### Nmap Example

```bash
# Scan common ports on a target
nmap 192.168.1.1

# Scan specific ports
nmap -p 22,80,443 192.168.1.1

# Scan all 65535 ports
nmap -p- 192.168.1.1

# Service version detection
nmap -sV -p 80,443 192.168.1.1
```

### Best Practices

1. **Minimize open ports** -- Only expose services that are needed
2. **Use firewalls** -- Block unnecessary inbound ports
3. **Change default ports** -- For services like SSH (22), use non-standard ports to reduce automated attacks
4. **Monitor connections** -- Regularly audit open ports and active connections
5. **Keep services updated** -- Patch vulnerabilities in listening services

---

## Special Port Considerations

### Port 0

Port 0 is technically valid but is reserved. When you bind to port 0 in socket programming, the OS assigns a random available ephemeral port:

```python
# Bind to port 0 -- OS will assign an available port
sock.bind(('0.0.0.0', 0))
assigned_port = sock.getsockname()[1]
print(f"OS assigned port: {assigned_port}")  # e.g., 52431
```

### Listening on 0.0.0.0 vs 127.0.0.1

```
0.0.0.0:80   -- Listen on ALL network interfaces (accessible externally)
127.0.0.1:80 -- Listen on loopback ONLY (accessible only from localhost)

For development:  127.0.0.1 (safer)
For production:   0.0.0.0 or specific interface IP (behind a firewall)
```

### SO_REUSEADDR

When a TCP connection closes, the port enters TIME_WAIT state for ~60 seconds. Without `SO_REUSEADDR`, restarting a server immediately will fail with "Address already in use."

```python
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('0.0.0.0', 8080))  # Works even if port is in TIME_WAIT
```

---

## Exercises

### Beginner

1. What is the range of valid port numbers? How many total ports are there?
2. Why do well-known ports (0-1023) require root privileges on Linux?
3. Look up the default port numbers for: Redis, MongoDB, RabbitMQ, and Elasticsearch.

### Intermediate

4. Write a Python script that scans ports 1-1024 on `localhost` and reports which ports are open. Use `socket.connect_ex()` (which returns 0 on success instead of raising an exception).
5. Run `netstat -ant` (or `ss -tna`) on your machine. Identify at least 3 connections and explain the source port, destination port, and state of each.
6. Explain why a web server can have thousands of clients connected to port 80 simultaneously. How does the OS distinguish between them?

### Advanced

7. Research and explain the SYN flood attack. How does it exploit the TCP handshake and port/socket behavior? What is a SYN cookie and how does it mitigate this attack?
8. Build a multi-threaded TCP chat server in Python where multiple clients can connect and send messages to each other. Handle client disconnections gracefully.

---

## Key Takeaways

- Port numbers (0-65535) identify specific processes on a host, enabling multiplexing
- **Well-known ports** (0-1023) are reserved for standard services; **ephemeral ports** (49152+) are auto-assigned for client connections
- A **socket** is the combination of an IP address and port number -- it is the endpoint of network communication
- TCP connections are identified by a **4-tuple**: (src IP, src port, dst IP, dst port)
- `netstat` and `ss` are essential tools for inspecting active connections and listening ports
- Port security (minimizing open ports, firewalls, monitoring) is a critical part of network defense

---

## Navigation

- **Previous**: [UDP and Use Cases](./03_udp_and_use_cases.md)
- **Next**: [Flow Control and Congestion Control](./05_flow_and_congestion_control.md)
- **Section Home**: [Transport Layer](./README.md)

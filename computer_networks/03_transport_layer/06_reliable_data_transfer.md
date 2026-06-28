# Reliable Data Transfer

The network layer (IP) provides **unreliable, best-effort delivery**: packets can be lost, corrupted, reordered, or duplicated. The transport layer must build reliability on top of this unreliable foundation. This tutorial covers the fundamental protocols and mechanisms that make reliable data transfer possible.

---

## What You'll Learn

- What "reliable" means in the context of data transfer
- Stop-and-Wait protocol: the simplest reliable protocol
- Go-Back-N protocol: pipelining with cumulative ACKs
- Selective Repeat protocol: pipelining with individual ACKs
- ARQ (Automatic Repeat Request) mechanisms
- How pipelining improves performance
- How TCP implements reliability using these building blocks

---

## What Makes Data Transfer "Reliable"?

A reliable data transfer protocol guarantees three properties:

1. **No loss**: Every byte sent is eventually delivered
2. **No corruption**: Data arrives without bit errors
3. **In-order delivery**: Data arrives in the same order it was sent

The underlying channel (IP) provides none of these. The transport layer must handle each failure mode:

```
Unreliable Channel Problems:         Reliable Protocol Solutions:

  Bit errors in transit      --->    Checksums for detection
  Packets lost entirely      --->    Timeouts + retransmission
  Packets arrive out of order --->   Sequence numbers + reordering
  Duplicate packets arrive    --->   Sequence numbers + dedup
  ACKs lost or corrupted     --->   Retransmission + dedup
```

---

## Building Blocks of Reliability

Before diving into specific protocols, here are the fundamental mechanisms:

| Mechanism | Purpose | How It Works |
|-----------|---------|-------------|
| Checksum | Detect corruption | Computed over data, verified by receiver |
| Sequence numbers | Detect duplicates, enable ordering | Each packet gets a unique number |
| Acknowledgments (ACKs) | Confirm receipt | Receiver tells sender what it received |
| Negative ACKs (NAKs) | Report missing data | Receiver tells sender what it didn't receive |
| Timeouts | Detect loss | If no ACK within timeout, assume loss |
| Retransmission | Recover from loss | Resend unacknowledged data |

---

## Stop-and-Wait Protocol

The simplest reliable protocol. The sender sends **one packet** and waits for an ACK before sending the next.

### How It Works

```
  Sender                          Receiver
    |                                |
    |--- Packet 0 ----------------->|
    |                                | Verify checksum, deliver data
    |<-- ACK 0 ---------------------|
    |                                |
    |--- Packet 1 ----------------->|
    |                                | Verify checksum, deliver data
    |<-- ACK 1 ---------------------|
    |                                |
    |--- Packet 0 ----------------->|  (sequence numbers alternate 0,1,0,1...)
    |                                |
```

### Handling Packet Loss

```
  Sender                          Receiver
    |                                |
    |--- Packet 0 ------X  (lost)   |
    |                                |
    |   (timeout expires)            |
    |                                |
    |--- Packet 0 ----------------->|  Retransmit
    |<-- ACK 0 ---------------------|
    |                                |
```

### Handling ACK Loss

```
  Sender                          Receiver
    |                                |
    |--- Packet 0 ----------------->|
    |                                | Delivers data
    |<-- ACK 0 ------X  (lost)      |
    |                                |
    |   (timeout expires)            |
    |                                |
    |--- Packet 0 ----------------->|  Retransmit (duplicate!)
    |                                | Sees seq=0 again, discards duplicate
    |<-- ACK 0 ---------------------|  Re-ACK
    |                                |
```

### Performance Problem

Stop-and-Wait wastes bandwidth because the sender is idle while waiting for each ACK.

```
  Link: 1 Gbps, RTT: 30ms, Packet size: 1000 bytes

  Transmission time = 1000 bytes / (1 Gbps / 8) = 0.008 ms
  Total cycle time  = 0.008 ms + 30 ms = 30.008 ms

  Utilization = 0.008 / 30.008 = 0.027%

  Only 0.027% of the link capacity is used!

  Timeline:
  |--TX--|------------------idle (waiting for ACK)-----------------|--TX--|
  0    0.008ms                                                   30.008ms
```

The solution: **pipelining** -- send multiple packets before waiting for ACKs.

---

## Go-Back-N (GBN) Protocol

GBN uses a **sliding window** to pipeline multiple packets. The sender can have up to **N** unacknowledged packets in flight simultaneously.

### Sender Rules

1. Maintain a window of size N
2. Send packets within the window without waiting for individual ACKs
3. Use **cumulative ACKs**: ACK(n) means "received all packets up to and including n"
4. On timeout, **retransmit ALL packets** from the oldest unacknowledged packet

### Receiver Rules

1. Deliver packets **in order only**
2. Discard out-of-order packets (no buffering)
3. Send cumulative ACK for the last in-order packet received

### Normal Operation (Window N=4)

```
  Sender (window=4)                     Receiver
    |                                      |
    |--- Pkt 0 --------------------------->| ACK 0
    |--- Pkt 1 --------------------------->| ACK 1
    |--- Pkt 2 --------------------------->| ACK 2
    |--- Pkt 3 --------------------------->| ACK 3
    |                                      |
    |<-- ACK 0 ----------------------------|  Window slides: can send Pkt 4
    |--- Pkt 4 --------------------------->|
    |<-- ACK 1 ----------------------------|  Window slides: can send Pkt 5
    |--- Pkt 5 --------------------------->|
    |                                      |
```

### Packet Loss in GBN

```
  Sender (window=4)                     Receiver
    |                                      |
    |--- Pkt 0 --------------------------->| ACK 0
    |--- Pkt 1 --------------------------->| ACK 1
    |--- Pkt 2 ----X  (lost)              |
    |--- Pkt 3 --------------------------->| Out of order! Discard. ACK 1
    |--- Pkt 4 --------------------------->| Out of order! Discard. ACK 1
    |--- Pkt 5 --------------------------->| Out of order! Discard. ACK 1
    |                                      |
    |   (timeout for Pkt 2)                |
    |                                      |
    |--- Pkt 2 --------------------------->| ACK 2   \
    |--- Pkt 3 --------------------------->| ACK 3    | Go Back to N=2
    |--- Pkt 4 --------------------------->| ACK 4    | Retransmit 2,3,4,5
    |--- Pkt 5 --------------------------->| ACK 5   /
```

### GBN Window Visualization

```
  Sequence numbers: 0  1  2  3  4  5  6  7  8  9  10 11 12

  Window (N=4):    [==sent+acked==|===in flight===|==can send==|=blocked=]

  State:           [ACK][ACK][ SENT ][ SENT ][ SENT ][ SENT ][........]
                              ^                       ^
                             base                  base + N
                         (oldest unacked)        (window edge)
```

---

## Selective Repeat (SR) Protocol

SR improves on GBN by retransmitting **only the lost packet**, not the entire window. Both sender and receiver maintain windows.

### Key Differences from GBN

| Aspect | Go-Back-N | Selective Repeat |
|--------|-----------|-----------------|
| Receiver buffering | No (discard out-of-order) | Yes (buffer out-of-order) |
| ACK type | Cumulative | Individual per packet |
| Retransmission | All packets from lost one | Only the lost packet |
| Receiver complexity | Simple | More complex |
| Bandwidth efficiency | Lower (redundant retransmissions) | Higher |
| Window constraint | N < 2^k (k = seq num bits) | N <= 2^(k-1) |

### Selective Repeat Operation

```
  Sender (window=4)                     Receiver (window=4)
    |                                      |
    |--- Pkt 0 --------------------------->| Deliver. ACK 0
    |--- Pkt 1 --------------------------->| Deliver. ACK 1
    |--- Pkt 2 ----X  (lost)              |
    |--- Pkt 3 --------------------------->| Buffer (out of order). ACK 3
    |--- Pkt 4 --------------------------->| Buffer (out of order). ACK 4
    |                                      |
    |<-- ACK 0 ----------------------------|
    |<-- ACK 1 ----------------------------|
    |<-- ACK 3 ----------------------------|  Individual ACK (not cumulative)
    |<-- ACK 4 ----------------------------|
    |                                      |
    |   (timeout for Pkt 2 ONLY)           |
    |                                      |
    |--- Pkt 2 --------------------------->| Deliver 2, 3, 4 (from buffer). ACK 2
    |                                      |
```

### SR Receiver Window

```
  Receiver buffer for Selective Repeat:

  Expected: 2  3  4  5  6
            [ ][ ][ ][ ][ ]   <-- receiver window (N=4 centered on expected)

  After receiving 3, 4 (but not 2):

  Expected: 2  3  4  5  6
            [ ][X][X][ ][ ]   X = buffered, waiting for packet 2

  After receiving 2:

  Deliver 2, 3, 4 in order. Window slides:
  Expected: 5  6  7  8  9
            [ ][ ][ ][ ][ ]
```

### Sequence Number Space Constraint

For Selective Repeat, the window size must be at most **half** the sequence number space to avoid ambiguity:

```
  With 3-bit sequence numbers (0-7), window size must be <= 4

  Why? Consider window=5, seq nums 0-7:

  Sender sends: 0, 1, 2, 3, 4 --> all ACKed
  Sender sends: 5, 6, 7, 0, 1 --> new data with seq 0, 1

  If ACKs for 0,1,2,3,4 are lost:
  Sender retransmits 0, 1 --> but is this OLD 0,1 or NEW 0,1?
  Receiver cannot tell! Ambiguity!

  With window <= 4: this ambiguity cannot occur.
```

---

## ARQ (Automatic Repeat Request) Mechanisms

ARQ is the general framework for achieving reliability through retransmission. All three protocols above are ARQ variants.

### ARQ Components

```
  +----------------------------------+
  |        ARQ Framework             |
  |                                  |
  |  1. Error Detection              |
  |     - Checksum on each packet    |
  |                                  |
  |  2. Receiver Feedback            |
  |     - ACK: positive ack          |
  |     - NAK: negative ack          |
  |     (or timeout = implicit NAK)  |
  |                                  |
  |  3. Retransmission               |
  |     - Sender resends on NAK      |
  |       or timeout                 |
  |                                  |
  |  4. Sequence Numbers             |
  |     - Distinguish retransmissions|
  |       from new data              |
  +----------------------------------+
```

### ARQ Variants Summary

| Variant | Pipeline? | Retransmit | Receiver | Efficiency |
|---------|-----------|-----------|----------|------------|
| Stop-and-Wait | No | Single packet | Simple | Very low |
| Go-Back-N | Yes (N packets) | All from lost | Simple (no buffer) | Medium |
| Selective Repeat | Yes (N packets) | Only lost | Complex (buffer) | High |

---

## Pipelining for Performance

Pipelining allows multiple packets to be in transit simultaneously, dramatically improving utilization.

### Utilization Comparison

```
  Link: 1 Gbps, RTT: 30ms, Packet: 1000 bytes, TX time: 0.008ms

  Stop-and-Wait (1 packet at a time):
    Utilization = 0.008 / 30.008 = 0.027%

  Go-Back-N with N=1000:
    Can send 1000 packets before first ACK returns
    Utilization = (1000 x 0.008) / 30.008 = 8 / 30.008 = 26.7%

  Go-Back-N with N=3750:
    Utilization = (3750 x 0.008) / 30.008 = 30 / 30.008 = ~100%

  Bandwidth-delay product = 1 Gbps x 30ms = 3.75 MB = 3750 packets
  Need window >= 3750 to fully utilize the link.
```

```
  Stop-and-Wait:
  |TX|----------------------------idle-----------------------------|TX|

  Pipelining (N=4):
  |TX|TX|TX|TX|-------------waiting for ACKs---------------|TX|TX|TX|TX|

  Pipelining (N fills the pipe):
  |TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|TX|
  (no idle time -- link is fully utilized)
```

---

## How TCP Implements Reliability

TCP combines and extends the concepts from Stop-and-Wait, GBN, and SR into a practical protocol.

### TCP's Reliability Mechanisms

```
  +----------------------------------------------------------------+
  |                    TCP Reliability Stack                         |
  |                                                                |
  |  Checksums ---------> Detect corrupted segments                |
  |                                                                |
  |  Sequence Numbers ---> Byte-oriented (not packet-oriented)     |
  |                        Detect duplicates, enable ordering      |
  |                                                                |
  |  Cumulative ACKs ----> Like GBN: ACK(n) = "received all       |
  |                        bytes up to n-1"                        |
  |                                                                |
  |  Selective ACKs -----> Like SR: SACK option reports            |
  |  (SACK option)         non-contiguous received blocks          |
  |                                                                |
  |  Timeouts -----------> RTO computed from RTT measurements      |
  |                        Exponential backoff on repeated loss    |
  |                                                                |
  |  Fast Retransmit ----> 3 duplicate ACKs trigger retransmit     |
  |                        before timeout expires                  |
  |                                                                |
  |  Sliding Window -----> Combines flow control (rwnd) and        |
  |                        congestion control (cwnd)               |
  +----------------------------------------------------------------+
```

### TCP: A Hybrid Approach

TCP is often described as a **GBN-like protocol with SR enhancements**:

| Feature | GBN-like | SR-like |
|---------|----------|---------|
| Cumulative ACKs | Yes | -- |
| SACK (optional) | -- | Yes |
| Receiver buffering | -- | Yes (buffers out-of-order) |
| Single retransmit timer | Yes | -- |
| Retransmit only lost segment | -- | Yes (with SACK) |

### TCP Reliability Example

```
  Sender                                    Receiver
    |                                          |
    |--- Seg (seq=100, 100 bytes) ----------->| Deliver. ACK=200
    |--- Seg (seq=200, 100 bytes) ----------->| Deliver. ACK=300
    |--- Seg (seq=300, 100 bytes) ----X lost  |
    |--- Seg (seq=400, 100 bytes) ----------->| Buffer. ACK=300 (dup 1)
    |--- Seg (seq=500, 100 bytes) ----------->| Buffer. ACK=300 (dup 2)
    |--- Seg (seq=600, 100 bytes) ----------->| Buffer. ACK=300 (dup 3)
    |                                          |
    |  3 dup ACKs --> Fast Retransmit          |
    |                                          |
    |--- Seg (seq=300, 100 bytes) ----------->| Deliver 300-699. ACK=700
    |                                          |
    | With SACK, receiver would have reported: |
    | ACK=300, SACK=(400-500, 500-600, 600-700)|
    | Sender knows exactly what's missing.     |
```

### TCP vs Theoretical Protocols

```python
# Pseudocode: TCP's retransmission logic (simplified)

def tcp_sender():
    base = initial_seq_num
    next_seq = initial_seq_num
    timer_running = False

    while data_to_send:
        if next_seq < base + min(cwnd, rwnd):
            send_segment(next_seq, data)
            if not timer_running:
                start_timer(RTO)
                timer_running = True
            next_seq += len(data)

        if received_ack(ack_num):
            base = ack_num  # Slide window (cumulative ACK)
            if base == next_seq:
                stop_timer()
                timer_running = False
            else:
                restart_timer(RTO)

        if dup_ack_count == 3:
            # Fast retransmit (like SR -- only retransmit missing segment)
            retransmit(base)
            cwnd = cwnd / 2  # Congestion response

        if timeout:
            # Like GBN -- but TCP typically retransmits only oldest
            retransmit(base)
            cwnd = 1  # Severe congestion response
            restart_timer(RTO * 2)  # Exponential backoff
```

---

## Reliability Protocol Comparison

| Feature | Stop-and-Wait | Go-Back-N | Selective Repeat | TCP |
|---------|--------------|-----------|-----------------|-----|
| Pipelining | No | Yes | Yes | Yes |
| Window size | 1 | N | N | Dynamic (cwnd/rwnd) |
| ACK type | Individual | Cumulative | Individual | Cumulative + SACK |
| Receiver buffer | No | No | Yes | Yes |
| Retransmit scope | 1 packet | N packets | 1 packet | 1 segment (fast retransmit) |
| Seq num space | 2 (0,1) | N+1 | 2N | 2^32 (byte-oriented) |
| Complexity | Very low | Low | Medium | High |
| Efficiency | Very low | Medium | High | High |
| Real-world use | Modems, TFTP | Simplified stacks | HDLC, LLC | The internet |

---

## Exercises

### Beginner

1. List three things that can go wrong with data sent over an unreliable channel.
2. In Stop-and-Wait, why are only two sequence numbers (0 and 1) needed?
3. What is the difference between a cumulative ACK and an individual ACK? Give an example of each.

### Intermediate

4. In Go-Back-N with window N=5 and 4-bit sequence numbers (0-15), packets 3, 4, 5, 6, 7 are sent. Packet 5 is lost. Describe exactly what happens next (what the receiver sends, what the sender retransmits).
5. Calculate the utilization of a Stop-and-Wait protocol on a 10 Mbps link with 40ms RTT and 500-byte packets. Then calculate the utilization with a Go-Back-N window of 20 packets. Show your work.
6. For Selective Repeat with 3-bit sequence numbers (0-7), what is the maximum window size? Prove why a larger window causes problems with a concrete example.

### Advanced

7. Implement a simplified Go-Back-N protocol in Python using UDP sockets. The sender should: (a) pipeline up to N packets, (b) use cumulative ACKs, (c) retransmit from the oldest unacknowledged packet on timeout. Test with simulated packet loss (random drops).
8. Compare TCP's reliability implementation (cumulative ACKs + SACK + fast retransmit) to a pure Selective Repeat protocol. In what scenarios does TCP's approach outperform pure SR? When might it underperform?

---

## Key Takeaways

- Reliable data transfer is built from checksums, sequence numbers, ACKs, timeouts, and retransmissions
- **Stop-and-Wait** is simple but has terrible utilization on high-bandwidth or high-latency links
- **Go-Back-N** uses pipelining with cumulative ACKs but wastes bandwidth retransmitting correctly received packets
- **Selective Repeat** retransmits only lost packets and buffers out-of-order data at the receiver
- **Pipelining** is essential: the window must be at least as large as the bandwidth-delay product for full utilization
- TCP is a **hybrid** of GBN (cumulative ACKs, single timer) and SR (receiver buffering, SACK, selective retransmit)
- The sequence number space must be large enough relative to the window size to avoid ambiguity

---

## Navigation

- **Previous**: [Flow Control and Congestion Control](./05_flow_and_congestion_control.md)
- **Next**: [Transport Layer Section Home](./README.md)
- **Section Home**: [Transport Layer](./README.md)

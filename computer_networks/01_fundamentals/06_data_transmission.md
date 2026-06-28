# Data Transmission and Encoding

## What You'll Learn

- The difference between analog and digital signals
- Transmission modes: simplex, half-duplex, and full-duplex
- Bandwidth, throughput, and their relationship
- Multiplexing techniques: TDM, FDM, WDM
- Error detection methods: parity, CRC, checksum
- Error correction with Hamming code
- Transmission media: copper, fiber optic, and wireless
- Signal encoding techniques for digital and analog data

## Analog vs Digital Signals

All data transmitted over a network is carried by signals — either analog or digital.

### Analog Signals

Continuous signals that vary smoothly over time. Represented by sine waves with amplitude, frequency, and phase.

```
Analog Signal (Sine Wave):

Amplitude
    ^
    |      *  *
    |    *      *
    |  *          *
    | *            *            *  *
----+--*-----------*----------*------*------> Time
    |               *        *        *
    |                *      *
    |                  *  *
    |
    v

Properties:
- Amplitude (A): Height of the wave (signal strength)
- Frequency (f): Number of cycles per second (Hz)
- Phase (φ):     Position of the wave at time = 0
- Wavelength (λ): Physical length of one cycle
```

### Digital Signals

Discrete signals with a finite number of levels (typically 0 and 1).

```
Digital Signal (Binary):

Voltage
  +5V |  +----+     +----+     +----+
      |  |    |     |    |     |    |
   0V |--+    +-----+    +-----+    +-----
      |
      +----------------------------------------> Time
        1  1   0  0   1  1   0  0   1  1

Properties:
- Bit rate: Number of bits transmitted per second (bps)
- Bit duration: Time to send one bit = 1/bit_rate
- Signal levels: Number of voltage levels used
```

### Comparison

| Feature | Analog | Digital |
|---------|--------|---------|
| Representation | Continuous wave | Discrete levels (0/1) |
| Noise Sensitivity | Degrades with noise | Can regenerate exactly |
| Signal Quality | Degrades over distance | Maintained with repeaters |
| Processing | Harder to process | Easy with digital circuits |
| Bandwidth | Can use full spectrum | Requires encoding |
| Example | AM/FM radio, old phone | Ethernet, modern networks |

## Transmission Modes

How data flows between two communicating devices.

### Simplex

Data flows in **one direction only**. One device is always the sender, the other always the receiver.

```
Simplex:

[Sender] =============> [Receiver]
  (TV Station)             (TV)

Only one direction. Receiver cannot send back.

Examples:
- Television broadcasting
- Radio broadcasting
- Keyboard to computer
- Traditional fire alarm sensors
```

### Half-Duplex

Data flows in **both directions, but only one direction at a time**. Devices take turns transmitting.

```
Half-Duplex:

Time 1: [A] =============> [B]     (A sends)
Time 2: [A] <============= [B]     (B sends)

Cannot send and receive simultaneously.
Like a walkie-talkie — one talks, other listens.

Examples:
- Walkie-talkies (push-to-talk)
- CB radio
- Older Ethernet hubs (CSMA/CD)
```

### Full-Duplex

Data flows in **both directions simultaneously**. Both devices can send and receive at the same time.

```
Full-Duplex:

[A] =============> [B]     (A sends to B)
[A] <============= [B]     (B sends to A simultaneously)

Two separate channels or multiplexed communication.

Examples:
- Telephone conversations
- Modern Ethernet switches
- WebSocket connections
- Full-duplex fiber links
```

### Comparison

| Feature | Simplex | Half-Duplex | Full-Duplex |
|---------|---------|-------------|-------------|
| Direction | One way | Both, alternating | Both, simultaneous |
| Bandwidth Use | Full in one direction | Full, alternating | Full in both |
| Complexity | Lowest | Medium | Highest |
| Example | TV broadcast | Walkie-talkie | Phone call |

## Bandwidth and Throughput

### Bandwidth

The **maximum capacity** of a communication channel. Think of it as the width of a highway.

```
Bandwidth = Maximum data rate of a channel

Analogy:
+============================+  8-lane highway = High bandwidth
+============================+

+============+                  2-lane road = Low bandwidth
+============+

Common bandwidth units:
- bps   (bits per second)
- Kbps  (1,000 bps)
- Mbps  (1,000,000 bps)
- Gbps  (1,000,000,000 bps)
- Tbps  (1,000,000,000,000 bps)
```

### Throughput

The **actual data rate** achieved, which is always less than or equal to bandwidth.

```
Throughput ≤ Bandwidth

Factors reducing throughput:
- Network congestion (traffic jams)
- Protocol overhead (packet headers)
- Errors and retransmissions
- Latency (propagation delay)
- Shared medium (multiple users)

Example:
  Bandwidth: 100 Mbps (the pipe)
  Throughput: 85 Mbps  (actual data transferred)
  Overhead:  15 Mbps  (headers, retransmissions, etc.)
```

### Latency Components

```
Total Latency = Propagation + Transmission + Queuing + Processing

Propagation Delay:  Time for signal to travel through medium
                    = Distance / Speed of signal

Transmission Delay: Time to push all bits onto the wire
                    = Packet Size / Bandwidth

Queuing Delay:      Time waiting in router/switch buffers

Processing Delay:   Time to examine packet headers, make decisions
```

```python
# Calculate transmission time
def transmission_time(file_size_mb, bandwidth_mbps):
    """Calculate time to transmit a file."""
    file_size_bits = file_size_mb * 8  # Convert MB to Megabits
    time_seconds = file_size_bits / bandwidth_mbps
    return time_seconds

# Example: Download a 700 MB file
print(f"On 10 Mbps:  {transmission_time(700, 10):.0f} seconds ({transmission_time(700, 10)/60:.1f} min)")
print(f"On 100 Mbps: {transmission_time(700, 100):.0f} seconds ({transmission_time(700, 100)/60:.1f} min)")
print(f"On 1 Gbps:   {transmission_time(700, 1000):.1f} seconds")

# Output:
# On 10 Mbps:  560 seconds (9.3 min)
# On 100 Mbps: 56 seconds (0.9 min)
# On 1 Gbps:   5.6 seconds
```

## Multiplexing

Multiplexing allows multiple signals to share a single communication channel, increasing efficiency.

### Frequency Division Multiplexing (FDM)

Divides the channel into multiple frequency bands. Each signal gets its own frequency range.

```
FDM: Each channel gets a separate frequency band

Frequency
    ^
    |  +---------+
    |  |Channel 3| (Radio Station 3)
    |  +---------+
    |  +---------+
    |  |Channel 2| (Radio Station 2)
    |  +---------+
    |  +---------+
    |  |Channel 1| (Radio Station 1)
    |  +---------+
    +-----------------------------------> Time

Guard bands between channels prevent interference.

Examples:
- FM radio stations (each station has a frequency)
- Cable TV channels
- ADSL (voice + data on phone line)
- Cellular networks (different frequency bands)
```

### Time Division Multiplexing (TDM)

Divides the channel into time slots. Each signal gets the full bandwidth but only for a specific time slot.

```
TDM: Each channel gets a time slot

     Time Slot 1   Time Slot 2   Time Slot 3   Time Slot 4
    +------------+------------+------------+------------+
    | Channel A  | Channel B  | Channel C  | Channel A  | ...
    +------------+------------+------------+------------+

Full bandwidth available during each time slot.
Slots rotate: A, B, C, A, B, C, A, B, C ...

Synchronous TDM: Fixed time slots (even if no data)
Statistical TDM: Slots assigned on demand (more efficient)

Examples:
- T1/E1 telephone lines
- SONET/SDH networks
- GSM cellular networks
- ISDN
```

### Wavelength Division Multiplexing (WDM)

Used in fiber optics. Multiple light wavelengths (colors) carry different signals on the same fiber.

```
WDM: Multiple wavelengths on a single fiber

[Signal 1] --λ1 (Red)--\
                         \
[Signal 2] --λ2 (Green)--[MUX]====Single Fiber====[DEMUX]--λ1--> [Signal 1]
                         /                                 --λ2--> [Signal 2]
[Signal 3] --λ3 (Blue)--/                                 --λ3--> [Signal 3]

DWDM (Dense WDM): 80-160+ wavelengths per fiber
CWDM (Coarse WDM): 8-18 wavelengths per fiber

Examples:
- Long-haul fiber networks
- Submarine cables
- Data center interconnects
- ISP backbone networks
```

### Multiplexing Comparison

| Feature | FDM | TDM | WDM |
|---------|-----|-----|-----|
| Medium | Any (often analog) | Any (often digital) | Fiber optic only |
| Division By | Frequency bands | Time slots | Light wavelengths |
| Bandwidth Use | Shared (each gets portion) | Full (during time slot) | Full (per wavelength) |
| Example | Radio stations | T1 phone lines | Fiber backbone |
| Guard | Guard bands (frequency) | Guard times | Guard wavelengths |

## Error Detection

Errors occur during transmission due to noise, interference, or signal degradation. Detection methods identify when errors have occurred.

### Parity Check

The simplest error detection method. Adds a single parity bit to make the total number of 1s either even (even parity) or odd (odd parity).

```
Even Parity: Total number of 1s (including parity bit) must be even

Data: 1011001  (four 1s — already even)
With parity bit: 1011001[0]  ← parity bit is 0

Data: 1011011  (five 1s — odd)
With parity bit: 1011011[1]  ← parity bit is 1 (makes it six 1s = even)

Detection:
Received: 1011001[0]  → Count 1s: 4 (even) → OK
Received: 1010001[0]  → Count 1s: 3 (odd)  → ERROR DETECTED

Limitation: Can only detect odd numbers of bit errors.
            Cannot detect even numbers of errors (e.g., 2 bits flipped).
            Cannot identify WHICH bit is wrong.
```

### Two-Dimensional Parity

Arranges data in a matrix with row and column parity bits. Can detect more errors than simple parity.

```
Data arranged in rows with row and column parity:

         Col 1  Col 2  Col 3  Col 4  | Row Parity
Row 1:     1      0      1      1    |    1
Row 2:     0      1      1      0    |    0
Row 3:     1      1      0      1    |    1
Row 4:     1      0      0      0    |    1
-----------------------------------------
Col Par:   1      0      0      0    |    1

Can detect and locate single-bit errors.
Can detect (but not correct) multiple-bit errors.
```

### Checksum

Adds up all data values and sends the sum. The receiver recalculates and compares.

```
Checksum Calculation:

Sender:
  Data words: 10011001  11100010  00100100
  Sum:        10011001
            + 11100010
            + 00100100
            ----------
            110001111  (9 bits — carry the 1)
              0001111
            + 0000001  (carry)
            ----------
              0010000

  Complement: 1101111  ← This is the checksum

  Send: [10011001] [11100010] [00100100] [1101111]

Receiver:
  Add all data words + checksum
  If result is all 1s (1111111) → No error
  If result is NOT all 1s → Error detected

Used in: IP header checksum, TCP checksum, UDP checksum
```

### CRC (Cyclic Redundancy Check)

The most powerful common error detection method. Treats data as a polynomial and divides by a generator polynomial.

```
CRC Calculation (simplified):

Data:        1101011011
Generator:   10011       (degree 4, so CRC is 4 bits)

Step 1: Append 4 zeros to data → 11010110110000
Step 2: Perform binary division (XOR) by generator
Step 3: Remainder = CRC value

Transmitted: [1101011011][1110]  (data + CRC)

Receiver:
  Divide received data+CRC by generator
  Remainder = 0 → No error
  Remainder ≠ 0 → Error detected

CRC Standards:
+----------+------------+---------------------------+
| Standard | Length      | Used In                   |
+----------+------------+---------------------------+
| CRC-8    | 8 bits     | ATM headers               |
| CRC-16   | 16 bits    | USB, Modbus               |
| CRC-32   | 32 bits    | Ethernet, ZIP, PNG        |
| CRC-64   | 64 bits    | Some storage systems      |
+----------+------------+---------------------------+

CRC-32 can detect:
- All single-bit errors
- All double-bit errors
- All odd numbers of errors
- All burst errors up to 32 bits
```

### Error Detection Comparison

| Method | Overhead | Detection Capability | Complexity | Used In |
|--------|----------|---------------------|------------|---------|
| Parity | 1 bit | Single-bit errors only | Very low | Memory, UART |
| 2D Parity | ~Row+Col bits | Single + some multi-bit | Low | Legacy protocols |
| Checksum | 16-32 bits | Moderate (misses some) | Low | IP, TCP, UDP |
| CRC-32 | 32 bits | Excellent (burst errors) | Medium | Ethernet, files |

## Error Correction: Hamming Code

While detection identifies errors, **correction** fixes them without retransmission. Hamming code adds redundancy bits at specific positions to both detect and correct single-bit errors.

```
Hamming Code (7,4): 4 data bits + 3 parity bits = 7 total bits

Bit Positions: 1  2  3  4  5  6  7
               P1 P2 D1 P4 D2 D3 D4

Parity bit positions are powers of 2: 1, 2, 4
Data bit positions: 3, 5, 6, 7

Example: Encode data 1011

Step 1: Place data bits
  Pos:  1  2  3  4  5  6  7
        P1 P2 [1] P4 [0] [1] [1]

Step 2: Calculate parity bits
  P1 checks positions 1,3,5,7 (binary: xxx1)
     P1, 1, 0, 1 → P1 = 0 (even parity)

  P2 checks positions 2,3,6,7 (binary: xx1x)
     P2, 1, 1, 1 → P2 = 1 (even parity)

  P4 checks positions 4,5,6,7 (binary: x1xx)
     P4, 0, 1, 1 → P4 = 0 (even parity)

Result: 0 1 1 0 0 1 1

Step 3: Error detection and correction
  Received: 0 1 1 0 1 1 1  (bit 5 flipped!)

  Check P1 (pos 1,3,5,7): 0,1,1,1 = 1 (error!)
  Check P2 (pos 2,3,6,7): 1,1,1,1 = 0 (ok)
  Check P4 (pos 4,5,6,7): 0,1,1,1 = 1 (error!)

  Error position = P4*4 + P2*2 + P1*1 = 4 + 0 + 1 = 5
  Flip bit 5: 0 1 1 0 [0] 1 1  ← corrected!
```

```python
# Hamming code encoder/decoder example

def hamming_encode(data_bits):
    """Encode 4 data bits into 7-bit Hamming code."""
    d1, d2, d3, d4 = data_bits

    # Calculate parity bits
    p1 = d1 ^ d2 ^ d4  # positions 1,3,5,7
    p2 = d1 ^ d3 ^ d4  # positions 2,3,6,7
    p4 = d2 ^ d3 ^ d4  # positions 4,5,6,7

    return [p1, p2, d1, p4, d2, d3, d4]

def hamming_decode(received):
    """Decode 7-bit Hamming code, correcting single-bit errors."""
    p1, p2, d1, p4, d2, d3, d4 = received

    # Check parity
    c1 = p1 ^ d1 ^ d2 ^ d4
    c2 = p2 ^ d1 ^ d3 ^ d4
    c4 = p4 ^ d2 ^ d3 ^ d4

    error_pos = c1 * 1 + c2 * 2 + c4 * 4

    if error_pos != 0:
        print(f"Error detected at position {error_pos}")
        received[error_pos - 1] ^= 1  # Flip the error bit

    return [received[2], received[4], received[5], received[6]]

# Example
data = [1, 0, 1, 1]
encoded = hamming_encode(data)
print(f"Data:    {data}")
print(f"Encoded: {encoded}")

# Simulate an error at position 5
encoded[4] ^= 1
print(f"With error: {encoded}")

decoded = hamming_decode(encoded)
print(f"Decoded: {decoded}")
```

## Transmission Media

The physical pathway over which signals travel.

### Copper Cables

```
Twisted Pair Cable (most common in LANs):

+----------------------------------+
|  Outer Jacket                    |
|  +----------------------------+  |
|  | Pair 1: ///===///===///    |  |
|  | Pair 2: ///===///===///    |  |
|  | Pair 3: ///===///===///    |  |
|  | Pair 4: ///===///===///    |  |
|  +----------------------------+  |
+----------------------------------+

UTP (Unshielded Twisted Pair):  No shielding, lower cost
STP (Shielded Twisted Pair):    Metal shielding, less interference

Categories:
+----------+----------+-----------+-------------------+
| Category | Max Speed | Max Length | Common Use        |
+----------+----------+-----------+-------------------+
| Cat 5    | 100 Mbps | 100m      | Legacy networks   |
| Cat 5e   | 1 Gbps   | 100m      | Home/office       |
| Cat 6    | 10 Gbps  | 55m       | Modern networks   |
| Cat 6a   | 10 Gbps  | 100m      | Data centers      |
| Cat 7    | 10 Gbps  | 100m      | High performance  |
| Cat 8    | 40 Gbps  | 30m       | Data centers      |
+----------+----------+-----------+-------------------+

Coaxial Cable:
+------------------------------------------+
| Outer Jacket                              |
|  Braided Shield (ground)                  |
|    Insulation                             |
|      Center Conductor (signal)            |
+------------------------------------------+

Used for: Cable TV, older Ethernet (10BASE2, 10BASE5), cable internet
```

### Fiber Optic Cables

Transmit data as light pulses through glass or plastic fibers.

```
Fiber Optic Cable Cross-Section:

+----------------------------------+
|  Buffer/Jacket                   |
|  +----------------------------+  |
|  | Cladding (lower refractive)|  |
|  | +------------------------+|  |
|  | | Core (light travels    ||  |
|  | | through here)          ||  |
|  | +------------------------+|  |
|  +----------------------------+  |
+----------------------------------+

Single-Mode Fiber (SMF):          Multi-Mode Fiber (MMF):
- Thin core (~9 μm)              - Thicker core (50-62.5 μm)
- One light path                 - Multiple light paths
- Long distance (up to 100 km)   - Short distance (up to 2 km)
- Higher cost                    - Lower cost
- Used: WAN, backbone            - Used: LAN, data center
```

| Feature | Single-Mode | Multi-Mode |
|---------|------------|------------|
| Core Size | ~9 μm | 50-62.5 μm |
| Light Source | Laser | LED or VCSEL |
| Distance | Up to 100+ km | Up to 2 km |
| Bandwidth | Very high (100 Gbps+) | High (10-100 Gbps) |
| Cost | Higher | Lower |
| Color | Yellow jacket | Orange/Aqua jacket |
| Use Case | WAN, long haul | LAN, data center |

### Wireless Media

```
Wireless Signal Propagation:

[Access Point]))))))))))))))))))))))))[Device]

            Radio waves travel through air

Wireless Standards:
+-----------+----------+----------+-----------+----------+
| Standard  | Name     | Frequency| Max Speed | Range    |
+-----------+----------+----------+-----------+----------+
| 802.11a   | Wi-Fi 2  | 5 GHz   | 54 Mbps   | ~35m     |
| 802.11g   | Wi-Fi 3  | 2.4 GHz | 54 Mbps   | ~38m     |
| 802.11n   | Wi-Fi 4  | 2.4/5   | 600 Mbps  | ~70m     |
| 802.11ac  | Wi-Fi 5  | 5 GHz   | 6.9 Gbps  | ~35m     |
| 802.11ax  | Wi-Fi 6  | 2.4/5/6 | 9.6 Gbps  | ~35m     |
| 802.11be  | Wi-Fi 7  | 2.4/5/6 | 46 Gbps   | ~35m     |
+-----------+----------+----------+-----------+----------+

Other Wireless:
- Bluetooth: Short range (~10m), low power, PAN
- Cellular (4G/5G): Wide area, mobile devices
- Satellite: Global coverage, high latency
- Infrared: Very short range, line-of-sight
```

### Media Comparison

| Feature | Copper (UTP) | Fiber Optic | Wireless |
|---------|-------------|-------------|----------|
| Max Speed | 40 Gbps (Cat 8) | 100+ Gbps | 46 Gbps (Wi-Fi 7) |
| Max Distance | 100m | 100+ km | ~100m (Wi-Fi) |
| EMI Immunity | Low (susceptible) | High (immune) | Low (susceptible) |
| Security | Medium (can be tapped) | High (hard to tap) | Low (broadcasts) |
| Cost | Low | High | Medium |
| Installation | Easy | Requires skill | Easy |
| Use Case | LAN cabling | Backbone, WAN | Mobility, flexibility |

## Signal Encoding Techniques

Encoding determines how binary data (0s and 1s) is represented as signals on the transmission medium.

### Digital-to-Digital Encoding

```
NRZ-L (Non-Return to Zero - Level):
  0 = High voltage, 1 = Low voltage
  +--+     +-----+  +--+
  |  |     |     |  |  |
  +  +--+--+     +--+  +--
  0  1  1  0  0  1  0  1

Manchester Encoding (used in Ethernet):
  0 = Low-to-High transition, 1 = High-to-Low transition
  +--+  +--+--+  +--+  +--+
  |  |  |  |  |  |  |  |  |
  +  +--+  +  +--+  +--+  +
  0   1   0   1   1   0   1

  Advantage: Self-clocking (transitions provide timing)
  Disadvantage: Requires twice the bandwidth of NRZ

4B/5B + NRZI (used in Fast Ethernet):
  Every 4 data bits encoded as 5-bit pattern
  Guarantees sufficient transitions for clock recovery
  More efficient than Manchester encoding
```

### Digital-to-Analog Encoding

Used when digital data must travel over analog media (e.g., phone lines, radio).

```
ASK (Amplitude Shift Keying):
  0 = Low amplitude, 1 = High amplitude

  1       0       1       1       0
  ∿∿∿             ∿∿∿     ∿∿∿
  ∿∿∿     ---     ∿∿∿     ∿∿∿     ---

FSK (Frequency Shift Keying):
  0 = Low frequency, 1 = High frequency

  1       0       1       1       0
  ∿∿∿∿∿   ∿∿∿     ∿∿∿∿∿   ∿∿∿∿∿   ∿∿∿
  (fast)  (slow)  (fast)  (fast)  (slow)

PSK (Phase Shift Keying):
  0 = Phase 0°, 1 = Phase 180°

  Most efficient for digital modems
  QPSK: 4 phases (2 bits per symbol)
  QAM:  Combines amplitude + phase (modern modems/Wi-Fi)
```

### QAM (Quadrature Amplitude Modulation)

```
16-QAM Constellation Diagram:
(Each point represents 4 bits)

  Quadrature (Q)
       ^
  0010 | 0110   1110 | 1010
       |              |
  0011 | 0111   1111 | 1011
-------+-------- ------+--------> In-phase (I)
  0001 | 0101   1101 | 1001
       |              |
  0000 | 0100   1100 | 1000

Higher QAM = more bits per symbol = higher throughput
  16-QAM:  4 bits/symbol
  64-QAM:  6 bits/symbol
  256-QAM: 8 bits/symbol (Wi-Fi 5)
  1024-QAM: 10 bits/symbol (Wi-Fi 6)
  4096-QAM: 12 bits/symbol (Wi-Fi 7)
```

## Exercises

### Beginner
1. Explain the difference between analog and digital signals with an example of each
2. Classify each scenario as simplex, half-duplex, or full-duplex:
   - A fire alarm sensor sending alerts to a control panel
   - Two people talking on a telephone
   - A police radio communication
   - A live TV broadcast
3. If a network has 100 Mbps bandwidth and you download a 50 MB file, what is the theoretical minimum download time? (Show your calculation)
4. What is the difference between UTP and STP cables? When would you use each?

### Intermediate
5. A communication channel uses TDM with 4 users. Each time slot is 1 ms. Draw a timing diagram showing how the slots are allocated over 12 ms
6. Given the data byte `10110011`, calculate:
   - The even parity bit
   - The odd parity bit
   - Show what happens if bit 3 is flipped and how even parity detects the error
7. Encode the 4-bit data `1101` using the Hamming(7,4) code:
   - Place data bits at positions 3, 5, 6, 7
   - Calculate parity bits at positions 1, 2, 4
   - Show error detection if bit 6 is corrupted
8. Compare Cat 5e, Cat 6, and Cat 6a cables. Which would you recommend for a new office installation and why?

### Advanced
9. A fiber optic link uses DWDM with 80 wavelengths, each carrying 100 Gbps. Calculate the total capacity of the fiber. Compare this to a Cat 6a copper cable
10. Implement a CRC calculator in Python or JavaScript:
    - Use the generator polynomial `1011` (CRC-3)
    - Compute the CRC for the data `11010011101100`
    - Verify the received data by checking the remainder is zero
11. Research and explain why Manchester encoding is self-clocking while NRZ is not. What problems can arise from long sequences of 0s or 1s in NRZ encoding?
12. Design a transmission system for a company connecting two offices 50 km apart:
    - Choose the transmission medium and justify
    - Calculate the bandwidth requirements for 500 users at 2 Mbps each
    - Select appropriate multiplexing technique
    - Describe the error detection method you would use

## Key Takeaways

- Analog signals are continuous; digital signals are discrete — modern networks primarily use digital
- Full-duplex allows simultaneous bidirectional communication, maximizing channel utilization
- Throughput is always less than bandwidth due to overhead, errors, and congestion
- Multiplexing (FDM, TDM, WDM) allows multiple signals to share a single channel efficiently
- CRC is the most reliable common error detection method, used in Ethernet and file formats
- Hamming code enables single-bit error correction without retransmission
- Fiber optic provides the highest bandwidth and longest range but at higher cost
- Copper twisted pair remains dominant for LAN connections due to low cost and ease of installation
- Modern encoding (QAM) packs more bits per symbol for higher throughput over limited bandwidth

## Next Steps

Continue to the [Network Layer Section](../02_network_layer/README.md) to dive deeper into IP addressing, subnetting, and routing protocols.

---

[← Previous: Network Devices](./05_network_devices.md) | [Next: Network Layer Section →](../02_network_layer/README.md)

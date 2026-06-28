# Routing Protocols (RIP, OSPF, BGP)

## What You'll Learn

- The three categories of routing algorithms: distance vector, link-state, and path-vector
- How RIP works, including its hop count metric and inherent limitations
- How OSPF uses areas and Dijkstra's algorithm to find shortest paths
- How BGP operates as the internet's backbone routing protocol
- The distinction between Interior Gateway Protocols (IGP) and Exterior Gateway Protocols (EGP)
- A side-by-side comparison of the major routing protocols

## Why Routing Protocols Exist

In small networks, you can manually configure static routes. But what happens when:

- The network has hundreds of routers and thousands of subnets?
- A link fails and traffic needs to reroute automatically?
- New networks are added frequently?

**Routing protocols** automate the process of discovering networks, building routing tables, and adapting to topology changes.

```
Without Routing Protocol:              With Routing Protocol:

  Admin must manually                  Routers automatically
  configure every route                exchange information
  on every router.                     and build routing tables.

  Link fails? Admin must               Link fails? Protocol detects
  reconfigure manually.                it and recalculates paths.
```

## Routing Algorithm Categories

### 1. Distance Vector

Each router knows only the **distance** (metric) and **direction** (next hop) to each destination. Routers share their entire routing table with direct neighbors at regular intervals.

```
Distance Vector -- "Routing by Rumor":

  [R1] tells [R2]: "I can reach 10.1.0.0/16 in 1 hop"
  [R2] tells [R3]: "I can reach 10.1.0.0/16 in 2 hops" (via R1)
  [R3] tells [R4]: "I can reach 10.1.0.0/16 in 3 hops" (via R2)

  Each router trusts its neighbor's claim.
  No router knows the full network topology.
```

**Protocols**: RIP, RIPv2, EIGRP (Cisco hybrid)

### 2. Link-State

Each router discovers its **own links** and broadcasts that information to **all** routers in the network. Every router builds a complete map of the topology and independently calculates the best paths.

```
Link-State -- "Each Router Has the Full Map":

  [R1] announces: "I connect to R2 (cost 10) and R3 (cost 5)"
  [R2] announces: "I connect to R1 (cost 10) and R4 (cost 3)"
  [R3] announces: "I connect to R1 (cost 5) and R4 (cost 8)"
  [R4] announces: "I connect to R2 (cost 3) and R3 (cost 8)"

  Every router builds the same complete topology map.
  Each router runs Dijkstra's algorithm to find shortest paths.
```

**Protocols**: OSPF, IS-IS

### 3. Path-Vector

Each router tracks the **full path** (sequence of autonomous systems) to each destination. This prevents loops and enables complex routing policies.

```
Path-Vector -- "I Know the Entire Route":

  AS 100 tells AS 200: "I can reach 8.0.0.0/8 via path [AS100]"
  AS 200 tells AS 300: "I can reach 8.0.0.0/8 via path [AS200, AS100]"

  If AS100 sees its own AS number in a received path, it rejects
  the route (loop prevention).
```

**Protocols**: BGP

### Algorithm Comparison

| Feature | Distance Vector | Link-State | Path-Vector |
|---------|----------------|------------|-------------|
| Knowledge | Neighbors only | Full topology | Full AS path |
| Updates | Periodic (full table) | Triggered (changes only) | Triggered (changes only) |
| Convergence | Slow | Fast | Medium |
| CPU/Memory | Low | High | Medium |
| Loop Prevention | Split horizon, timers | Inherent (full map) | AS path checking |
| Scale | Small networks | Large single AS | Internet-wide |

## IGP vs EGP

```
The Internet -- Autonomous Systems (AS):

  +-- AS 100 (Company A) ----+     +-- AS 200 (ISP B) ----+
  |                          |     |                       |
  | [R1]---[R2]---[R3]      |     |  [R5]---[R6]          |
  |   |         /            |     |    |                  |
  | [R4]------/              |     |  [R7]---[R8]          |
  |                          |     |                       |
  +-----------[Border R]-----+-----+---[Border R]----------+
              ^^^^^ EGP (BGP) between AS borders ^^^^^

  Inside each AS:  IGP (OSPF, RIP, IS-IS, EIGRP)
  Between AS's:    EGP (BGP)
```

| Type | Full Name | Scope | Examples |
|------|-----------|-------|----------|
| **IGP** | Interior Gateway Protocol | Within a single AS | RIP, OSPF, IS-IS, EIGRP |
| **EGP** | Exterior Gateway Protocol | Between different AS's | BGP |

## RIP (Routing Information Protocol)

RIP is the simplest dynamic routing protocol. It uses **hop count** as its only metric.

### How RIP Works

```
RIP Operation:

  Every 30 seconds, each router broadcasts its full routing table
  to all directly connected neighbors.

  [R1] --- [R2] --- [R3] --- [R4]

  R1's table:                R2's table (after updates):
  10.1.0.0/16  hop 0 (local) 10.1.0.0/16  hop 1 (via R1)
                              10.2.0.0/16  hop 0 (local)

  R3 learns from R2:
  10.1.0.0/16  hop 2 (via R2)
  10.2.0.0/16  hop 1 (via R2)
  10.3.0.0/16  hop 0 (local)
```

### RIP Versions

| Feature | RIPv1 | RIPv2 |
|---------|-------|-------|
| Classful/Classless | Classful only | Classless (CIDR support) |
| Subnet mask | Not included | Included in updates |
| Updates | Broadcast (255.255.255.255) | Multicast (224.0.0.9) |
| Authentication | None | MD5 supported |
| Max hop count | 15 (16 = unreachable) | 15 (16 = unreachable) |

### RIP Limitations

- **Maximum 15 hops**: Networks more than 15 hops away are considered unreachable
- **Slow convergence**: Full table updates every 30 seconds; topology changes take minutes to propagate
- **Counting to infinity**: Without safeguards, routers can loop endlessly incrementing hop counts
- **No bandwidth awareness**: A 56 Kbps link and a 10 Gbps link both count as 1 hop

### RIP Loop Prevention Mechanisms

```
Split Horizon:
  Never advertise a route back out the interface you learned it from.

Route Poisoning:
  When a route fails, advertise it with metric 16 (unreachable)
  instead of simply removing it.

Hold-down Timer:
  After a route is marked unreachable, ignore any updates about it
  for a period (180 seconds by default) to prevent stale info.
```

## OSPF (Open Shortest Path First)

OSPF is the most widely deployed IGP. It is a **link-state** protocol that uses **Dijkstra's Shortest Path First (SPF) algorithm** to calculate optimal routes.

### OSPF Key Concepts

```
OSPF Hierarchy:

  +------ Area 0 (Backbone) --------+
  |                                  |
  | [ABR]---[R1]---[R2]---[ABR]     |
  |   |                      |      |
  +---|----------------------|------+
      |                      |
  +---v---Area 1---+   +----v---Area 2---+
  | [R3]---[R4]    |   | [R5]---[R6]     |
  | [R5]---[R6]    |   | [R7]            |
  +----------------+   +-----------------+

  ABR = Area Border Router (connects areas to the backbone)
  All areas must connect to Area 0 (directly or via virtual link)
```

### OSPF Cost Metric

OSPF uses **cost** based on link bandwidth (reference bandwidth / interface bandwidth):

```
Default Reference Bandwidth: 100 Mbps

Cost = Reference BW / Interface BW

Interface          Bandwidth    Cost
FastEthernet       100 Mbps     1
GigabitEthernet    1 Gbps       0.1 (rounded to 1)
10 GigE            10 Gbps      0.01 (rounded to 1)
Serial (T1)        1.544 Mbps   64
56K modem          56 Kbps      1785
```

> Modern networks often increase the reference bandwidth (e.g., to 10 Gbps) so high-speed links have meaningful cost differences.

### OSPF Router Types

| Type | Role |
|------|------|
| **Internal Router** | All interfaces in one area |
| **Backbone Router** | Has at least one interface in Area 0 |
| **ABR (Area Border Router)** | Connects two or more areas |
| **ASBR (AS Boundary Router)** | Connects OSPF to external routing domains |

### Dijkstra's Algorithm (Simplified)

```
Finding shortest path from R1 to all destinations:

  Network:
          5
    R1 -------> R2
    |            |
  2 |            | 1
    |            |
    v     3      v
    R3 -------> R4

  Step 1: Start at R1, cost = 0
  Step 2: Visit neighbors: R2 (cost 5), R3 (cost 2)
  Step 3: Pick lowest unvisited: R3 (cost 2)
  Step 4: From R3, check R4: cost 2 + 3 = 5
  Step 5: Pick lowest unvisited: R2 (cost 5) or R4 (cost 5)
  Step 6: From R2, check R4: cost 5 + 1 = 6 (worse than 5, ignore)

  Shortest Path Tree from R1:
    R1 -> R2: cost 5 (direct)
    R1 -> R3: cost 2 (direct)
    R1 -> R4: cost 5 (via R3)
```

### OSPF Neighbor States

```
OSPF Neighbor Formation:

  Down --> Init --> 2-Way --> ExStart --> Exchange --> Loading --> Full

  Down:     No hellos received
  Init:     Hello received, but not acknowledged
  2-Way:    Bidirectional communication confirmed (DR/BDR election)
  ExStart:  Master/slave negotiation for database exchange
  Exchange: Database Description (DBD) packets exchanged
  Loading:  Link-State Requests/Updates exchanged
  Full:     Databases synchronized -- neighbors are fully adjacent
```

## BGP (Border Gateway Protocol)

BGP is the **routing protocol of the internet**. It connects autonomous systems and determines paths across the global internet. BGP is a **path-vector** protocol.

### BGP Basics

```
Internet Structure:

  +---AS 100---+    +---AS 200---+    +---AS 300---+
  | (Google)   |    | (ISP)      |    | (Netflix)  |
  |            |    |            |    |            |
  | [Internal  |    | [Internal  |    | [Internal  |
  |  routers]  |    |  routers]  |    |  routers]  |
  +--[BGP R]---+----+--[BGP R]---+----+--[BGP R]---+
       |                  |                  |
       eBGP              eBGP              eBGP
       sessions          sessions          sessions

  eBGP = External BGP (between different AS's)
  iBGP = Internal BGP (within the same AS)
```

### BGP Path Selection

BGP uses multiple attributes to select the best path (in order of priority):

| Priority | Attribute | Description |
|----------|-----------|-------------|
| 1 | **Weight** (Cisco-specific) | Locally set, higher is preferred |
| 2 | **Local Preference** | Preference within an AS, higher is better |
| 3 | **Locally Originated** | Prefer routes originated locally |
| 4 | **AS Path Length** | Shorter AS path is preferred |
| 5 | **Origin Type** | IGP > EGP > Incomplete |
| 6 | **MED** (Multi-Exit Discriminator) | Suggests preferred entry point, lower is better |
| 7 | **eBGP over iBGP** | Prefer externally learned routes |
| 8 | **Lowest IGP metric** | Closest exit point (hot-potato routing) |

### BGP AS Path Example

```
Route advertisement for 203.0.113.0/24:

  AS 500 originates the prefix.

  AS 400 receives it:  Path = [500]
  AS 300 receives it:  Path = [400, 500]
  AS 200 receives it:  Path = [300, 400, 500]
  AS 100 receives it:  Path = [200, 300, 400, 500]

  If AS 100 sees Path = [200, 100, 300, 500], it REJECTS the route
  because AS 100 is already in the path (loop detected).
```

### eBGP vs iBGP

| Feature | eBGP | iBGP |
|---------|------|------|
| Peers | Different AS | Same AS |
| TTL | 1 (directly connected by default) | 255 (multi-hop within AS) |
| Next hop | Changes at each AS boundary | Stays the same (must be resolved) |
| Full mesh | Not required | Required (or use route reflectors) |

## Routing Protocol Comparison Table

| Feature | RIP | OSPF | BGP |
|---------|-----|------|-----|
| **Algorithm** | Distance vector | Link-state | Path-vector |
| **Metric** | Hop count (max 15) | Cost (bandwidth-based) | Multiple attributes |
| **Scope** | IGP (small networks) | IGP (enterprise) | EGP (internet) |
| **Convergence** | Slow (minutes) | Fast (seconds) | Moderate |
| **Scalability** | Poor (<15 hops) | Good (hierarchical areas) | Excellent (internet-scale) |
| **Update method** | Periodic (30s) | Triggered (on change) | Triggered (on change) |
| **Transport** | UDP port 520 | IP protocol 89 | TCP port 179 |
| **Classless** | v2 only | Yes | Yes |
| **Authentication** | v2 (MD5) | MD5, SHA | MD5, TCP-AO |
| **Complexity** | Very simple | Moderate | High |
| **Best for** | Labs, tiny networks | Enterprise networks | ISPs, internet backbone |

## Exercises

### Beginner

1. Classify each protocol as distance vector, link-state, or path-vector:
   - RIPv2
   - OSPF
   - BGP
   - IS-IS
   - EIGRP

2. Why is RIP unsuitable for a network with more than 15 routers in a path? What happens to a route with a hop count of 16?

3. What is the difference between an IGP and an EGP? Give one example of each.

### Intermediate

4. In an OSPF network, calculate the total cost for a path that traverses:
   - One Gigabit Ethernet link (1 Gbps)
   - Two Fast Ethernet links (100 Mbps each)
   - One T1 serial link (1.544 Mbps)
   Use the default reference bandwidth of 100 Mbps.

5. Explain why OSPF requires all areas to connect to Area 0 (the backbone). What happens if an area is not connected to Area 0?

6. A BGP router receives two paths to `198.51.100.0/24`:
   - Path A: AS Path = [200, 300, 400], MED = 100
   - Path B: AS Path = [500, 600], MED = 200
   Which path is selected and why?

### Advanced

7. Explain the BGP "route leak" problem. Research a real-world BGP incident (e.g., the 2019 Cloudflare/Verizon incident or the 2008 Pakistan YouTube hijack) and describe what happened and what could have prevented it.

8. Design an OSPF area layout for a company with:
   - Headquarters (100 routers)
   - 3 branch offices (10 routers each)
   - 2 data centers (20 routers each)
   Justify your area assignments and identify which routers are ABRs.

9. Compare OSPF and IS-IS. Both are link-state protocols -- why does IS-IS dominate in large ISP backbone networks while OSPF dominates in enterprise networks?

## Key Takeaways

- Distance vector (RIP) is simple but slow to converge and limited to 15 hops
- Link-state (OSPF) builds a complete topology map and uses Dijkstra's algorithm for fast, optimal routing
- Path-vector (BGP) tracks the full AS path and is the only protocol that scales to the global internet
- IGPs route within a single autonomous system; BGP routes between autonomous systems
- OSPF uses hierarchical areas to limit the scope of link-state flooding and SPF calculations
- BGP selects paths using a multi-step decision process based on attributes like AS path length, local preference, and MED
- RIP is suitable only for small or lab networks; real enterprise and ISP networks use OSPF and BGP

---

[← Previous: Routing Fundamentals](./04_routing_fundamentals.md) | [Back to Network Layer](./README.md) | [Next: ICMP and Diagnostics →](./06_icmp_and_diagnostics.md)

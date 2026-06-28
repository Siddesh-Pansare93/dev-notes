# 02. Network Layer

This section dives deep into the Network Layer (Layer 3) of the OSI model. You'll learn how data is addressed, routed, and delivered across interconnected networks -- the very mechanisms that make the internet work.

## Topics Covered

1. **[IP Addressing Fundamentals](./01_ip_addressing.md)**
   - IPv4 address structure and dotted decimal notation
   - IP address classes (A, B, C, D, E) and their ranges
   - Network vs host portions of an address
   - Special and reserved addresses (loopback, broadcast, private)
   - Public vs private IP addressing (RFC 1918)
   - Static vs dynamic IP assignment (DHCP)

2. **[Subnetting and CIDR](./02_subnetting_and_cidr.md)**
   - Why subnetting matters and how it works
   - Subnet masks and CIDR notation
   - Calculating network address, broadcast address, and host ranges
   - Step-by-step subnetting walkthroughs
   - Variable Length Subnet Masks (VLSM)

3. **[IPv4 vs IPv6](./03_ipv4_vs_ipv6.md)**
   - The IPv4 address exhaustion problem
   - IPv6 address format and representation
   - IPv6 address types (unicast, multicast, anycast)
   - Side-by-side comparison of IPv4 and IPv6
   - Transition mechanisms (dual stack, tunneling, NAT64)

4. **[Routing Fundamentals](./04_routing_fundamentals.md)**
   - What routing is and how routers make forwarding decisions
   - Static vs dynamic routing
   - Reading and interpreting routing tables
   - Default gateways, hop counts, and metrics
   - Direct vs indirect delivery

5. **[Routing Protocols (RIP, OSPF, BGP)](./05_routing_protocols.md)**
   - Distance vector vs link-state vs path-vector algorithms
   - RIP: simplicity and limitations
   - OSPF: areas, cost metrics, and Dijkstra's algorithm
   - BGP: the protocol that runs the internet backbone
   - Interior vs exterior gateway protocols (IGP vs EGP)

6. **[ICMP and Network Diagnostics](./06_icmp_and_diagnostics.md)**
   - Internet Control Message Protocol (ICMP) message types
   - Using ping to test connectivity
   - traceroute/tracert for path analysis
   - MTU and Path MTU Discovery
   - Practical diagnostic scenarios

7. **[NAT and Port Forwarding](./07_nat_and_port_forwarding.md)**
   - Network Address Translation: why and how
   - Static NAT, Dynamic NAT, and PAT/NAPT
   - NAT translation tables and connection tracking
   - Port forwarding configuration
   - NAT traversal challenges and security implications

## Learning Objectives

By the end of this section, you will:

- Understand IPv4 and IPv6 addressing schemes in detail
- Be able to subnet networks and apply CIDR notation confidently
- Know how routers forward packets and build routing tables
- Compare major routing protocols (RIP, OSPF, BGP) and their use cases
- Use ICMP-based tools (ping, traceroute) for network diagnostics
- Explain how NAT enables private networks to access the internet

## Prerequisites

- Completion of [01. Fundamentals](../01_fundamentals/) (especially the OSI and TCP/IP model tutorials)
- Basic understanding of binary and hexadecimal number systems
- Access to a command line (Linux terminal or Windows Command Prompt)

## Estimated Time

**3-4 hours** to complete all tutorials in this section.

## How to Use This Section

1. Work through the tutorials in order -- each builds on concepts from the previous one
2. Try every command example on your own machine
3. Complete the exercises at the end of each tutorial before moving on
4. Refer back to the ASCII diagrams when concepts feel abstract

---

[← Back to Computer Networks](../README.md) | [Start: IP Addressing Fundamentals →](./01_ip_addressing.md)

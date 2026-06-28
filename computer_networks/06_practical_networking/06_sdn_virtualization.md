# SDN and Network Virtualization

## What You'll Learn

- Understand the limitations of traditional networking that led to SDN
- Describe the **SDN architecture**: control plane, data plane, application plane
- Explain the role of **OpenFlow** as a southbound protocol
- Differentiate **Network Function Virtualization (NFV)** from SDN
- Work with virtual switches like **Open vSwitch (OVS)**
- Understand overlay networks: **VXLAN** and **GRE** tunnels
- Recognize the role of **SD-WAN** in modern enterprise networking
- Navigate **container networking** (Docker networks, CNI plugins)
- Grasp **cloud networking** fundamentals (VPC, subnets, security groups)
- Assess the future trajectory of network engineering

---

## 1. Traditional Networking Limitations

In traditional networks, each device (switch, router, firewall) has its own control plane and data plane tightly coupled together.

```
Traditional Network Device:

+----------------------------+
|        Device (Switch)     |
|  +----------------------+  |
|  |    Control Plane     |  |  <-- Decision-making
|  |  (routing protocols, |  |      (WHERE to send)
|  |   MAC learning, STP) |  |
|  +----------+-----------+  |
|             |              |
|  +----------v-----------+  |
|  |     Data Plane       |  |  <-- Packet forwarding
|  |  (ASICs, forwarding  |  |      (HOW to send)
|  |   tables, buffers)   |  |
|  +----------------------+  |
+----------------------------+

Each device is configured individually via CLI/GUI.
```

### Problems with the Traditional Model

| Problem | Description |
|---------|-------------|
| **Device-by-device config** | Each switch/router configured independently — slow, error-prone |
| **Vendor lock-in** | Proprietary CLI, OS, and features per vendor |
| **Inflexible** | Changes require reconfiguring multiple devices manually |
| **No programmability** | Cannot automate network behavior via APIs |
| **Slow provisioning** | New network services take days/weeks to deploy |
| **Limited visibility** | No centralized view of the entire network |

---

## 2. Software-Defined Networking (SDN) Architecture

SDN **decouples** the control plane from the data plane. A centralized controller makes forwarding decisions, and network devices simply execute them.

```
SDN Architecture (Three Planes):

+-------------------------------------------+
|          Application Plane                |
|  +--------+  +--------+  +-----------+   |
|  | Network|  |Security |  | Traffic   |   |
|  | Monitor|  | Policy  |  | Engineer  |   |
|  +---+----+  +---+-----+  +----+------+   |
|      |           |              |          |
|======|===========|==============|==========|  <-- Northbound API
|      v           v              v          |      (REST, gRPC)
| +-------------------------------------------+
| |          Control Plane                     |
| |     +---------------------------+          |
| |     |     SDN Controller        |          |
| |     | (OpenDaylight, ONOS,      |          |
| |     |  Floodlight, Ryu)         |          |
| |     +---------------------------+          |
| +-------------------------------------------+
|      |           |              |          |
|======|===========|==============|==========|  <-- Southbound API
|      v           v              v          |      (OpenFlow, NETCONF)
| +-------------------------------------------+
| |          Data Plane (Infrastructure)       |
| |  +------+    +------+    +------+         |
| |  |Switch|    |Switch|    |Switch|         |
| |  | (FW  |    | (FW  |    | (FW  |         |
| |  | table|    | table|    | table|         |
| |  | only)|    | only)|    | only)|         |
| |  +------+    +------+    +------+         |
| +-------------------------------------------+
```

### The Three Planes

| Plane | Role | Examples |
|-------|------|----------|
| **Application** | Business logic, network apps, policies | Monitoring tools, firewalls, load balancers |
| **Control** | Centralized decision-making, topology knowledge | OpenDaylight, ONOS, Ryu, Floodlight |
| **Data** (Infrastructure) | Packet forwarding based on controller instructions | OpenFlow switches, Open vSwitch |

### SDN Interfaces

| Interface | Direction | Purpose | Protocols |
|-----------|-----------|---------|-----------|
| **Northbound** | Controller <-> Apps | Applications program the network | REST API, gRPC |
| **Southbound** | Controller <-> Devices | Controller programs forwarding rules | OpenFlow, NETCONF, OVSDB |
| **East-West** | Controller <-> Controller | Multi-controller coordination | Proprietary, BGP |

---

## 3. OpenFlow Protocol

OpenFlow is the most well-known southbound protocol for SDN. It defines how the controller communicates with switches.

```
OpenFlow Switch Internals:

+----------------------------------------+
|  OpenFlow Switch                       |
|                                        |
|  +----------------------------------+  |
|  |        Flow Table                |  |
|  |                                  |  |
|  | Match Fields       | Actions     |  |
|  |--------------------+-------------|  |
|  | dst_ip=10.0.0.0/8  | fwd port 2 |  |
|  | src_ip=192.168.1.5  | drop       |  |
|  | tcp_dst=80          | fwd port 3 |  |
|  | *  (default)        | to controller  |
|  +----------------------------------+  |
|                                        |
|  Secure Channel to SDN Controller      |
+----------------------------------------+
```

### OpenFlow Flow Entry Components

| Component | Description |
|-----------|-------------|
| **Match Fields** | Criteria to match packets (MAC, IP, port, VLAN, etc.) |
| **Priority** | Higher priority rules are checked first |
| **Counters** | Packet and byte counts per rule |
| **Actions** | What to do with matching packets (forward, drop, modify, send to controller) |
| **Timeouts** | Idle timeout and hard timeout for automatic rule expiration |

### OpenFlow Messages

```
Controller                        Switch
    |                               |
    |<--- HELLO -------------------|  (version negotiation)
    |---- HELLO ------------------->|
    |                               |
    |---- FEATURES_REQUEST -------->|  (learn switch capabilities)
    |<--- FEATURES_REPLY ----------|
    |                               |
    |<--- PACKET_IN ---------------|  (switch asks about unknown packet)
    |---- FLOW_MOD ---------------->|  (controller installs a rule)
    |                               |
    |---- STATS_REQUEST ----------->|  (query flow statistics)
    |<--- STATS_REPLY -------------|
```

---

## 4. Network Function Virtualization (NFV)

NFV replaces dedicated hardware appliances (firewalls, load balancers, IDS) with software running on commodity servers.

```
Traditional:                     NFV:

+--------+ +--------+ +------+  +----------------------------+
|Physical| |Physical| |Phys. |  |  Commodity Server          |
|Firewall| |  LB    | | IDS  |  |  +------+ +----+ +-----+  |
|        | |        | |      |  |  | vFW  | | vLB| | vIDS|  |
+--------+ +--------+ +------+  |  +------+ +----+ +-----+  |
                                 |  (Virtual Network Functions)|
 $$$$ per appliance              |  Running on standard VMs   |
 Vendor-specific                 +----------------------------+
                                  $ per server
                                  Vendor-agnostic
```

### SDN vs NFV

| Aspect | SDN | NFV |
|--------|-----|-----|
| Focus | Separating control from data plane | Virtualizing network functions |
| What it replaces | Traditional switch/router management | Dedicated hardware appliances |
| Key technology | Centralized controller + OpenFlow | VMs/containers on commodity hardware |
| Relationship | Complementary — often deployed together |

---

## 5. Virtual Switches — Open vSwitch (OVS)

Open vSwitch is a production-quality virtual switch that supports OpenFlow and is widely used in virtualization and cloud platforms.

```
Open vSwitch Architecture:

+----------------------------------------+
|          Host Server                   |
|                                        |
|  +------+  +------+  +------+         |
|  | VM 1 |  | VM 2 |  | VM 3 |         |
|  +--+---+  +--+---+  +--+---+         |
|     |         |         |              |
|  +--v---------v---------v-----------+  |
|  |       Open vSwitch (OVS)        |  |
|  |                                  |  |
|  |  - OpenFlow flow tables          |  |
|  |  - VLAN tagging                  |  |
|  |  - GRE/VXLAN tunneling           |  |
|  |  - QoS, mirroring, sFlow         |  |
|  +--+-------------------------------+  |
|     |                                  |
|  +--v--------+                         |
|  | Physical  |                         |
|  | NIC (eth0)|                         |
|  +-----------+                         |
+----------------------------------------+
```

### OVS Commands

```bash
# Create a bridge
sudo ovs-vsctl add-br br0

# Add a port
sudo ovs-vsctl add-port br0 eth0

# Show bridge configuration
sudo ovs-vsctl show

# Add a VXLAN tunnel port
sudo ovs-vsctl add-port br0 vxlan0 -- set interface vxlan0 \
    type=vxlan options:remote_ip=10.0.0.2 options:key=100

# Show flow tables
sudo ovs-ofctl dump-flows br0

# Add an OpenFlow rule
sudo ovs-ofctl add-flow br0 "priority=100,ip,nw_dst=10.0.0.0/24,actions=output:2"

# Delete all flows
sudo ovs-ofctl del-flows br0
```

---

## 6. Overlay Networks — VXLAN and GRE

Overlay networks create virtual Layer 2 networks on top of existing Layer 3 infrastructure, enabling VMs on different physical hosts to communicate as if on the same LAN.

### VXLAN (Virtual Extensible LAN)

```
VXLAN Encapsulation:

Original Frame:
+------+--------+---------+
| Eth  |  IP    | Payload |
+------+--------+---------+

VXLAN Encapsulated:
+------+--------+-----+------+------+--------+---------+
| Outer| Outer  | UDP  |VXLAN | Inner| Inner  | Payload |
| Eth  | IP     | 4789 |Header| Eth  | IP     |         |
+------+--------+-----+------+------+--------+---------+
  ^--- Transport network -^    ^--- Tenant network ------^
```

| Feature | VXLAN | GRE |
|---------|-------|-----|
| Encapsulation | UDP (port 4789) | IP protocol 47 |
| Identifier | VNI (24-bit = 16M networks) | Key (32-bit) |
| Multicast | Supports multicast for BUM traffic | Point-to-point |
| Use case | Data center overlays, multi-tenant | Site-to-site tunnels |
| Overhead | 50 bytes | 24 bytes |

### GRE Tunnel Example (Linux)

```bash
# On Host A (10.0.0.1)
sudo ip tunnel add gre1 mode gre remote 10.0.0.2 local 10.0.0.1 ttl 255
sudo ip link set gre1 up
sudo ip addr add 172.16.0.1/24 dev gre1

# On Host B (10.0.0.2)
sudo ip tunnel add gre1 mode gre remote 10.0.0.1 local 10.0.0.2 ttl 255
sudo ip link set gre1 up
sudo ip addr add 172.16.0.2/24 dev gre1

# Test
ping 172.16.0.2   # from Host A
```

---

## 7. SD-WAN (Software-Defined Wide Area Network)

SD-WAN applies SDN principles to WAN connectivity, enabling organizations to use multiple transport types (MPLS, broadband, LTE) efficiently.

```
Traditional WAN:                SD-WAN:

Branch ---[MPLS only]--> HQ    Branch ---[MPLS]------+
                                       ---[Internet]--+--> SD-WAN --> HQ
Expensive, inflexible                  ---[LTE]-------+
                                       
                                Chooses best path per application
                                Encrypted tunnels over internet
```

### SD-WAN Benefits

| Benefit | Description |
|---------|-------------|
| **Cost reduction** | Supplement or replace expensive MPLS with broadband |
| **Application-aware routing** | Route video over high-bandwidth, VoIP over low-latency |
| **Zero-touch provisioning** | Deploy branch devices without on-site engineers |
| **Centralized management** | Single dashboard for all WAN connections |
| **Encryption** | All traffic encrypted across public internet |

---

## 8. Container Networking

### Docker Networking

Docker provides several built-in network drivers:

```
Docker Network Types:

+---------------------------------------------------------------+
| Driver     | Scope   | Use Case                              |
|------------|---------|---------------------------------------|
| bridge     | Single  | Default; containers on same host      |
|            | host    | communicate via virtual bridge        |
| host       | Single  | Container shares host's network       |
|            | host    | stack (no isolation)                  |
| overlay    | Multi-  | Containers across multiple Docker     |
|            | host    | hosts (Swarm / Compose)               |
| macvlan    | Single  | Container gets its own MAC on the     |
|            | host    | physical network (appears as device)  |
| none       | —       | No networking                         |
+---------------------------------------------------------------+
```

```bash
# List Docker networks
docker network ls

# Create a custom bridge network
docker network create --driver bridge --subnet 172.20.0.0/16 my-network

# Run container on custom network
docker run -d --name web --network my-network -p 8080:80 nginx

# Connect running container to another network
docker network connect my-network existing-container

# Inspect a network
docker network inspect my-network
```

### Docker Bridge Network Internals

```
+--------------------------------------------+
|  Docker Host                               |
|                                            |
|  +----------+      +----------+            |
|  | Container|      | Container|            |
|  | (web)    |      | (api)    |            |
|  | 172.17.  |      | 172.17.  |            |
|  |   0.2    |      |   0.3    |            |
|  +----+-----+      +----+-----+            |
|       |  veth pair       |  veth pair      |
|  +----v------------------v-----------+     |
|  |         docker0 bridge            |     |
|  |         (172.17.0.1)              |     |
|  +---------------+-------------------+     |
|                  |                         |
|            iptables NAT                    |
|                  |                         |
|  +---------------v-------------------+     |
|  |         eth0 (host NIC)           |     |
|  +-----------------------------------+     |
+--------------------------------------------+
```

### Kubernetes CNI (Container Network Interface)

Kubernetes uses CNI plugins for pod networking. Each pod gets its own IP address.

| CNI Plugin | Networking Model | Key Feature |
|------------|-----------------|-------------|
| Calico | L3 routing (BGP) | Network policies, high performance |
| Flannel | Overlay (VXLAN) | Simple, easy setup |
| Cilium | eBPF-based | Advanced security, observability |
| Weave Net | Overlay (mesh) | Encryption, simple multi-host |
| Canal | Flannel + Calico policies | Best of both approaches |

---

## 9. Cloud Networking Concepts

### VPC (Virtual Private Cloud)

A VPC is an isolated virtual network within a cloud provider where you launch resources.

```
AWS VPC Example:

+--------------------------------------------------+
|  VPC: 10.0.0.0/16                                |
|                                                  |
|  +--------------------+  +--------------------+  |
|  | Public Subnet      |  | Private Subnet     |  |
|  | 10.0.1.0/24        |  | 10.0.2.0/24        |  |
|  |                    |  |                    |  |
|  | +------+ +------+  |  | +------+ +------+  |  |
|  | | Web  | | Web  |  |  | | App  | | DB   |  |  |
|  | | EC2  | | EC2  |  |  | | EC2  | | RDS  |  |  |
|  | +------+ +------+  |  | +------+ +------+  |  |
|  |                    |  |                    |  |
|  | Route: 0.0.0.0/0   |  | Route: 0.0.0.0/0  |  |
|  |   -> IGW           |  |   -> NAT Gateway   |  |
|  +--------------------+  +--------------------+  |
|            |                       |             |
|   +--------v--------+    +--------v--------+    |
|   | Internet Gateway|    |  NAT Gateway    |    |
|   +-----------------+    +-----------------+    |
|            |                       |             |
+------------|---------- ------------|---------   -+
             v                       v
          Internet                Internet
        (inbound+outbound)       (outbound only)
```

### Security Groups vs NACLs

| Feature | Security Group | NACL (Network ACL) |
|---------|---------------|-------------------|
| Level | Instance (ENI) | Subnet |
| State | **Stateful** (return traffic auto-allowed) | **Stateless** (must allow both directions) |
| Rules | Allow only | Allow and Deny |
| Evaluation | All rules evaluated | Rules evaluated in order (by number) |
| Default | Deny all inbound, allow all outbound | Allow all (default NACL) |

### Cloud Networking Comparison

| Concept | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Virtual Network | VPC | VPC | VNet |
| Subnet | Subnet | Subnet | Subnet |
| Instance Firewall | Security Group | Firewall Rules | NSG |
| Subnet Firewall | NACL | — | NSG (subnet-level) |
| NAT | NAT Gateway | Cloud NAT | NAT Gateway |
| DNS | Route 53 | Cloud DNS | Azure DNS |
| Load Balancer | ALB/NLB | Cloud LB | Azure LB |
| VPN | VPN Gateway | Cloud VPN | VPN Gateway |
| Direct Connection | Direct Connect | Interconnect | ExpressRoute |

---

## 10. The Future of Networking

| Trend | Description |
|-------|-------------|
| **Intent-Based Networking (IBN)** | Declare "what" you want; the system determines "how" (e.g., Cisco DNA Center) |
| **AIOps for Networks** | ML-driven anomaly detection, auto-remediation, capacity planning |
| **eBPF** | Programmable packet processing in the Linux kernel — used by Cilium, Falco |
| **Service Mesh** | Sidecar proxies (Istio/Envoy) handle inter-service networking in microservices |
| **Network as Code** | Terraform, Pulumi, Ansible for infrastructure provisioning and config |
| **5G and Edge** | Distributed compute at the network edge, enabled by NFV |
| **Zero Trust** | "Never trust, always verify" — microsegmentation, identity-based access |

---

## SDN vs Traditional Networking — Summary

| Aspect | Traditional | SDN |
|--------|-------------|-----|
| Control Plane | Distributed (per device) | Centralized (controller) |
| Configuration | CLI per device | Programmatic API |
| Vendor Dependency | High (proprietary NOS) | Lower (open protocols) |
| Agility | Days/weeks for changes | Minutes/seconds |
| Visibility | Per-device monitoring | Global network view |
| Automation | Limited scripting | Full programmability |
| Cost | High (vendor hardware) | Lower (commodity hardware + software) |

---

## Exercises

### Beginner

1. Draw the three planes of SDN architecture from memory. Label each plane and give one example component for each.
2. Explain the difference between SDN and NFV in two sentences each. How do they complement each other?
3. Run `docker network ls` and `docker network inspect bridge`. Describe the default bridge network: what subnet does it use? What is the gateway IP?

### Intermediate

4. Create a custom Docker bridge network (`172.30.0.0/16`) and launch two containers on it. Verify they can ping each other by container name (Docker's built-in DNS). Then verify they cannot communicate with containers on the default bridge.
5. Set up a GRE tunnel between two Linux VMs (or network namespaces). Assign private IPs to the tunnel endpoints and verify connectivity with `ping`. Capture tunnel traffic with `tcpdump` and observe the GRE encapsulation.
6. Install Open vSwitch on a Linux machine. Create a bridge, add two ports, and use `ovs-ofctl` to add a flow rule that drops all traffic from a specific MAC address. Verify the rule with `ovs-ofctl dump-flows`.

### Advanced

7. Using Docker Compose, create a multi-service application (web + api + database) with an overlay network. Deploy it on two Docker hosts using Docker Swarm. Verify cross-host container communication and inspect the VXLAN encapsulation with `tcpdump`.
8. Install the Ryu SDN controller. Write a simple OpenFlow application in Python that acts as a learning switch: on `PACKET_IN`, learn the source MAC/port mapping, and if the destination MAC is known, install a flow rule; otherwise flood. Test with Mininet.
9. Design a cloud VPC architecture for a three-tier web application (web, app, database tiers). Specify: CIDR blocks, public vs private subnets, security group rules, NACLs, NAT gateway placement, and load balancer type. Diagram the architecture and justify each design choice.

---

## Key Takeaways

- SDN **separates the control plane from the data plane**, enabling centralized, programmable network management
- **OpenFlow** is the foundational southbound protocol that lets an SDN controller program switch flow tables
- **NFV** virtualizes network appliances (firewalls, load balancers) onto commodity hardware — complementary to SDN
- **Overlay networks** (VXLAN, GRE) create virtual L2 segments over existing L3 infrastructure, essential for multi-tenant cloud
- **Container networking** (Docker bridge, overlay, CNI plugins) is critical knowledge for modern DevOps
- **Cloud VPCs** are software-defined networks — understanding subnets, security groups, and routing tables is essential for cloud engineering
- The future is **programmable, automated, and intent-driven** — networking is becoming software engineering

---

## Navigation

| Previous | Home | Next |
|:---------|:----:|-----:|
| [Load Balancing & High Availability](./05_load_balancing.md) | [Practical Networking](./README.md) | [07_Advanced_Topics](../07_advanced_topics/) |

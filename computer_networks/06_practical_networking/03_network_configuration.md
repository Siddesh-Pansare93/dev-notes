# Network Configuration (Linux / Windows)

## What You'll Learn

- Configure network interfaces using the **ip** command suite on Linux
- Manage persistent network settings with **netplan**, **NetworkManager**, and `/etc/network/interfaces`
- Configure DNS resolution with `/etc/resolv.conf` and **systemd-resolved**
- Set up **network bonding/teaming** for redundancy and throughput
- Configure Windows networking with **GUI**, **netsh**, and **PowerShell**
- Perform common tasks: static IP assignment, DNS configuration, default gateway setup
- Follow a structured approach to network troubleshooting

---

## 1. Linux Network Configuration

### 1.1 The ip Command Suite

The `ip` command replaces the legacy `ifconfig`, `route`, and `arp` commands.

```
ip command hierarchy:

ip ─┬─ addr    ── Manage IP addresses on interfaces
    ├─ link    ── Manage network interfaces (up/down, MTU, MAC)
    ├─ route   ── Manage the routing table
    ├─ neigh   ── Manage ARP/neighbor cache
    └─ -s      ── Show statistics
```

#### ip addr — Managing IP Addresses

```bash
# Show all interfaces with addresses
ip addr show

# Show a specific interface
ip addr show dev eth0

# Add an IP address
sudo ip addr add 192.168.1.100/24 dev eth0

# Add a secondary IP (alias)
sudo ip addr add 192.168.1.101/24 dev eth0 label eth0:1

# Remove an IP address
sudo ip addr del 192.168.1.100/24 dev eth0

# Flush all IPs from an interface
sudo ip addr flush dev eth0
```

#### ip route — Managing Routes

```bash
# Show routing table
ip route show

# Add a default gateway
sudo ip route add default via 192.168.1.1 dev eth0

# Add a static route to a specific network
sudo ip route add 10.10.0.0/16 via 192.168.1.254 dev eth0

# Delete a route
sudo ip route del 10.10.0.0/16

# Show the route for a specific destination
ip route get 8.8.8.8
```

#### ip link — Managing Interfaces

```bash
# Show all interfaces
ip link show

# Bring interface up / down
sudo ip link set eth0 up
sudo ip link set eth0 down

# Change MTU
sudo ip link set eth0 mtu 9000

# Change MAC address
sudo ip link set eth0 address 02:42:ac:11:00:02

# Show interface statistics
ip -s link show eth0
```

> **Important:** Changes made with `ip` commands are **temporary** — they do not survive a reboot. Use the persistent configuration methods below for permanent settings.

---

### 1.2 Persistent Configuration

Linux distributions use different systems for persistent network configuration:

```
+------------------------------------------------------+
| Distribution         | Configuration System          |
|----------------------|-------------------------------|
| Ubuntu 18.04+        | Netplan (YAML files)          |
| Ubuntu Desktop       | NetworkManager (GUI + nmcli)  |
| Debian               | /etc/network/interfaces       |
| RHEL/CentOS/Fedora   | NetworkManager (nmcli)        |
| Arch Linux           | systemd-networkd / NM         |
+------------------------------------------------------+
```

#### Netplan (Ubuntu 18.04+)

Configuration files live in `/etc/netplan/` and use YAML format.

```yaml
# /etc/netplan/01-network-config.yaml

network:
  version: 2
  renderer: networkd        # or NetworkManager
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
        search:
          - example.local
    eth1:
      dhcp4: true
```

```bash
# Validate configuration
sudo netplan try        # Apply temporarily, reverts in 120s if not confirmed

# Apply configuration permanently
sudo netplan apply

# Generate backend config files for debugging
sudo netplan generate
```

#### /etc/network/interfaces (Debian)

```
# /etc/network/interfaces

# Loopback
auto lo
iface lo inet loopback

# Static configuration
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
    dns-search example.local

# DHCP configuration
auto eth1
iface eth1 inet dhcp
```

```bash
# Restart networking
sudo systemctl restart networking

# Bring a specific interface up/down
sudo ifup eth0
sudo ifdown eth0
```

#### NetworkManager (nmcli)

```bash
# Show all connections
nmcli connection show

# Show device status
nmcli device status

# Create a static IP connection
nmcli connection add type ethernet con-name "static-eth0" \
    ifname eth0 ipv4.method manual \
    ipv4.addresses 192.168.1.100/24 \
    ipv4.gateway 192.168.1.1 \
    ipv4.dns "8.8.8.8,8.8.4.4"

# Modify an existing connection
nmcli connection modify "static-eth0" ipv4.dns "1.1.1.1,1.0.0.1"

# Activate / deactivate
nmcli connection up "static-eth0"
nmcli connection down "static-eth0"

# Switch to DHCP
nmcli connection modify "static-eth0" ipv4.method auto
```

---

### 1.3 DNS Configuration on Linux

```
DNS Resolution Chain:

Application
    |
    v
/etc/nsswitch.conf  ──>  "hosts: files dns"
    |                          |       |
    v                          v       v
/etc/hosts             systemd-resolved / resolv.conf
                               |
                               v
                        Upstream DNS Server
```

#### /etc/resolv.conf

```
# /etc/resolv.conf (traditional)
nameserver 8.8.8.8
nameserver 1.1.1.1
search example.local corp.example.com
options timeout:2 attempts:3
```

#### systemd-resolved (modern Ubuntu/Fedora)

```bash
# Check resolved status
resolvectl status

# Set DNS for an interface
sudo resolvectl dns eth0 8.8.8.8 8.8.4.4

# Set search domain
sudo resolvectl domain eth0 example.local

# View current DNS configuration
resolvectl query example.com

# Flush DNS cache
sudo resolvectl flush-caches
```

> **Gotcha:** On systems with `systemd-resolved`, `/etc/resolv.conf` often points to `127.0.0.53`. The real upstream DNS is managed by `resolvectl`.

---

### 1.4 Network Interface Bonding / Teaming

Bonding combines multiple physical interfaces into one logical interface for redundancy or increased throughput.

```
Bonding Modes:

+----------------------------------------------------------+
| Mode | Name           | Description                      |
|------|----------------|----------------------------------|
| 0    | balance-rr     | Round-robin across interfaces    |
| 1    | active-backup  | One active, others standby       |
| 2    | balance-xor    | Hash-based distribution          |
| 3    | broadcast      | Send on all interfaces           |
| 4    | 802.3ad        | LACP (requires switch support)   |
| 5    | balance-tlb    | Adaptive transmit load balancing |
| 6    | balance-alb    | Adaptive load balancing (rx+tx)  |
+----------------------------------------------------------+
```

```yaml
# Netplan bonding example
network:
  version: 2
  bonds:
    bond0:
      interfaces:
        - eth0
        - eth1
      addresses:
        - 10.0.0.10/24
      routes:
        - to: default
          via: 10.0.0.1
      parameters:
        mode: active-backup
        primary: eth0
        mii-monitor-interval: 100
```

```bash
# Verify bond status
cat /proc/net/bonding/bond0
```

---

## 2. Windows Network Configuration

### 2.1 GUI Configuration

```
Path to Network Settings:

Settings > Network & Internet > Ethernet/Wi-Fi
    > Change adapter options
        > Right-click adapter > Properties
            > Internet Protocol Version 4 (TCP/IPv4)
                > Properties
                    [x] Use the following IP address:
                        IP: 192.168.1.100
                        Mask: 255.255.255.0
                        Gateway: 192.168.1.1
                    [x] Use the following DNS:
                        Preferred: 8.8.8.8
                        Alternate: 8.8.4.4
```

### 2.2 netsh Commands

```cmd
REM Show interface configuration
netsh interface ip show config

REM Set static IP
netsh interface ip set address "Ethernet" static 192.168.1.100 255.255.255.0 192.168.1.1

REM Set DNS servers
netsh interface ip set dns "Ethernet" static 8.8.8.8
netsh interface ip add dns "Ethernet" 8.8.4.4 index=2

REM Switch to DHCP
netsh interface ip set address "Ethernet" dhcp
netsh interface ip set dns "Ethernet" dhcp

REM Show routing table
netsh interface ip show route

REM Add a static route
netsh interface ip add route 10.10.0.0/16 "Ethernet" 192.168.1.254

REM Flush DNS cache
ipconfig /flushdns

REM Release and renew DHCP lease
ipconfig /release
ipconfig /renew

REM Show full IP configuration
ipconfig /all
```

### 2.3 PowerShell Networking Cmdlets

```powershell
# Show all network adapters
Get-NetAdapter

# Show IP configuration
Get-NetIPAddress -InterfaceAlias "Ethernet"

# Set a static IP
New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress 192.168.1.100 `
    -PrefixLength 24 `
    -DefaultGateway 192.168.1.1

# Remove an IP address
Remove-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.100

# Set DNS servers
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" `
    -ServerAddresses ("8.8.8.8", "8.8.4.4")

# Show routing table
Get-NetRoute

# Add a static route
New-NetRoute -DestinationPrefix "10.10.0.0/16" `
    -InterfaceAlias "Ethernet" `
    -NextHop 192.168.1.254

# Test connectivity (PowerShell ping)
Test-NetConnection -ComputerName 8.8.8.8
Test-NetConnection -ComputerName example.com -Port 443

# Show DNS cache
Get-DnsClientCache

# Clear DNS cache
Clear-DnsClientCache

# Disable/Enable adapter
Disable-NetAdapter -Name "Ethernet"
Enable-NetAdapter -Name "Ethernet"
```

---

## 3. Common Configuration Tasks

### Static IP Setup — Comparison

| Task | Linux (ip) | Linux (netplan) | Windows (netsh) | Windows (PowerShell) |
|------|-----------|-----------------|-----------------|---------------------|
| Set IP | `ip addr add 10.0.0.5/24 dev eth0` | `addresses: [10.0.0.5/24]` | `netsh interface ip set address ...` | `New-NetIPAddress ...` |
| Set Gateway | `ip route add default via 10.0.0.1` | `routes: [{to: default, via: 10.0.0.1}]` | included in `set address` | `-DefaultGateway` param |
| Set DNS | `resolvectl dns eth0 8.8.8.8` | `nameservers: {addresses: [8.8.8.8]}` | `netsh interface ip set dns ...` | `Set-DnsClientServerAddress ...` |
| Persist? | No | Yes | Yes | Yes |

### Quick DHCP Client Troubleshooting

```bash
# Linux: Release and renew DHCP
sudo dhclient -r eth0     # Release
sudo dhclient eth0         # Renew

# Check DHCP lease info
cat /var/lib/dhcp/dhclient.leases
```

```cmd
REM Windows
ipconfig /release
ipconfig /renew
```

---

## 4. Network Troubleshooting Steps

Follow this structured approach when a machine has no connectivity:

```
+------------------------------------------------------+
|  Step 1: Check Physical / Link Layer                 |
|  $ ip link show eth0         (STATE: UP or DOWN?)    |
|  $ ethtool eth0              (link detected? speed?) |
+------------------------------------------------------+
              |
              v
+------------------------------------------------------+
|  Step 2: Check IP Configuration                      |
|  $ ip addr show eth0        (correct IP? subnet?)    |
|  $ ip route show             (default gateway?)      |
+------------------------------------------------------+
              |
              v
+------------------------------------------------------+
|  Step 3: Test Local Connectivity                     |
|  $ ping 192.168.1.1         (can reach gateway?)     |
|  $ ping <another LAN host>  (ARP working?)           |
+------------------------------------------------------+
              |
              v
+------------------------------------------------------+
|  Step 4: Test Internet Connectivity                  |
|  $ ping 8.8.8.8             (routing works?)         |
+------------------------------------------------------+
              |
              v
+------------------------------------------------------+
|  Step 5: Test DNS Resolution                         |
|  $ dig example.com           (DNS working?)          |
|  $ resolvectl status         (correct DNS server?)   |
+------------------------------------------------------+
              |
              v
+------------------------------------------------------+
|  Step 6: Test Application Layer                      |
|  $ curl -v https://example.com (TLS? HTTP status?)   |
+------------------------------------------------------+
```

### Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ip link show` says DOWN | Cable disconnected or interface disabled | `sudo ip link set eth0 up`, check cable |
| No IP address assigned | DHCP not working or not configured | `sudo dhclient eth0` or set static IP |
| Can ping gateway but not internet | Missing or incorrect default route | `sudo ip route add default via <gateway>` |
| Can ping IPs but not hostnames | DNS misconfiguration | Check `/etc/resolv.conf` or `resolvectl status` |
| Intermittent connectivity | Duplex/speed mismatch or Wi-Fi issues | `ethtool eth0`, check signal strength |
| "Destination host unreachable" | No route or ARP failure | Check routing table and ARP cache |
| "Network is unreachable" | No route to destination network | Add appropriate route |

---

## Exercises

### Beginner

1. Display your current IP address, subnet mask, and default gateway using both `ip` commands (Linux) or `ipconfig` (Windows). Identify which interface is your primary.
2. Use `ip route show` (Linux) or `route print` (Windows) to examine your routing table. How many routes do you have? Which is the default route?
3. Check your current DNS configuration. On Linux, use `resolvectl status` or `cat /etc/resolv.conf`. On Windows, use `ipconfig /all`. What DNS servers are configured?

### Intermediate

4. On a Linux VM, configure a static IP address using netplan. Set IP to `10.0.0.50/24`, gateway to `10.0.0.1`, and DNS to `1.1.1.1`. Apply the config and verify with `ip addr show` and `ping`.
5. On Windows, use PowerShell to: (a) get your current IP configuration, (b) test connectivity to `example.com` on port 443 using `Test-NetConnection`, (c) view your DNS cache with `Get-DnsClientCache`.
6. Write a bash script that checks if an interface has an IP, has a default route, and can ping `8.8.8.8`. Print pass/fail for each check.

### Advanced

7. Set up a network bond (mode 1 — active-backup) using netplan with two virtual interfaces in a VM. Verify failover by bringing down the primary interface and confirming connectivity continues.
8. Create a netplan configuration with two interfaces on different subnets, each with its own default gateway. Use policy routing (`ip rule`) to ensure traffic from each interface uses its own gateway.
9. On a Linux machine, configure `systemd-resolved` to use DNS-over-TLS (DoT) to `1.1.1.1`. Verify with a packet capture that DNS queries are encrypted.

---

## Key Takeaways

- The `ip` command suite (`ip addr`, `ip route`, `ip link`) is the modern standard for Linux networking — learn it thoroughly
- **Temporary** changes (via `ip` commands) are useful for testing; **persistent** changes require netplan, NetworkManager, or interfaces files
- Windows provides three configuration tiers: **GUI** for simple changes, **netsh** for scripting, **PowerShell** for full automation
- DNS misconfiguration is one of the most common networking issues — always verify with `dig` or `nslookup`
- Follow a **systematic bottom-up approach** when troubleshooting: physical > link > network > transport > application
- Always use `netplan try` before `netplan apply` — it gives you a safety net if the config is wrong

---

## Navigation

| Previous | Home | Next |
|:---------|:----:|-----:|
| [Wireshark & Packet Analysis](./02_wireshark_packet_analysis.md) | [Practical Networking](./README.md) | [Home Network Setup](./04_home_network_setup.md) |

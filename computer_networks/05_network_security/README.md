# Network Security

## Section Overview

Network security is the practice of protecting computer networks and data from unauthorized access, misuse, and attacks. This section covers the foundational concepts, tools, and techniques used to secure modern networks — from cryptographic primitives to firewalls, VPNs, and real-world attack/defense strategies.

## What You'll Learn

- Core security principles (CIA triad, AAA, defense in depth)
- How cryptography protects data at rest and in transit
- SSL/TLS handshake mechanics and certificate management
- Firewall types, rules, and network defense architectures
- VPN technologies and secure tunneling protocols
- Common network attacks and how to defend against them
- Industry best practices, compliance, and Zero Trust architecture

## Prerequisites

Before starting this section, you should be comfortable with:

- TCP/IP fundamentals (IP addressing, subnetting)
- How DNS, HTTP, and common protocols work
- Basic command-line usage (Linux or Windows)
- General understanding of client-server architecture

## Tutorials

| # | Topic | Description | Est. Time |
|---|-------|-------------|-----------|
| 1 | [Security Fundamentals](./01_security_fundamentals.md) | CIA triad, threat landscape, defense in depth, AAA framework | 35 min |
| 2 | [Cryptography Basics](./02_cryptography_basics.md) | Symmetric/asymmetric encryption, hashing, digital signatures, PKI | 40 min |
| 3 | [SSL/TLS and Certificates](./03_ssl_tls_certificates.md) | TLS handshake, certificate chains, CA hierarchy, mTLS | 45 min |
| 4 | [Firewalls and Network Defense](./04_firewalls.md) | Firewall types, iptables, DMZ, ACLs, WAF, IDS/IPS | 40 min |
| 5 | [VPN and Secure Tunneling](./05_vpn_tunneling.md) | VPN types, IPSec, WireGuard, OpenVPN, tunnel modes | 35 min |
| 6 | [Common Attacks and Defense](./06_attacks_and_defense.md) | MITM, DDoS, DNS attacks, ARP spoofing, incident response | 45 min |
| 7 | [Security Best Practices](./07_security_best_practices.md) | Zero Trust, segmentation, SIEM, MFA, compliance frameworks | 40 min |

**Total Estimated Time: 4–5 hours**

## Learning Path

```
Security Fundamentals
        │
        ▼
Cryptography Basics
        │
        ▼
SSL/TLS & Certificates
        │
        ├──────────────────┐
        ▼                  ▼
  Firewalls &        VPN & Secure
  Network Defense    Tunneling
        │                  │
        └────────┬─────────┘
                 ▼
    Common Attacks & Defense
                 │
                 ▼
    Security Best Practices
```

## How to Use This Section

1. **Sequential learners** — Work through tutorials 1–7 in order. Each builds on the previous.
2. **Targeted learners** — Jump to a specific topic if you already have foundational knowledge.
3. **Hands-on practice** — Each tutorial includes exercises at Beginner, Intermediate, and Advanced levels. Try them.
4. **Reference use** — Comparison tables and command examples are designed for quick lookup.

## Key Tools Referenced

| Tool | Purpose |
|------|---------|
| `openssl` | Certificate and cryptography operations |
| `iptables` / `nftables` | Linux firewall management |
| `wireshark` / `tcpdump` | Packet capture and analysis |
| `nmap` | Network scanning and reconnaissance |
| `wg` (WireGuard) | VPN configuration |
| `curl` | Testing TLS connections |
| `ssh` | Secure remote access |

## Quick Reference: Security Layers

```
┌─────────────────────────────────────────────┐
│              Application Layer              │
│   WAF, input validation, authentication     │
├─────────────────────────────────────────────┤
│              Transport Layer                │
│   TLS/SSL, certificate pinning              │
├─────────────────────────────────────────────┤
│               Network Layer                 │
│   Firewalls, IPSec, VPN, ACLs              │
├─────────────────────────────────────────────┤
│              Data Link Layer                │
│   802.1X, MAC filtering, VLAN security      │
├─────────────────────────────────────────────┤
│              Physical Layer                 │
│   Physical access controls, cable security  │
└─────────────────────────────────────────────┘
```

## Navigation

- [← Previous Section: Transport Layer](../04_transport_layer/)
- [→ Next Section: Network Troubleshooting](../06_network_troubleshooting/)
- [↑ Back to Computer Networks](../README.md)

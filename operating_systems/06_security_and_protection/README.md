# Security and Protection

Chalo ab OS ke sabse important — aur sabse "real world mein bhi kaam aane wala" — topic pe aate hain: **Security and Protection**. Socho tumne ek super scalable Node.js backend bana diya, Postgres bhi optimize kar diya, lekin agar koi attacker root access le le, ya koi buffer overflow karke tumhara server crash kar de, toh saara kaam bekaar. Security wahi cheez hai jo poori building ko andar se mazboot rakhti hai — bahar se chahe kitni bhi shiny ho.

## Overview

OS security ka matlab hai — data ko protect karna, system ki integrity maintain karna, aur availability ensure karna. Bilkul waise jaise tumhara bank account: paisa sirf tumhe dikhna chahiye (confidentiality), koi bhi usmein chhed-chhaad na kar sake (integrity), aur jab bhi chahiye withdraw kar sako (availability). Yeh module security ke fundamental principles se lekar authentication, access control models, cryptography, common vulnerabilities aur SELinux/AppArmor jaise advanced mechanisms tak sab cover karta hai.

**Estimated Time**: 4-5 hours

## Learning Objectives

Is module ko complete karne ke baad tum:

- Security ke fundamental concepts aur principles samjhoge
- Authentication aur authorization mechanisms seekhoge
- Alag-alag access control models master karoge (DAC, MAC, RBAC)
- OS mein cryptography kaise use hoti hai woh explore karoge
- Common security vulnerabilities identify aur mitigate karna seekhoge
- Advanced security mechanisms (SELinux, AppArmor) configure karna seekhoge

## Prerequisites

- OS basics ki understanding
- Processes aur memory management se familiarity
- File systems ka basic knowledge
- Command-line experience (Linux/Unix)

> [!tip]
> Agar tumhe lage ki yeh sab "sysadmin ka kaam hai, mujhe kya karna" — toh ruko zara. Jab tum production mein Node.js app deploy karte ho, Docker containers chalate ho, ya AWS/GCP pe server manage karte ho, yehi concepts (permissions, encryption, least privilege) tumhare kaam ko secure banate hain. Yeh sirf "OS theory" nahi, tumhari daily engineering life ka hissa hai.

## Module Contents

### 1. [Security Fundamentals](./01_security_fundamentals.md)
**Time**: 45-60 minutes

Yahan se foundation banegi — OS security ke basic building blocks:
- Security goals: confidentiality, integrity, aur availability (CIA triad) — jaise UPI transaction: paisa sirf sahi bande ko dikhe, amount tamper na ho, aur app hamesha available rahe
- Threats, vulnerabilities, aur attacks mein farak
- Security principles: least privilege, defense in depth, fail-safe defaults — Zomato delivery boy ko sirf delivery address dikhna chahiye, poora customer database nahi
- Protection domains aur CPU privilege rings (Ring 0 se Ring 3)
- Security policies vs mechanisms — policy batati hai "kya allowed hai", mechanism batata hai "kaise enforce hoga"
- Trusted Computing Base (TCB) — woh minimum hissa jispe poora system trust karta hai
- Security models (Bell-LaPadula, Biba, Clark-Wilson)
- Common vulnerability types aur CVE database

### 2. [Authentication and Authorization](./02_auth_and_authz.md)
**Time**: 40-50 minutes

Yeh samjhega ki system tumhari identity kaise verify karta hai aur access kaise control hota hai — bilkul PhonePe login ki tarah, pehle "tum kaun ho" verify hota hai (authentication), phir "tum kya kar sakte ho" decide hota hai (authorization):
- Authentication vs authorization — "Who are you?" vs "What can you do?"
- Password-based authentication with hashing and salting
- Multi-factor authentication (2FA/MFA) — jaise net banking mein OTP + password dono
- Biometric aur public key authentication — fingerprint, Aadhaar-style biometrics
- Kerberos protocol
- PAM (Pluggable Authentication Modules)
- sudo aur privilege escalation
- Linux mein user aur group management
- Password policies aur security best practices

### 3. [Access Control Models](./03_access_control.md)
**Time**: 45-60 minutes

Resource access control karne ke alag-alag approaches — kaun kya kar sakta hai, is par deep dive:
- Discretionary Access Control (DAC): Unix permissions, chmod, chown
- Access Control Lists (ACLs): getfacl, setfacl
- Mandatory Access Control (MAC): security labels aur clearances — jaise government file system mein "confidential", "secret", "top secret" levels
- SELinux aur AppArmor overview
- Role-Based Access Control (RBAC) — Swiggy app mein "delivery partner", "restaurant owner", "customer support" — sabke alag roles aur permissions
- Capability-based security
- Access control matrices
- Principle of least privilege ka actual implementation

### 4. [Cryptography in Operating Systems](./04_cryptography.md)
**Time**: 40-50 minutes

Cryptography kaise data ko rest aur transit dono mein protect karti hai — jaise tumhara CRED app data ko encrypt karke store aur transmit karta hai:
- Symmetric encryption (AES) — disk encryption ke liye
- Asymmetric encryption (RSA) — secure communication ke liye
- Cryptographic hashing (SHA-256) — integrity check ke liye
- Full disk encryption: LUKS, BitLocker, FileVault
- File aur directory encryption: eCryptfs, EncFS
- Trusted Platform Module (TPM)
- Secure Boot process
- Encrypted swap aur network connections
- Key management strategies

### 5. [Common Vulnerabilities](./05_vulnerabilities.md)
**Time**: 45-60 minutes

Yahan tum seekhoge common security vulnerabilities aur unko kaise mitigate karte hain — production mein yeh mistakes hi companies ko crore-crore ka nuksaan karati hain:
- Buffer overflow aur stack smashing attacks
- Stack protection mechanisms: canaries, ASLR, DEP/NX
- Format string vulnerabilities
- Integer overflow aur use-after-free bugs
- Race conditions aur TOCTOU attacks
- Privilege escalation exploits
- Code injection aur shellcode
- Return-oriented programming (ROP)
- Rootkits aur unki detection
- Compiler-based protections

### 6. [Security Mechanisms](./06_security_mechanisms.md)
**Time**: 50-70 minutes

Modern security mechanisms mein deep dive — yeh woh tools hain jo actual production Linux systems (aur containers) ko secure banate hain:
- SELinux: Mandatory Access Control implementation
  - SELinux modes aur contexts
  - Type enforcement aur policies
  - Commands: getenforce, setenforce, semanage
- AppArmor: Path-based MAC
  - Profile modes aur management
  - Commands: aa-status, aa-enforce, aa-complain
- Seccomp (secure computing mode)
- Linux Security Modules (LSM) framework
- Namespace isolation
- cgroups for resource limiting
- Container security basics
- SELinux vs AppArmor comparison

> [!info]
> Agar tum Docker use karte ho, toh namespaces aur cgroups tumhare bahut kaam ke hain — yehi wo cheezein hain jo containers ko isolate karti hain. Ek container crash ho jaye toh doosre pe asar nahi padta, exactly jaise Zomato ke ek city ka server down ho jaye toh doosre city ka order flow nahi rukta.

## Learning Path

### Recommended Order

1. Shuru karo **Security Fundamentals** se — strong foundation banegi
2. Uske baad **Authentication and Authorization** — identity management samjhoge
3. Phir **Access Control Models** — resource protection strategies seekhoge
4. **Cryptography** explore karo — data protection samjhoge
5. **Common Vulnerabilities** seekho — security risks pehchanna aayega
6. Aakhir mein **Security Mechanisms** master karo — advanced protections implement karna seekhoge

### Alternative Paths

**Practical Security Path** (system administrators ke liye):
1. Security Fundamentals
2. Authentication and Authorization
3. Access Control Models
4. Security Mechanisms

**Security Research Path** (security professionals ke liye):
1. Security Fundamentals
2. Common Vulnerabilities
3. Cryptography
4. Security Mechanisms

## Hands-On Practice

Kyun zaruri hai hands-on practice? Kyunki security sirf theory padhne se nahi aati — jab tak khud buffer overflow trigger nahi karoge, ya khud SELinux policy break nahi karoge, real samajh nahi aayegi. Har tutorial mein milega:
- **Code Examples**: C programs aur bash scripts jo security concepts demonstrate karte hain
- **Exercises**: Beginner, intermediate, aur advanced challenges
- **Lab Activities**: Practical scenarios hands-on learning ke liye

### Recommended Lab Setup

- Linux virtual machine (Ubuntu 20.04+ ya CentOS 8+)
- Root ya sudo access testing ke liye
- Development tools: gcc, gdb, make
- SELinux ya AppArmor enabled system

> [!warning]
> Yeh sab experiments apne production machine pe mat karna — ek VM ya sandboxed environment use karo. Buffer overflow test karte waqt agar galti se real system pe kar diya, toh khud hi apna system crash kar doge.

## Additional Resources

### Books
- "The Art of Software Security Assessment" by Dowd, McDonald, and Schuh
- "Computer Security: Principles and Practice" by Stallings and Brown
- "SELinux System Administration" by Sven Vermeulen

### Online Resources
- [CVE Database](https://cve.mitre.org/)
- [OWASP Security Principles](https://owasp.org/)
- [SELinux Project](https://selinuxproject.org/)
- [AppArmor Documentation](https://gitlab.com/apparmor/apparmor/-/wikis/home)

### Tools
- `checksec` - Binary security properties check karne ke liye
- `lynis` - Security auditing tool
- `aide` - File integrity checker
- `fail2ban` - Intrusion prevention

## Key Concepts Overview

```
Security and Protection Hierarchy
=====================================

                    Security Goals (CIA)
                    /        |         \
        Confidentiality  Integrity  Availability
                    \        |         /
                      Security Policy
                            |
                  +---------+---------+
                  |                   |
            Authentication      Authorization
                  |                   |
            Who are you?        What can you do?
                  |                   |
            +---------+         +---------+
            |         |         |         |
        Password   Biometric  DAC      MAC
        2FA        PKI        RBAC     Capability
            |         |         |         |
            +--------------------+---------+
                        |
                  Access Control
                        |
            +-----------+-----------+
            |           |           |
        Files       Processes   Network
            |           |           |
        Encryption  Isolation   Filtering
```

Is diagram ko yaad rakhna — CIA triad top pe hai kyunki har security decision ka ultimate goal wahi teen cheezein protect karna hai. Neeche jo bhi mechanisms hain (authentication, access control, encryption) — sab is goal ko achieve karne ke tools hain, koi bhi apne aap mein "end goal" nahi hai.

## Assessment

Is module ko complete karne ke baad tumhe yeh sab aana chahiye:

- [ ] CIA triad aur core security principles explain karna
- [ ] Authentication mechanisms configure karna (passwords, SSH keys, 2FA)
- [ ] Sahi access control models apply karna (DAC, MAC, RBAC)
- [ ] Files aur disks ke liye encryption implement karna
- [ ] Common vulnerabilities identify aur mitigate karna
- [ ] SELinux ya AppArmor policies configure karna
- [ ] Security tools use karke systems audit aur harden karna
- [ ] Secure system architectures design karna

## Next Steps

Module complete karne ke baad:

1. **Practice**: Ek lab environment set up karo aur security configurations ke saath experiment karo
2. **Explore**: Interest ke topics mein deep dive karo (penetration testing, cryptography, waghera)
3. **Certifications**: Security certifications consider karo (CompTIA Security+, CEH, OSCP)
4. **Stay Updated**: Security advisories aur CVE announcements follow karo
5. **Contribute**: Security research ya bug bounty programs mein participate karo

## Navigation

- [← Back to Operating Systems](../)
- [Next Module: Virtualization →](../07_virtualization/)

---

**Apne systems secure karne ke liye ready ho?** Shuru karo [Security Fundamentals](./01_security_fundamentals.md) se!

## Key Takeaways

- Security ka core goal hamesha CIA triad hai — Confidentiality, Integrity, Availability. Har mechanism (encryption, access control, authentication) isi teen cheezon ko protect karne ke liye banaya gaya hai.
- Authentication ("tum kaun ho") aur authorization ("tum kya kar sakte ho") do alag concepts hain — dono ko mix mat karo.
- Access control models — DAC (owner decide karta hai), MAC (system-wide policy enforce hoti hai), RBAC (role ke hisaab se permissions) — har ek ka apna use case hai.
- Cryptography sirf "encryption" nahi hai — hashing (integrity ke liye), symmetric/asymmetric encryption (confidentiality ke liye), aur key management sab milke poora picture banate hain.
- Common vulnerabilities (buffer overflow, race conditions, privilege escalation) samajhna zaruri hai kyunki attackers inhi ke through system break karte hain — defense mechanisms (ASLR, canaries, DEP) inhi attacks se bachane ke liye bane hain.
- Modern container-based systems (Docker, Kubernetes) SELinux, AppArmor, namespaces, aur cgroups jaise mechanisms pe hi depend karte hain — yeh sirf legacy Linux admin ka kaam nahi, aaj ke cloud-native world mein bhi utna hi relevant hai.
- Least privilege aur defense in depth — do principles jo har security decision ke peeche hone chahiye: kisi ko bhi utna hi access do jitna zaruri hai, aur ek layer fail ho toh doosri layer bachaye.

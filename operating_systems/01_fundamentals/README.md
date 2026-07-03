# 01. Fundamentals

Chalo shuru karte hain Operating Systems ki journey — bilkul zero se. Yeh section woh foundation hai jispe poora OS ka gyaan tika hua hai. Agar tumne kabhi socha hai ki jab tum apna laptop on karte ho toh screen pe Windows/Mac/Linux ka logo aane se lekar VS Code khulne tak andar kya-kya ho raha hota hai — ya jab Node.js ka `fs.readFile()` call karte ho toh actually disk se data kaise aata hai — toh yeh section usi ka jawab hai.

Socho OS ko ek **building ka watchman + electricity board + traffic police** ki combined post samajh lo. Tumhare paas ek building hai (computer hardware — CPU, RAM, disk, network card), aur usme rehne wale tenants hain (apps — Chrome, Spotify, tumhara Node server). Watchman (OS) decide karta hai kaun kab lift use karega (CPU scheduling), kisko kitna storage milega (memory management), aur agar do tenants ek hi cheez maangein toh conflict kaise resolve hoga (resource management). Bina is watchman ke, sab apps aapas mein lad-lad ke system crash kar denge.

## Kyun zaruri hai yeh samajhna?

Tum Node.js/TypeScript dev ho — roz `npm install`, `docker run`, `kubectl apply`, ya production server pe `top` command chalate ho. Yeh sab cheezein OS ke concepts pe hi based hain:
- Jab Node.js "single-threaded but non-blocking" hota hai, uske peeche **system calls** aur **kernel mode/user mode** ka concept hai.
- Jab Docker container "lightweight" hota hai VM ke comparison mein, uske peeche **kernel architecture** ka role hai.
- Jab server "boot" hota hai cloud pe, uske peeche **boot process** hai.

Matlab, agar tum DevOps deep-dive karna chahte ho, toh yeh fundamentals skip nahi kar sakte — yeh woh base hai jispe Docker, Kubernetes, Linux internals, sab kuch khada hai.

## Topics Covered

1. **[Introduction to Operating Systems](./01_introduction_to_os.md)**
   - OS kya hota hai, bilkul basic se samjho
   - OS ki responsibilities aur services — yeh kya-kya kaam karta hai
   - History and evolution — punch cards se lekar cloud OS tak ka safar
   - Types of operating systems — ek overview

   > [!tip]
   > Isse aise socho: OS ek **translator + manager** hai jo tumhare high-level commands ("yeh file save karo") ko hardware-level instructions mein convert karta hai, aur saath mein resources manage bhi karta hai.

2. **[OS Architecture and Structure](./02_os_architecture.md)**
   - Monolithic vs microkernel architecture — dono designs ka trade-off
   - Layered approach — jaise onion ki layers
   - Hybrid systems — best of both worlds try karna
   - Operating system components — kaunse parts milke OS banate hain

   > [!info]
   > Yeh samjho jaise **Swiggy ka backend architecture** — ek monolithic app sab kuch ek jagah handle karta hai (fast but fragile), jabki microservices (microkernel jaisa) alag-alag chhote services mein tod deta hai (flexible but thoda slow due to communication overhead).

3. **[System Calls and APIs](./03_system_calls.md)**
   - System calls kya hote hain — app aur OS ke beech ka pul
   - Types of system calls — file, process, communication, etc.
   - User mode vs kernel mode — security ka fundamental concept
   - System call implementation — actually kaam kaise karta hai

   > [!warning]
   > Yeh topic bahut important hai practical developers ke liye — jab bhi tum `read()`, `write()`, `fork()` jaisa kuch use karte ho (chahe indirectly Node.js ke through), tum system call hi trigger kar rahe ho.

4. **[Operating System Types](./04_os_types.md)**
   - Batch, time-sharing, real-time OS — history se lekar aaj tak
   - Distributed and network OS — multiple machines mil ke kaam karte hain
   - Mobile and embedded OS — Android, IoT devices
   - Cloud and virtualized OS — AWS/GCP ke peeche kya chal raha hai

5. **[Kernel Architecture](./05_kernel_architecture.md)**
   - Monolithic kernel — sab kuch ek hi jagah (Linux jaisa)
   - Microkernel — sirf zaruri cheezein kernel mein, baaki bahar
   - Hybrid kernel — Windows jaisa mixed approach
   - Exokernel and unikernel — modern, specialized designs

6. **[Boot Process and System Initialization](./06_boot_process.md)**
   - BIOS/UEFI — power button dabate hi kya hota hai
   - Bootloader (GRUB) — OS ko load karne wala pehla software
   - Kernel loading — actual OS memory mein aata hai
   - Init system (systemd, SysV) — pehla process jo start hota hai

   > [!tip]
   > Yeh samjho jaise **IRCTC ki train chalne se pehle ka process** — station master check karta hai (BIOS/UEFI hardware check), phir signal milta hai (bootloader), engine start hoti hai (kernel load), aur phir har coach ka staff apna kaam shuru karta hai (init system services start karta hai).

## Kya seekhoge is section mein? (Learning Objectives)

Is section ke end tak, tumhe yeh sab clear ho jayega:

- Operating system ka role aur purpose kya hai — yeh sirf ek "software" nahi hai, balki hardware aur software ke beech ka **critical middleman** hai
- Different OS architectures (monolithic, microkernel, layered, hybrid) aur unke trade-offs — kab kaunsa design better hai
- Applications OS se **system calls** ke through kaise baat karte hain — tumhara code directly hardware touch nahi karta, sab OS ke through hi hota hai
- Different types of operating systems classify kar paoge — batch, real-time, distributed, mobile, cloud
- Kernel designs aur unki implementations samajh aa jayengi — yeh knowledge Docker/Kubernetes samajhne mein bahut kaam aayegi
- Boot process ko trace kar paoge — power-on se lekar login screen tak ka poora safar

## Prerequisites (Yeh pehle se aana chahiye)

- Basic programming knowledge (C ya Python) — thoda C ka syntax pata ho toh kernel-level examples samajhna easy ho jayega
- Computer hardware components ki understanding — CPU, RAM, disk, motherboard jaise basic terms se familiarity
- Command line se familiarity — terminal pe basic commands chalane aata ho

> [!info]
> Tension mat lo agar C weak hai — jahan bhi zaroori hoga, code examples ke saath explanation Hinglish mein di jayegi. Focus concept samajhne pe rakhna hai, syntax memorize karne pe nahi.

## Estimated Time

**3-4 ghante** lagenge is poore section ke saare tutorials complete karne mein. Ek baithak mein sab mat karo — har topic ke baad thoda break lo aur jo padha usko apne dimaag mein kisi real-world example (jaise Docker, Node.js internals) se connect karne ki koshish karo. Isse retention bahut better hoga.

---

## Key Takeaways

- Operating System hardware aur software ke beech ka **manager + translator** hai — bina OS ke, apps directly hardware se baat nahi kar sakte
- Is section mein 6 topics cover honge: OS introduction, architecture, system calls, OS types, kernel architecture, aur boot process
- Yeh fundamentals sirf theory nahi hain — Docker, Kubernetes, Node.js internals, sab in hi concepts pe based hain, isliye DevOps journey ke liye yeh base zaruri hai
- Sequence mein padhna best rahega (01 se 06 tak) kyunki har topic pichle topic pe build karta hai
- 3-4 ghante ka time lagega, lekin jaldi mat karo — samajh ke aage badho, rata mat lagao

---

[Next: Introduction to Operating Systems →](./01_introduction_to_os.md)

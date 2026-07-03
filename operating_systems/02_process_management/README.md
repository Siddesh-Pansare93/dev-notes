# Process Management

Chalo seedhi baat karte hain — **Process Management** operating system ka dil hai. Jab bhi tum apna laptop kholte ho aur Chrome, VS Code, Spotify, aur ek terminal ek saath chala rahe ho, background mein OS ek pura circus manage kar raha hota hai. Kaunsa program kab CPU pe chalega, kaunsa wait karega, do programs aapas mein data kaise share karenge, aur agar do processes ek dusre ko block kar dein toh kya hoga — yeh sab kuch is section mein cover hota hai.

Socho ek Swiggy delivery hub ki tarah. Ek hi time pe dus orders aaye hain, par delivery boys limited hain (jaise CPU cores limited hain). Hub manager (scheduler) decide karta hai kis order ko pehle nikalna hai, kaunsa delivery boy free hai, aur agar do orders same restaurant se ek hi time pe pick karne hain toh conflict kaise avoid karna hai. Process management bilkul yehi karta hai — bas orders ki jagah "processes" hain aur delivery boys ki jagah "CPU" hai.

Yeh topic thoda heavy lagega shuru mein, lekin agar tum backend developer ho (Node.js, Java, whatever), toh yeh samajhna zaruri hai — kyunki jab tumhara server "slow" hota hai, ya ek process hang ho jata hai, ya do threads ek resource ke liye ladte hain — yeh sab wahi concepts hain jo yahan seekhoge.

## Kya Kya Seekhoge Is Section Mein?

- OS processes aur threads ko internally kaise represent aur manage karta hai
- Ek process ka poora lifecycle — birth se death tak (creation se termination tak)
- CPU scheduling algorithms — kaunsa process pehle chalega, aur kyun
- Context switch ke time asal mein hota kya hai (jab CPU ek process se doosre pe switch karta hai)
- Processes aapas mein baat kaise karte hain (Inter-Process Communication / IPC)
- Deadlocks kaise hote hain aur unhe handle karne ki strategies
- Synchronization primitives — shared resources ko safely protect karne ke tareeke

> [!tip]
> Agar tumne kabhi socha hai "mera Node.js server single-threaded hai phir bhi multiple requests kaise handle karta hai" ya "database mein race condition kya hoti hai" — in sab sawalon ki jadd yahi concepts hain. Isliye thoda time do is section ko, seedha real-world coding mein kaam aayega.

## Is Section Ke Tutorials

| # | Tutorial | Kya Cover Hota Hai | Estimated Time |
|---|----------|-------------|-----------|
| 1 | [Processes and Threads](./01_processes_and_threads.md) | Process ke fundamentals, PCB structure, threads, thread models, pthreads basics | 45 min |
| 2 | [Process Lifecycle](./02_process_lifecycle.md) | fork(), exec(), process creation/termination, zombies, orphans, COW (Copy-on-Write) | 50 min |
| 3 | [CPU Scheduling](./03_cpu_scheduling.md) | FCFS, SJF, SRTF, Priority, Round Robin, Multilevel Queues, CFS | 60 min |
| 4 | [Context Switching](./04_context_switching.md) | Context switch ki mechanics, overhead, PCB ka role, monitoring tools | 35 min |
| 5 | [Inter-Process Communication](./05_ipc.md) | Shared memory, message passing, pipes, sockets, signals, mmap | 55 min |
| 6 | [Deadlocks](./06_deadlocks.md) | Coffman conditions, RAG, Banker's algorithm, detection, recovery | 50 min |
| 7 | [Synchronization and Locks](./07_synchronization.md) | Race conditions, mutexes, semaphores, monitors, classic problems | 55 min |

**Total estimated time: 5-6 ghante**

## Shuru Karne Se Pehle (Prerequisites)

Is section mein ghusne se pehle tumhe yeh cheezein comfortable honi chahiye:

- Basic C programming (pointers, structs, function calls) — kyunki OS concepts ke examples zyadatar C mein hote hain
- Linux/Unix command line ka basic use — `ls`, `ps`, `cd` jaisi commands se dosti honi chahiye
- General idea ki operating system karta kya hai (agar tumne pichla section 01 - Introduction padha hai, toh tum ready ho)

## Learning Path — Kaunsa Topic Pehle Padhein

```
┌─────────────────────────┐
│  01 Processes & Threads  │  ← Yahan se shuru karo: foundational concepts
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│   02 Process Lifecycle   │  ← Process kaise paida hote hain aur kaise marte hain
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│    03 CPU Scheduling     │  ← OS kaise decide karta hai agla number kiska hai
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│   04 Context Switching   │  ← Processes switch karne ki mechanics
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│       05 IPC             │  ← Processes aapas mein baat kaise karte hain
└────────────┬────────────┘
             │
        ┌────┴────┐
        v         v
┌────────────┐ ┌──────────────┐
│06 Deadlocks│ │07 Synchroniz.│  ← Concurrency ke hazards aur unke solutions
└────────────┘ └──────────────┘
```

Tutorials 1-4 ek dusre pe based hain, isliye sequence mein hi padhna. Tutorial 5 (IPC) ko tum 1-2 complete karne ke baad independently bhi padh sakte ho. Tutorials 6 aur 7 aapas mein bahut close hain (dono concurrency issues se related hain) — inhe kisi bhi order mein padh sakte ho, bas dono ke liye 1-2 ka fundamental clear hona chahiye.

> [!info]
> Isko highway ki tarah socho — pehle 4 exits sequential hain (ek ke baad ek), lekin exit 5 (IPC) ek side route hai jo tum thoda jaldi bhi le sakte ho. Exit 6 aur 7 dono destination hain jahan "traffic jam" (concurrency problems) hota hai.

## Key Concepts Map

```
Process Management
├── Process Abstraction
│   ├── Process vs Program
│   ├── Process Control Block (PCB)
│   ├── Process States
│   └── Threads (user-level, kernel-level)
├── Lifecycle
│   ├── Creation (fork, exec)
│   ├── Execution
│   └── Termination (exit, signals)
├── Scheduling
│   ├── Non-preemptive (FCFS, SJF)
│   ├── Preemptive (SRTF, RR, Priority)
│   └── Advanced (MLQ, MLFQ, CFS)
├── Context Switching
│   ├── State save/restore
│   └── Overhead considerations
├── Communication (IPC)
│   ├── Shared Memory
│   ├── Message Passing
│   ├── Pipes & Sockets
│   └── Signals
├── Deadlocks
│   ├── Prevention
│   ├── Avoidance (Banker's)
│   ├── Detection
│   └── Recovery
└── Synchronization
    ├── Mutual Exclusion
    ├── Semaphores
    ├── Monitors
    └── Classic Problems
```

Yeh diagram poore section ka mental model hai. Jab bhi confuse ho ki "main abhi kis concept mein hoon aur yeh bade picture mein kahan fit hota hai" — wapis yahan aa jao.

## Tools Jo Tum Use Karoge

Yeh sirf theory nahi hai — tumhe apne hi Linux machine (ya WSL) pe yeh commands chala ke dekhna hai ki OS asal mein kya kar raha hai:

| Tool | Kaam |
|------|---------|
| `gcc` | C code examples compile karne ke liye |
| `ps`, `top`, `htop` | Chal rahe processes ko inspect karne ke liye |
| `pstree` | Process hierarchy (parent-child tree) dekhne ke liye |
| `strace` | System calls trace karne ke liye — dekho process kernel se kya maang raha hai |
| `vmstat` | Context switches monitor karne ke liye |
| `ipcs` | IPC resources (shared memory, semaphores, message queues) inspect karne ke liye |
| `/proc` filesystem | Kernel se seedha process ki details padhne ke liye |

> [!tip]
> `ps aux` aur `top` chalake dekho apne system pe kitne processes zombie state mein pade hain ya kaunsa process sabse zyada CPU kha raha hai. Theory tab tak nahi chipakti jab tak tum apni aankhon se nahi dekhte.

## Tutorials Ko Kaise Use Karein

1. **Concepts pehle padho** — "why" samjho phir "how" mein jao. Bina reason samjhe formula ratna Zomato ke menu ko bina taste kiye order karne jaisa hai.
2. **Diagrams study karo** — abstract ideas (jaise process state transitions) diagram dekhe bina samajhna mushkil hai
3. **Code khud run karo** — har C example ko khud compile aur execute karo, sirf padh ke mat chhodo
4. **Experiment karo** — examples mein chhed-chhaad karo, alag-alag behavior observe karo (jaise scheduling algorithm ke parameters badal ke dekho)
5. **Exercises zaroor karo** — teen difficulty levels pe hote hain, samajh ko pakka karne ke liye

> [!warning]
> Sirf padh ke aage badh jaana sabse badi galti hai jo log OS seekhte waqt karte hain. `fork()` ke baare mein padhna aur `fork()` ko khud C mein chalake output dekhna — dono alag experiences hain. Doosra wala hi cheezein yaad rehti hain.

## Navigation

- **Previous section**: [01 - Introduction to Operating Systems](../01_introduction/)
- **Next section**: [03 - Memory Management](../03_memory_management/)
- **Back to course root**: [Operating Systems](../README.md)

## Key Takeaways

- Process management OS ka core hai — yeh decide karta hai kaunsa program kab CPU pe chalega, kaise create/destroy hota hai, aur processes aapas mein kaise coordinate karte hain
- Is section ke 7 tutorials sequential building blocks hain — pehle 4 (Processes & Threads → Lifecycle → Scheduling → Context Switching) ek dusre pe depend karte hain
- IPC (tutorial 5) independent topic hai jo tum jaldi bhi explore kar sakte ho
- Deadlocks aur Synchronization (6 aur 7) dono concurrency ke real-world hazards hain — inhe samajhna production bugs debug karne ke liye zaruri hai
- Theory se zyada hands-on practice zaruri hai — `gcc`, `strace`, `ps`, `/proc` jaise tools se khud experiment karo
- Total time investment 5-6 ghante hai, lekin yeh foundation hai jo baaki poori OS journey (memory management, file systems, etc.) ko support karega

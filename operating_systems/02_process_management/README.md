# Process Management

Process management is the heart of any operating system. It governs how programs are executed, how CPU time is allocated, how processes communicate, and how shared resources are coordinated safely. Mastering these concepts is essential for systems programming, performance tuning, and understanding how modern operating systems work under the hood.

## What You'll Learn

- How processes and threads are represented and managed by the OS
- The complete lifecycle of a process from creation to termination
- CPU scheduling algorithms and their trade-offs
- What happens during a context switch
- Mechanisms for inter-process communication (IPC)
- How deadlocks occur and strategies to handle them
- Synchronization primitives that protect shared resources

## Tutorials in This Section

| # | Tutorial | Description | Est. Time |
|---|----------|-------------|-----------|
| 1 | [Processes and Threads](./01_processes_and_threads.md) | Process fundamentals, PCB structure, threads, thread models, pthreads basics | 45 min |
| 2 | [Process Lifecycle](./02_process_lifecycle.md) | fork(), exec(), process creation/termination, zombies, orphans, COW | 50 min |
| 3 | [CPU Scheduling](./03_cpu_scheduling.md) | FCFS, SJF, SRTF, Priority, Round Robin, Multilevel Queues, CFS | 60 min |
| 4 | [Context Switching](./04_context_switching.md) | Context switch mechanics, overhead, PCB role, monitoring tools | 35 min |
| 5 | [Inter-Process Communication](./05_ipc.md) | Shared memory, message passing, pipes, sockets, signals, mmap | 55 min |
| 6 | [Deadlocks](./06_deadlocks.md) | Coffman conditions, RAG, Banker's algorithm, detection, recovery | 50 min |
| 7 | [Synchronization and Locks](./07_synchronization.md) | Race conditions, mutexes, semaphores, monitors, classic problems | 55 min |

**Total estimated time: 5-6 hours**

## Prerequisites

Before starting this section, you should be comfortable with:

- Basic C programming (pointers, structs, function calls)
- Linux/Unix command line basics
- General understanding of what an operating system does

## Learning Path

```
┌─────────────────────────┐
│  01 Processes & Threads  │  ← Start here: foundational concepts
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│   02 Process Lifecycle   │  ← How processes are born and die
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│    03 CPU Scheduling     │  ← How the OS decides who runs next
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│   04 Context Switching   │  ← The mechanics of switching processes
└────────────┬────────────┘
             │
             v
┌─────────────────────────┐
│       05 IPC             │  ← How processes talk to each other
└────────────┬────────────┘
             │
        ┌────┴────┐
        v         v
┌────────────┐ ┌──────────────┐
│06 Deadlocks│ │07 Synchroniz.│  ← Concurrency hazards & solutions
└────────────┘ └──────────────┘
```

Tutorials 1-4 build on each other sequentially. Tutorial 5 (IPC) can be studied independently after completing 1-2. Tutorials 6 and 7 are closely related and can be studied in either order, but both assume familiarity with 1-2.

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

## Tools You'll Use

| Tool | Purpose |
|------|---------|
| `gcc` | Compile C code examples |
| `ps`, `top`, `htop` | Inspect running processes |
| `pstree` | View process hierarchy |
| `strace` | Trace system calls |
| `vmstat` | Monitor context switches |
| `ipcs` | Inspect IPC resources |
| `/proc` filesystem | Read process details from the kernel |

## How to Use These Tutorials

1. **Read the concepts** -- understand the "why" before the "how"
2. **Study the diagrams** -- visual models make abstract ideas concrete
3. **Run the code** -- compile and execute every C example yourself
4. **Experiment** -- modify examples, observe different behaviors
5. **Do the exercises** -- they reinforce understanding at three difficulty levels

## Navigation

- **Previous section**: [01 - Introduction to Operating Systems](../01_introduction/)
- **Next section**: [03 - Memory Management](../03_memory_management/)
- **Back to course root**: [Operating Systems](../README.md)

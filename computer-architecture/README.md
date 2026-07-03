# Computer Organization & Architecture

Ek computer ke andar jaake dekhna — CPU kaise sochta hai, RAM kaise data rakhta hai, disk pe cheezein kaise store hoti hain, aur jab tum ek button dabate ho toh electricity se lekar screen pe result aane tak kya hota hai. Yeh guide bilkul zero se shuru hoti hai aur end tak tumhe pura internal picture de deti hai — kisi bhi computer science engineer ko yeh cheezein pata honi chahiye, chahe woh backend developer ho, mobile dev ho, ya DevOps engineer.

## Table of Contents

### Part 1: Fundamentals
1. [Introduction to Computers & Computer Architecture](./01-introduction-to-computers/README.md)
2. [Number Systems & Data Representation](./02-number-systems-and-data-representation/README.md)
3. [Boolean Algebra & Logic Gates](./03-boolean-algebra-and-logic-gates/README.md)
4. [Digital Circuits — Adders, Flip-Flops, Registers](./04-digital-circuits/README.md)

### Part 2: The CPU
5. [CPU Architecture Overview](./05-cpu-architecture-overview/README.md)
6. [Instruction Set Architecture (RISC vs CISC)](./06-instruction-set-architecture/README.md)
7. [Instruction Cycle — Fetch, Decode, Execute](./07-instruction-cycle/README.md)
8. [Addressing Modes](./08-addressing-modes/README.md)
9. [Pipelining & Instruction-Level Parallelism](./09-pipelining-and-ilp/README.md)

### Part 3: Going Parallel
10. [Multicore & Parallel Processing](./10-multicore-and-parallel-processing/README.md)
11. [GPU Architecture Basics](./11-gpu-architecture-basics/README.md)

### Part 4: Memory
12. [Memory Hierarchy](./12-memory-hierarchy/README.md)
13. [Cache Memory](./13-cache-memory/README.md)
14. [RAM Types & Technology](./14-ram-types-and-technology/README.md)
15. [ROM, Firmware & BIOS/UEFI](./15-rom-firmware-bios-uefi/README.md)

### Part 5: Storage, Motherboard & I/O
16. [Secondary Storage — HDD & SSD Internals](./16-secondary-storage-hdd-ssd/README.md)
17. [Motherboard & Chipset](./17-motherboard-and-chipset/README.md)
18. [Buses & Interconnects](./18-buses-and-interconnects/README.md)
19. [I/O Systems, Interrupts & DMA](./19-io-systems-interrupts-dma/README.md)

### Part 6: Putting It All Together
20. [Booting Process — What Happens When You Press Power](./20-booting-process/README.md)
21. [How a Program Actually Runs — End to End](./21-how-a-program-runs-end-to-end/README.md)

## Learning Path

### Beginner Track
1. Introduction to Computers (01)
2. Number Systems & Data Representation (02)
3. Boolean Algebra & Logic Gates (03)
4. CPU Architecture Overview (05)
5. Memory Hierarchy (12)

### Intermediate Track
1. Digital Circuits (04)
2. Instruction Set Architecture (06)
3. Instruction Cycle (07)
4. Cache Memory (13)
5. RAM Types (14)
6. Secondary Storage (16)

### Advanced Track
1. Addressing Modes (08)
2. Pipelining & ILP (09)
3. Multicore & Parallel Processing (10)
4. GPU Architecture (11)
5. Motherboard & Chipset (17)
6. Buses & Interconnects (18)
7. I/O, Interrupts & DMA (19)
8. Booting Process (20)
9. How a Program Runs End to End (21)

## What You'll Learn

- Binary, hex, octal number systems aur computer data ko kaise represent karta hai (integers, floats, text)
- Boolean logic aur logic gates se lekar actual digital circuits (adders, flip-flops, registers) tak
- CPU ke andar kya hota hai — ALU, Control Unit, registers, aur instruction cycle
- RISC vs CISC, addressing modes, pipelining — modern CPUs itni fast kaise chalte hain
- Multicore processors aur GPUs parallel kaam kaise karte hain
- Memory hierarchy — registers se lekar cache, RAM, aur disk tak — aur speed vs cost ka trade-off
- Cache memory kaise kaam karta hai aur CPU ko fast kyun banata hai
- HDD aur SSD ke andar ka mechanism, aur woh data kaise store/retrieve karte hain
- Motherboard, chipset, aur buses kaise sab components ko connect karte hain
- Interrupts aur DMA se I/O devices CPU ke saath kaise communicate karte hain
- Power button dabane se lekar OS load hone tak — poora boot process
- Ek program likhne se lekar CPU pe actually execute hone tak ka pura safar

## Prerequisites

- Koi bhi programming language ka basic knowledge helpful hai but zaruri nahi
- Curiosity ki computer ke andar actually hota kya hai — bas itna kaafi hai

## How to Use This Guide

1. **Order follow karo**: Yeh topics ek dusre pe build hote hain — number systems aur logic gates samajhe bina CPU architecture samajhna mushkil hoga.
2. **Diagrams khud banao**: Jab bhi CPU datapath ya memory hierarchy padho, ek chhota diagram khud draw karo — yeh cheezein visual hain.
3. **Real hardware se connect karo**: Apna laptop/PC ka Task Manager ya `htop` khol ke dekho — cores, RAM usage, cache size — jo padh rahe ho woh real machine mein dikhता hai.
4. **Last chapter zaroor padhna**: Chapter 21 sab kuch ek saath jodta hai — agar sirf ek chapter time ho toh woh padhna.

Chalo shuru karte hain — computer ke andar ka safar!

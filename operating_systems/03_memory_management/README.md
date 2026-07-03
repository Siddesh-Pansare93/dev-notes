# Memory Management

Chalo, Memory Management section mein tumhara swagat hai! Ye section thoda meaty hai — isme hum dekhenge ki operating system computer ki memory (RAM) ko kaise manage karta hai, hardware level ke concepts se lekar advanced software techniques tak. Socho memory ko ek shared PG (paying guest) building ki tarah — jisme bahut saare tenants (processes) rehte hain, aur landlord (OS) ko decide karna hota hai kisko kaunsa room milega, kisko evict karna hai jab room khali chahiye, aur kaise ek tenant doosre tenant ke room mein ghus na jaaye.

## Overview

Memory management OS ki sabse critical responsibilities mein se ek hai. Isme ye sab aata hai:
- Computer ki primary memory (RAM) ko manage karna
- Efficient allocation aur deallocation karna (jab process ko memory chahiye, do; jab kaam khatam, wapas le lo)
- Processes ke beech isolation dena (ek process doosre process ki memory mein taak-jhaank na kar paaye — jaise tumhare Swiggy order ka data kisi aur customer ko dikh na jaaye)
- Virtual memory ke through "unlimited memory" ka illusion create karna (jaise CRED tumhe unlimited rewards dikhata hai but backend mein sab limited hai)

Agar memory management na ho, toh imagine karo — Chrome ke 50 tabs khole ho, Spotify chal raha hai, VS Code open hai — sab processes bina kisi restriction ke RAM mein ghuslenge, ek doosre ka data overwrite kar denge, aur system crash ho jayega. Memory manager hi hai jo is chaos ko control mein rakhta hai — bilkul waise jaise IRCTC ka seat allocation system har passenger ko apna berth deta hai, koi doosre ke berth pe nahi baith sakta (TT check karta hai — that's your protection mechanism).

**Estimated Time**: 5-6 hours

## Tum Kya Seekhoge

- Memory hierarchy aur cache organization — CPU se disk tak ka safar
- Address spaces aur address translation — logical address kaise physical address banta hai
- Paging aur segmentation mechanisms — memory ko chunks mein baantne ke tareeke
- Virtual memory aur demand paging — kaise OS "zyada memory hai" ka jhoot bolta hai (ek acche jhoot ki tarah!)
- Page replacement algorithms — jab RAM full ho jaaye toh kisko evict karein
- Memory allocation strategies — kernel se lekar user-space heap tak
- Garbage collection techniques — jab language khud hi cleanup kar deti hai

## Prerequisites

Isse aage badhne se pehle, ye cheezein pata honi chahiye:
- Computer architecture ki basic samajh
- C programming se familiarity (kyunki low-level examples C mein honge)
- Process concepts ka knowledge (agar tumne pichhla process management section padha hai toh ready ho)
- Data structures ki understanding (linked lists, trees — page tables trees jaise hi structure follow karte hain)

## Tutorials

### [01. Memory Hierarchy](./01_memory_hierarchy.md)
**Duration**: 45 minutes

Ye pehla stop hai — memory hierarchy pyramid explore karenge, registers se lekar disk storage tak. Socho ye ek priority-based storage system hai — jaise tumhare ghar mein sabse zaruri cheez tumhare pocket mein (fastest access), thodi kam zaruri cheez almirah mein (medium access), aur baaki saaman store room mein (slowest access, but sabse zyada capacity). CPU cache bhi bilkul waise kaam karta hai.

**Topics Covered**:
- Memory hierarchy levels (registers, cache, RAM, disk)
- Access times aur cost trade-offs (jitna fast, utna mehenga aur chhota)
- L1, L2, L3 cache organization
- Cache hits, misses, aur hit ratios
- Cache mapping techniques
- Temporal aur spatial locality (jo abhi use kiya wo phir use hoga; jo pass mein hai wo bhi use hoga)
- Memory wall problem (CPU speed badhi, memory speed utni nahi badhi — gap badhta gaya)

### [02. Address Spaces](./02_address_spaces.md)
**Duration**: 40 minutes

Yahan samjhenge logical aur physical address ka fark, aur Memory Management Unit (MMU) kaise inke beech translate karta hai. Isko aise socho — jab tum Swiggy pe order karte ho, tum "Flat 302, ABC Apartments" (logical address) type karte ho, lekin delivery boy ke GPS mein actual lat-long coordinates (physical address) translate hote hain. MMU wahi GPS translator hai.

**Topics Covered**:
- Logical vs physical address spaces
- Address binding stages (compile time, load time, run time)
- Memory Management Unit (MMU)
- Base aur limit registers
- Dynamic relocation
- Process memory layout (stack, heap, code, data segments)
- `/proc` ke through memory maps dekhna

### [03. Paging and Segmentation](./03_paging_segmentation.md)
**Duration**: 50 minutes

Do fundamental memory management schemes seekhenge: paging aur segmentation — aur ye kaise memory allocation ki problems solve karte hain. Paging ko socho jaise Ola/Uber ke fixed-size parking slots — har gaadi (process) chhote-chhote fixed slots (pages) mein fit hoti hai, chahe gaadi badi ho ya chhoti, use utne hi slots milte hain jitni zaroorat hai.

**Topics Covered**:
- Contiguous allocation ki problems (ek continuous block dhoondhna mushkil hota hai)
- Paging mechanism aur page tables
- Translation Lookaside Buffer (TLB) — page table lookup ka fast cache
- Multi-level paging
- Segmentation concepts
- Segmentation vs paging
- Internal aur external fragmentation

### [04. Virtual Memory](./04_virtual_memory.md)
**Duration**: 45 minutes

Discover karenge ki OS kaise "unlimited memory" ka illusion create karta hai virtual memory aur demand paging ke through. Bilkul CRED ya Paytm ki credit line ki tarah — tumhe lagta hai unlimited limit hai, lekin backend mein real balance limited hai, aur zaroorat padne pe hi actual resource (page) load hota hai.

**Topics Covered**:
- Virtual memory concepts
- Demand paging (page tabhi load hoga jab use hogi, na ki pehle se)
- Page fault handling
- Thrashing aur uski prevention (jab system apna zyada time page swap karne mein hi laga de)
- Working set model
- Copy-on-Write (COW) — jab tak koi modify na kare, share karo; modify ho toh copy banao
- Swap space management
- Memory monitoring tools

### [05. Page Replacement Algorithms](./05_page_replacement.md)
**Duration**: 50 minutes

Jab RAM full ho jaaye aur naye page ke liye jagah chahiye, toh kaunsa purana page evict karein? Ye bilkul waise hai jaise ek chhoti OYO room mein naya guest aane pe reception ko decide karna padta hai kaunsa purana guest checkout karega. Alag-alag algorithms alag strategies use karte hain.

**Topics Covered**:
- FIFO (First In First Out) — sabse purana wala pehle bahar
- Optimal page replacement — theoretical best case
- LRU (Least Recently Used) — jo sabse zyada der se use nahi hua
- LRU approximation algorithms
- Clock aur second chance algorithms
- Belady's anomaly — jab zyada frames dene se bhi performance kharab ho jaaye (counter-intuitive!)
- Algorithm performance compare karna

### [06. Memory Allocation Strategies](./06_memory_allocation.md)
**Duration**: 45 minutes

Strategies dekhenge memory allocate karne ki — kernel-level allocation se lekar user-space heap management tak. Jaise BigBasket warehouse mein saaman ko efficiently store karne ke different tareeke hote hain — kahin fixed racks, kahin dynamic space allocation.

**Topics Covered**:
- Fixed vs dynamic partitioning
- First Fit, Best Fit, Worst Fit
- Buddy system algorithm
- Slab allocation
- `malloc()` aur `free()` ke internals
- Memory fragmentation
- Memory leak detection

### [07. Garbage Collection](./07_garbage_collection.md)
**Duration**: 50 minutes

Automatic memory management techniques seekhenge jo modern programming languages (Java, JavaScript, Python) use karti hain. Ye bilkul waise hai jaise ghar mein ek automatic cleaning robot ho jo khud detect kar le ki kaunsa saaman ab use nahi ho raha aur use hata de — tumhe manually "free()" call karne ki zaroorat nahi.

**Topics Covered**:
- Manual vs automatic memory management
- Reference counting
- Mark and Sweep algorithm
- Copying collectors
- Generational garbage collection
- GC performance tuning
- Language-specific implementations

## Learning Path

Ye raha step-by-step roadmap — is order mein hi padhna, kyunki har topic pichhle wale ke upar build hota hai:

```
┌─────────────────────────┐
│  Memory Hierarchy       │
│  (Hardware Foundation)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Address Spaces         │
│  (Logical vs Physical)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Paging & Segmentation  │
│  (Memory Organization)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Virtual Memory         │
│  (Demand Paging)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Page Replacement       │
│  (Eviction Policies)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Memory Allocation      │
│  (Allocation Strategies)│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Garbage Collection     │
│  (Automatic Management) │
└─────────────────────────┘
```

## Recommended Study Approach

1. **Sequential Learning**: Tutorials ko order mein follow karo, kyunki har concept pichhle pe based hai
2. **Hands-on Practice**: Saare code examples aur commands apne system pe khud run karo — sirf padhna kaafi nahi
3. **Visualization**: Address translation aur paging samajhne ke liye khud diagrams banao — haath se draw karoge toh concept dimaag mein baith jayega
4. **Experiments**: Examples mein parameters change karke dekho ki behavior kaise badalta hai
5. **Exercises**: Har difficulty level ke exercises complete karo
6. **Real-world Tools**: System monitoring tools (`vmstat`, `free`, `valgrind`) ke saath practice karo — production debugging mein yehi kaam aayenge

## Key Concepts Summary — Ek Nazar Mein

| Concept | Kya Karta Hai | Kya Fayda Hai |
|---------|---------|-------------|
| **Cache Memory** | CPU aur RAM ke beech fast memory | Average memory access time kam karta hai |
| **Virtual Memory** | Unlimited memory ka illusion | RAM se bade programs bhi chala sakte ho |
| **Paging** | Fixed-size memory blocks | External fragmentation khatam karta hai |
| **Segmentation** | Logical memory division | Program ki structure ke saath match karta hai |
| **TLB** | Page table ke liye cache | Address translation fast karta hai |
| **Page Replacement** | Memory full hone pe pages evict karna | Limited physical memory manage karta hai |
| **Garbage Collection** | Automatic memory reclamation | Memory leaks se bachata hai |

## Modern Systems Mein Memory Management

### Linux Memory Management
- Demand paging use karta hai page replacement ke saath
- Anonymous pages (heap, stack) aur file-backed pages dono support karta hai
- Alag-alag page replacement policies implement karta hai (LRU variants)
- Huge pages support karta hai better performance ke liye
- Kernel memory ke liye slab allocator use karta hai

### Windows Memory Management
- Virtual Memory Manager paging handle karta hai
- Har process ka apna working set manager hota hai
- Modified page writer dirty pages ke liye
- Large pages support karta hai
- Inactive pages ke liye memory compression

### macOS Memory Management
- Mach VM system pe based hai
- Swap karne se pehle compressed memory use karta hai
- Application memory vs wired memory ka distinction
- File-backed aur anonymous memory dono support
- Memory pressure notification system (jab memory kam pad rahi ho toh apps ko warn karta hai)

> [!tip]
> Teeno OS ka core idea same hai — demand paging + page replacement — bas implementation details alag hain. Interview mein ye concept clearly bata paoge toh depth show hoti hai.

## Tools and Commands

Ye commands roz-roz kaam aayenge jab tum real systems pe memory debug karoge:

```bash
# Memory usage dekhne ke liye
free -h

# Memory statistics monitor karne ke liye
vmstat 1

# Process ka memory map dekhne ke liye
cat /proc/[PID]/maps

# Swap usage check karne ke liye
swapon --show

# Cache information dekhne ke liye
lscpu | grep -i cache

# Memory profiling
valgrind --leak-check=full ./program

# System memory info
cat /proc/meminfo
```

## Common Memory Issues — Jo Sabko Kabhi Na Kabhi Face Karne Padte Hain

1. **Memory Leaks**: Allocate ki hui memory kabhi free nahi hoti — jaise gas connection le liya lekin cancel karna bhool gaye, bill aata rehta hai
2. **Fragmentation**: Free memory chhote-chhote unusable pieces mein bikhri hoti hai
3. **Thrashing**: Excessive paging activity — system apna zyada time page swap karne mein hi laga deta hai, actual kaam kam hota hai
4. **Stack Overflow**: Stack apni allocated space se aage badh jaata hai (deep ya infinite recursion se)
5. **Heap Corruption**: Allocated memory se aage likhna (buffer overflow type bugs)
6. **Dangling Pointers**: Free ki hui memory ko use karna — jaise kisi ke ghar khaali karne ke baad bhi uska purana address use karke chitthi bhejna

> [!warning]
> Ye sab issues C/C++ jaisi manual-memory-management languages mein zyada common hain. JavaScript/Java mein garbage collector inme se kaafi issues handle kar deta hai, lekin memory leaks (unwanted references hold karna) wahan bhi ho sakte hain.

## Additional Resources

### Books
- "Operating System Concepts" by Silberschatz, Galvin, Gagne — is field ki "Bhagavad Gita" samjho
- "Modern Operating Systems" by Andrew Tanenbaum
- "Understanding the Linux Kernel" by Bovet and Cesati

### Online Resources
- Linux kernel memory management documentation
- Intel Software Developer Manuals (x86 paging ke liye)
- GCC memory allocation profiling tools

### Related Topics
- CPU architecture aur caching
- File systems aur buffer cache
- Database buffer management (Postgres ka shared_buffers bhi isi principle pe kaam karta hai — tumne DB notes mein padha hoga)
- Container memory limits (Docker/Kubernetes mein memory limits set karna isi concept ka extension hai)

## Practice Projects

Sirf padhna kaafi nahi — haath gande karo:

1. **Page Replacement Simulator**: Alag-alag algorithms implement aur compare karo
2. **Memory Allocator**: Apna custom malloc/free implementation likho
3. **Cache Simulator**: Alag-alag policies ke saath cache behavior simulate karo
4. **Memory Monitor**: Process memory usage ko time ke saath track karne wala tool banao
5. **Garbage Collector**: Ek toy language ke liye simple mark-and-sweep collector banao

## Navigation

- **Next**: [Memory Hierarchy →](./01_memory_hierarchy.md)
- **Up**: [Operating Systems](../README.md)

## Assessment

Ye section complete karne ke baad, tumhe ye sab aana chahiye:

- [ ] Memory hierarchy aur caching principles explain karna
- [ ] Address translation mechanisms describe karna
- [ ] Paging aur segmentation compare karna
- [ ] Page replacement algorithms implement karna
- [ ] Memory allocation strategies analyze karna
- [ ] Garbage collection techniques samajhna
- [ ] Memory monitor karne ke liye system tools use karna
- [ ] Memory-related issues debug karna
- [ ] Better memory performance ke liye programs optimize karna

## Key Takeaways

- Memory management OS ki sabse critical job hai — isolation, allocation, aur "unlimited memory" ka illusion, sab yahi handle karta hai
- Memory hierarchy (registers → cache → RAM → disk) speed aur cost ke trade-off pe based hai
- Logical aur physical address alag cheez hain — MMU inke beech ka translator hai
- Paging fixed-size blocks se external fragmentation khatam karta hai; segmentation program structure ke saath match karta hai
- Virtual memory demand paging ke through RAM se bade programs chalane deta hai
- Page replacement algorithms (FIFO, LRU, Clock) decide karte hain ki memory full hone pe kaunsa page evict karna hai
- malloc/free jaisi manual allocation strategies aur garbage collection jaise automatic approach — dono ke apne trade-offs hain
- Real-world tools (`free`, `vmstat`, `valgrind`) se practice karna theory se zyada valuable hai — production debugging isi se aata hai

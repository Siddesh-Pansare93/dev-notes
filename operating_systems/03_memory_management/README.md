# Memory Management

Welcome to the Memory Management section! This comprehensive guide covers how operating systems manage computer memory, from hardware concepts to advanced software techniques.

## Overview

Memory management is one of the most critical responsibilities of an operating system. It involves managing the computer's primary memory (RAM), ensuring efficient allocation and deallocation, providing isolation between processes, and creating the illusion of unlimited memory through virtual memory techniques.

**Estimated Time**: 5-6 hours

## What You'll Learn

- Memory hierarchy and cache organization
- Address spaces and address translation
- Paging and segmentation mechanisms
- Virtual memory and demand paging
- Page replacement algorithms
- Memory allocation strategies
- Garbage collection techniques

## Prerequisites

- Basic understanding of computer architecture
- Familiarity with programming in C
- Knowledge of process concepts
- Understanding of data structures (linked lists, trees)

## Tutorials

### [01. Memory Hierarchy](./01_memory_hierarchy.md)
**Duration**: 45 minutes

Explore the memory hierarchy pyramid from registers to disk storage. Learn about cache memory, cache mapping techniques, and the principle of locality.

**Topics Covered**:
- Memory hierarchy levels (registers, cache, RAM, disk)
- Access times and cost trade-offs
- L1, L2, L3 cache organization
- Cache hits, misses, and hit ratios
- Cache mapping techniques
- Temporal and spatial locality
- Memory wall problem

### [02. Address Spaces](./02_address_spaces.md)
**Duration**: 40 minutes

Understand the distinction between logical and physical addresses, and how the Memory Management Unit translates between them.

**Topics Covered**:
- Logical vs physical address spaces
- Address binding stages
- Memory Management Unit (MMU)
- Base and limit registers
- Dynamic relocation
- Process memory layout
- Viewing memory maps with /proc

### [03. Paging and Segmentation](./03_paging_segmentation.md)
**Duration**: 50 minutes

Learn the two fundamental memory management schemes: paging and segmentation, and how they solve memory allocation problems.

**Topics Covered**:
- Contiguous allocation problems
- Paging mechanism and page tables
- Translation Lookaside Buffer (TLB)
- Multi-level paging
- Segmentation concepts
- Segmentation vs paging
- Internal and external fragmentation

### [04. Virtual Memory](./04_virtual_memory.md)
**Duration**: 45 minutes

Discover how operating systems create the illusion of unlimited memory through virtual memory and demand paging.

**Topics Covered**:
- Virtual memory concepts
- Demand paging
- Page fault handling
- Thrashing and prevention
- Working set model
- Copy-on-Write (COW)
- Swap space management
- Memory monitoring tools

### [05. Page Replacement Algorithms](./05_page_replacement.md)
**Duration**: 50 minutes

Study various algorithms for selecting which pages to evict from memory when space is needed.

**Topics Covered**:
- FIFO (First In First Out)
- Optimal page replacement
- LRU (Least Recently Used)
- LRU approximation algorithms
- Clock and second chance algorithms
- Belady's anomaly
- Comparing algorithm performance

### [06. Memory Allocation Strategies](./06_memory_allocation.md)
**Duration**: 45 minutes

Examine strategies for allocating memory to processes, from kernel-level allocation to user-space heap management.

**Topics Covered**:
- Fixed vs dynamic partitioning
- First Fit, Best Fit, Worst Fit
- Buddy system algorithm
- Slab allocation
- malloc() and free() internals
- Memory fragmentation
- Memory leak detection

### [07. Garbage Collection](./07_garbage_collection.md)
**Duration**: 50 minutes

Learn about automatic memory management techniques used in modern programming languages.

**Topics Covered**:
- Manual vs automatic memory management
- Reference counting
- Mark and Sweep algorithm
- Copying collectors
- Generational garbage collection
- GC performance tuning
- Language-specific implementations

## Learning Path

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

1. **Sequential Learning**: Follow the tutorials in order, as each builds on previous concepts
2. **Hands-on Practice**: Run all code examples and commands on your system
3. **Visualization**: Draw diagrams to understand address translation and paging
4. **Experiments**: Modify parameters in examples to see different behaviors
5. **Exercises**: Complete exercises at each difficulty level
6. **Real-world Tools**: Practice with system monitoring tools (vmstat, free, valgrind)

## Key Concepts Summary

| Concept | Purpose | Key Benefit |
|---------|---------|-------------|
| **Cache Memory** | Fast memory between CPU and RAM | Reduces average memory access time |
| **Virtual Memory** | Illusion of unlimited memory | Allows running programs larger than RAM |
| **Paging** | Fixed-size memory blocks | Eliminates external fragmentation |
| **Segmentation** | Logical memory division | Matches program structure |
| **TLB** | Cache for page tables | Speeds up address translation |
| **Page Replacement** | Evict pages when memory full | Manages limited physical memory |
| **Garbage Collection** | Automatic memory reclamation | Prevents memory leaks |

## Memory Management in Modern Systems

### Linux Memory Management
- Uses demand paging with page replacement
- Supports both anonymous pages (heap, stack) and file-backed pages
- Implements various page replacement policies (LRU variants)
- Supports huge pages for improved performance
- Uses slab allocator for kernel memory

### Windows Memory Management
- Virtual Memory Manager handles paging
- Working set manager per process
- Modified page writer for dirty pages
- Supports large pages
- Memory compression for inactive pages

### macOS Memory Management
- Based on Mach VM system
- Compressed memory before swapping
- Application memory vs wired memory
- File-backed and anonymous memory
- Memory pressure notification system

## Tools and Commands

```bash
# View memory usage
free -h

# Monitor memory statistics
vmstat 1

# View process memory map
cat /proc/[PID]/maps

# Check swap usage
swapon --show

# View cache information
lscpu | grep -i cache

# Memory profiling
valgrind --leak-check=full ./program

# System memory info
cat /proc/meminfo
```

## Common Memory Issues

1. **Memory Leaks**: Allocated memory never freed
2. **Fragmentation**: Unusable free memory in small chunks
3. **Thrashing**: Excessive paging activity
4. **Stack Overflow**: Stack grows beyond allocated space
5. **Heap Corruption**: Writing beyond allocated memory
6. **Dangling Pointers**: Using freed memory

## Additional Resources

### Books
- "Operating System Concepts" by Silberschatz, Galvin, Gagne
- "Modern Operating Systems" by Andrew Tanenbaum
- "Understanding the Linux Kernel" by Bovet and Cesati

### Online Resources
- Linux kernel memory management documentation
- Intel Software Developer Manuals (for x86 paging)
- GCC memory allocation profiling tools

### Related Topics
- CPU architecture and caching
- File systems and buffer cache
- Database buffer management
- Container memory limits

## Practice Projects

1. **Page Replacement Simulator**: Implement and compare different algorithms
2. **Memory Allocator**: Write a custom malloc/free implementation
3. **Cache Simulator**: Simulate cache behavior with different policies
4. **Memory Monitor**: Tool to track process memory usage over time
5. **Garbage Collector**: Simple mark-and-sweep collector for a toy language

## Navigation

- **Next**: [Memory Hierarchy →](./01_memory_hierarchy.md)
- **Up**: [Operating Systems](../README.md)

## Assessment

After completing this section, you should be able to:

- [ ] Explain the memory hierarchy and caching principles
- [ ] Describe address translation mechanisms
- [ ] Compare paging and segmentation
- [ ] Implement page replacement algorithms
- [ ] Analyze memory allocation strategies
- [ ] Understand garbage collection techniques
- [ ] Use system tools to monitor memory usage
- [ ] Debug memory-related issues
- [ ] Optimize programs for better memory performance

---

*Happy Learning! Memory management is complex but fascinating - take your time to understand each concept thoroughly.*

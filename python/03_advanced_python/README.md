# Advanced Python

This section takes you beyond Python basics into the patterns and features that professional Python developers use daily — type safety, async programming, concurrency, iterators, decorators, and functional style. It is written for developers who already know JavaScript/TypeScript and want to understand how these concepts translate (and where they diverge) in Python.

## Table of Contents

### Part 1: Type System
1. [Type Hints](./01_type_hints.md) — annotations, mypy, Optional, Union, type aliases
2. [Advanced Types](./02_advanced_types.md) — generics, Protocols, TypedDict, dataclasses, variance

### Part 2: Control Flow & Resource Management
3. [Iterators and Generators](./03_iterators_and_generators.md) — `__iter__`/`__next__`, `yield`, generator pipelines
4. [Context Managers](./04_context_managers.md) — `with` statement, `__enter__`/`__exit__`, `contextlib`

### Part 3: Async & Concurrency
5. [Async/Await](./05_async_await.md) — coroutines, `asyncio.run()`, `gather()`, the two-worlds problem
6. [Async Patterns](./06_async_patterns.md) — semaphores, queues, timeouts, async context managers
7. [Concurrency](./07_concurrency.md) — threading, multiprocessing, the GIL, `concurrent.futures`

### Part 4: Advanced Patterns
8. [Advanced Decorators](./08_decorators_advanced.md) — parameterized decorators, class decorators, `functools.wraps`
9. [Functional Programming](./09_functional_programming.md) — `map`/`filter`/`reduce`, `partial`, `operator`, immutability, lazy pipelines

---

## Learning Path

### Beginner Track
Start here if you are comfortable with Python basics but new to its type system or generators.

1. Type Hints (ch. 1) — make your code self-documenting and tooling-friendly
2. Advanced Types (ch. 2) — Protocols and dataclasses for structured data
3. Iterators and Generators (ch. 3) — understand Python's iteration model

### Intermediate Track
Suitable if you have written some Python but want to understand async and resource management properly.

4. Context Managers (ch. 4) — safe resource handling patterns
5. Async/Await (ch. 5) — the critical conceptual shift from Node.js
6. Async Patterns (ch. 6) — real-world async idioms and pitfalls
7. Advanced Decorators (ch. 8) — metaprogramming without the magic

### Advanced Track
For developers building production systems or wanting to understand Python's concurrency model deeply.

8. Concurrency (ch. 7) — threads vs processes, the GIL, when to use each
9. Functional Programming (ch. 9) — Pythonic functional style, lazy evaluation, immutable data

---

## What You'll Learn

- How Python's type hint system compares to TypeScript, and how to use `mypy` effectively
- The difference between `Protocol`, `TypedDict`, dataclasses, and when to reach for each
- How iterators and generators work under the hood, and how to write memory-efficient pipelines
- The `with` statement and how to write your own context managers using both classes and `contextlib`
- Why Python's async model is fundamentally different from Node.js, and how to avoid the "two worlds" trap
- Production async patterns: semaphores, bounded concurrency, timeout handling
- The GIL, when threading actually helps, and when to use multiprocessing instead
- How to write decorators with parameters, stack multiple decorators, and preserve metadata with `functools.wraps`
- Functional programming the Pythonic way: comprehensions over `map`/`filter`, lazy `itertools` pipelines, immutable frozen dataclasses

---

## Prerequisites

- Comfortable with Python syntax, functions, classes, and basic OOP
- Familiarity with JavaScript or TypeScript is assumed throughout — examples include side-by-side comparisons
- Python 3.10+ recommended (several chapters use `X | Y` union syntax and `match` statements)
- `pip install mypy aiohttp` for hands-on work with the type checking and async chapters

---

## How to Use This Guide

1. **Follow the tracks, not just the order.** If you already know generators, skip to chapter 4. The tracks on the learning path above tell you what each chapter depends on.
2. **Run the examples yourself.** Every code block is copy-pasteable. Async and concurrency concepts only click once you see the timings with your own eyes.
3. **Do the exercises.** Each chapter ends with five graded exercises — they are the most efficient way to expose gaps in your mental model.
4. **Use the TypeScript comparisons as anchors.** The side-by-side comparisons are there because the concepts exist in both languages even when the syntax differs wildly. Lean on them.
5. **Check types with mypy as you go.** After chapter 1, run `mypy --strict` on your exercise solutions. Seeing real type errors is the fastest way to internalize the system.

---

Master these nine chapters and you will write Python that is correct, readable, and production-ready — not just Python that runs.

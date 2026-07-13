# Advanced Python

Chalo ab Python basics se aage badhte hain — is section mein wahi patterns aur features cover honge jo professional Python developers roz use karte hain: type safety, async programming, concurrency, iterators, decorators, aur functional style. Ye tumhare liye likha gaya hai — ek developer jo already JavaScript/TypeScript jaanta hai aur ye samajhna chahta hai ki ye concepts Python mein kaise translate hote hain (aur kahan alag hote hain).

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

Sabse pehla sawaal — kahan se shuru karein? Neeche teen tracks hain, apne comfort level ke hisaab se pick karo.

### Beginner Track
Agar Python basics mein comfortable ho, lekin type system ya generators naye lagte hain, to yahan se start karo.

1. Type Hints (ch. 1) — apna code self-documenting aur tooling-friendly banao
2. Advanced Types (ch. 2) — structured data ke liye Protocols aur dataclasses
3. Iterators and Generators (ch. 3) — Python ka iteration model samjho

### Intermediate Track
Agar thoda Python likh chuke ho, lekin async aur resource management theek se samajhna hai, to ye track tumhare liye hai.

4. Context Managers (ch. 4) — resources ko safely handle karne ke patterns
5. Async/Await (ch. 5) — Node.js se sabse bada conceptual shift yahin hai
6. Async Patterns (ch. 6) — real-world async idioms aur unme padne wale pitfalls
7. Advanced Decorators (ch. 8) — metaprogramming, magic ke bina

### Advanced Track
Agar production systems banate ho ya Python ka concurrency model deeply samajhna chahte ho, to ye tumhara track hai.

8. Concurrency (ch. 7) — threads vs processes, GIL, kab kya use karna hai
9. Functional Programming (ch. 9) — Pythonic functional style, lazy evaluation, immutable data

---

## What You'll Learn

- Python ka type hint system TypeScript se kaise compare hota hai, aur `mypy` ko effectively kaise use karein
- `Protocol`, `TypedDict`, dataclasses mein kya farak hai, aur kab kaunsa use karna chahiye
- Iterators aur generators internally kaise kaam karte hain, aur memory-efficient pipelines kaise likhein
- `with` statement kya hai aur apne khud ke context managers — classes se ya `contextlib` se — kaise banayein
- Python ka async model Node.js se fundamentally alag kyun hai, aur "two worlds" trap se kaise bachein
- Production mein use hone wale async patterns: semaphores, bounded concurrency, timeout handling
- GIL kya hai, threading kab actually kaam aati hai, aur kab multiprocessing use karna chahiye
- Parameters wale decorators kaise likhein, multiple decorators ko stack kaise karein, aur `functools.wraps` se metadata preserve kaise karein
- Functional programming ka Pythonic tareeka: `map`/`filter` ke bajaye comprehensions, lazy `itertools` pipelines, immutable frozen dataclasses

---

## Prerequisites

- Python syntax, functions, classes, aur basic OOP mein comfortable ho
- JavaScript ya TypeScript ki jaan-pehchaan already maan li gayi hai — examples mein side-by-side comparisons diye gaye hain
- Python 3.10+ recommended hai (kai chapters `X | Y` union syntax aur `match` statements use karte hain)
- Type checking aur async chapters ke hands-on practice ke liye `pip install mypy aiohttp` chala lena

---

## How to Use This Guide

1. **Tracks follow karo, sirf order nahi.** Agar generators pehle se aate hain, to seedha chapter 4 pe jump karo. Upar diye learning path ke tracks batate hain ki kaunsa chapter kis pe depend karta hai.
2. **Examples khud run karo.** Har code block copy-paste karne layak hai. Async aur concurrency concepts tabhi click karte hain jab apni aankhon se timings dekho.
3. **Exercises zaroor karo.** Har chapter ke end mein paanch graded exercises hain — apne mental model ke gaps dhundhne ka sabse efficient tareeka yahi hai.
4. **TypeScript comparisons ko anchor bana lo.** Side-by-side comparisons isliye diye gaye hain kyunki concepts dono languages mein exist karte hain, chahe syntax kitna bhi alag kyun na ho. Inpe bharosa karo.
5. **Aage badhte hue mypy se types check karte raho.** Chapter 1 ke baad, apne exercise solutions pe `mypy --strict` chalao. Real type errors dekhna hi system ko internalize karne ka sabse tez tareeka hai.

---

Ye naun chapters master kar lo, tumhara Python code correct, readable, aur production-ready hoga — sirf "chalne wala" Python nahi.

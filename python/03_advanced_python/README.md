# Advanced Python

Chalo, ab ek dum serious ho jao. Basic Python to sirf appetizer tha — ab mein course ka main course serve kar raha hoon. Is section mein wo sab kuch hai jo production code likh rahe developers har din use karte hain: type safety, async programming, real concurrency, generators, decorators, aur functional programming ke patterns.

Tumhare liye isse likha gaya hai kyunki tum already JavaScript/TypeScript jaante ho. To comparison through dekhi hogi — ek dum "oh, toh Python mein bhi yeh concept hai, bas syntax alag hai" waali feeling aayegi. Kai jagaah concepts bilkul same hain, kai jagaah Python completely alag tareeka use karta hai (aur usually woh tareeka zyada clever hota hai).

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

OK so sabse important question — kis chapter se shuru karu? Ye depend karta hai tumhare current level pe. Neeche teen tracks diye hain — apna situation dekho aur wahi path follow karo.

### Beginner Track (اگر نیا ہو Python types اور generators میں)

Agar Python basics to handle kar sakte ho, lekin type system aur generators abhi confusing hain, to yahan se start karo:

1. **Type Hints** (chapter 1) — apna code self-documenting banao aur IDE ko help karo suggestions dene mein
2. **Advanced Types** (chapter 2) — Structured data ke liye Protocols aur TypedDict kab use karte hain
3. **Iterators and Generators** (chapter 3) — Python ka iteration engine internally kaise kaam karta hai

### Intermediate Track (اگر async اور resource management سیکھنا ہے)

Agar Python likha to hai but async aur resource cleanup concept naye lagte hain, ya TypeScript se comparison chahiye, to ye track tumhare liye perfect hai:

1. **Context Managers** (chapter 4) — Files, databases, connections ko safely handle karne ke patterns (socho RAII se bilkul pehle)
2. **Async/Await** (chapter 5) — Ye woh jagah hai jahan Python aur Node.js ka thinking sabse zyada alag hota hai. Major mindshift warning!
3. **Async Patterns** (chapter 6) — Real-world code mein async kaise use hota hai, aur common gotchas kya hain
4. **Advanced Decorators** (chapter 8) — Metaprogramming kaise karte hain, magic methods ke bina

### Advanced Track (اگر production systems بناتے ہو)

Agar production systems build kar rahe ho ya Python ke concurrency model deeply understand karna chahte ho, to ye chapters do:

1. **Concurrency** (chapter 7) — Threads vs processes, GIL kya cheez hai, kab kya use karna chahiye
2. **Functional Programming** (chapter 9) — Pythonic functional style, lazy evaluation, immutable data structures

> [!tip]
> Chapters ka order random nahi hai. Ek chapter read karne se pehle "Prerequisites" dekh lena. Zyada-tar chapters 1-4 pe depend nahi karte, but async (5-6) concurrency (7) se pehle samajh aana chahiye.

---

## Ye Sab Seekhke Kya Hoga?

- **Type System:** Python ke type hints TypeScript se kaise different hain, aur `mypy` ko production mein kaise configure karein
- **Structured Data:** `Protocol`, `TypedDict`, dataclasses mein kya actual differences hain, aur kaunsa use karna chahiye given situation
- **Memory Efficiency:** Iterators aur generators internally kaise kaam karte hain. Matlab ek crore lines ka file process karna possible hai without running out of RAM
- **Resource Management:** `with` statement deep dive, aur apne khud ke context managers kaise likhein — kahein to classes se, kahein `contextlib` se
- **Async Model:** Python ka async Node.js se kyun fundamentally alag hai, aur "two worlds" trap mein kyun develop log padtey hain
- **Production Patterns:** Semaphores, bounded concurrency, timeouts, aur async edge cases jo real applications mein aate hain
- **Concurrency ka Philosophy:** GIL kya exacty hai, threading kab actually useful hai, aur multiprocessing ka overhead kab worth hota hai
- **Decorators:** Parameterized decorators, class decorators, aur `functools.wraps` se metadata preserve kaise karein
- **Functional Style:** Map/filter ke alternatives, lazy itertools pipelines, frozen dataclasses mein immutability

---

## Zaruri Cheezein (Prerequisites)

- Python syntax, functions, classes, aur OOP basics pata hon. Iska matlab chapters 01-02 (quick start aur basic fundamentals) acha se padh chuke ho
- JavaScript ya TypeScript ki jaan-pehchaan ho — examples mein side-by-side comparisons hain
- **Python 3.10+** recommended (kai chapters `X | Y` union syntax use karte hain)
- Type checking chapters ke liye: `pip install mypy`
- Async chapters ke liye: `pip install aiohttp` (requests ke async version)

---

## Is Guide Ko Kaise Use Kare

**1. Learning tracks follow karo, order ka paripalan zaruri nahi.**
Agar generators already samajh aate hain, to seedha chapter 4 pe jump kar sakte ho. Upar diye tracks mein likha hai ki kaun-kaun chapter kis pe depend karte hain.

**2. Code examples apne khud run karo.**
Har code block copy-paste ke liye ready hai. Async aur concurrency ke concepts tab hi click karte hain jab tumhare terminal mein execution time dekho, logs dekho.

**3. Exercises zaroor karo.**
Har chapter ke end mein exercises hain. Ye mental model ke gaps dhundne ka fastest tareeka hai. Socho Leetcode jaisa nahi — ye exercises practical problems hain jo actual code mein aate hain.

**4. TypeScript comparisons ko anchor point banao.**
Side-by-side comparisons isliye diye gaye hain. Kyunki concepts dono languages mein exist karte hain, bass syntax alag hai. Comparisons use karke faster learn kar paoge.

**5. Mypy se types verify karo.**
Chapter 1 ke baad, apne exercise solutions pe `mypy --strict` run karo. Actual type errors dekh-dekh ke learning fastest hoti hai.

---

Ye naun chapters properly master kar lo, to tumhara Python code correct hoga, readable hoga, aur production-ready hoga — sirf "chalne wala" Python nahi, professional-grade code likha karoge.

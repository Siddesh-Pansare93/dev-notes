# Object-Oriented Python

Python's object-oriented system is powerful and expressive — but it has its own idioms that can trip up developers coming from TypeScript or JavaScript. This section walks through Python's OOP model from class basics all the way to advanced patterns like dataclasses and enums, with every concept grounded in TypeScript comparisons so you can map what you already know.

## Table of Contents

1. [Classes & Basics](./01_classes_basics.md) — `class`, `__init__`, `self`, instance/class/static methods, access modifiers
2. [Inheritance](./02_inheritance.md) — single and multiple inheritance, `super()`, MRO, mixins
3. [Magic Methods](./03_magic_methods.md) — dunder methods, operator overloading, iteration, context managers
4. [Decorators](./04_decorators.md) — function decorators, class decorators, `@property`, `@staticmethod`, `@classmethod`
5. [Abstract Classes](./05_abstract_classes.md) — `ABC`, `@abstractmethod`, interfaces via protocols
6. [Dataclasses](./06_dataclasses.md) — `@dataclass`, field defaults, frozen/immutable classes, `__post_init__`
7. [Enums & NamedTuples](./07_enums_and_namedtuples.md) — `Enum`, `IntEnum`, `NamedTuple`, when to use each

---

## Learning Path

### Beginner — Get the fundamentals solid first
1. [Classes & Basics](./01_classes_basics.md) — understand `self`, `__init__`, and how Python properties work differently from TypeScript
2. [Inheritance](./02_inheritance.md) — learn `super()` and how Python handles multiple inheritance with MRO
3. [Abstract Classes](./05_abstract_classes.md) — replace TypeScript interfaces with Python's ABCs and Protocols

### Intermediate — Level up your Python idioms
4. [Magic Methods](./03_magic_methods.md) — make your objects feel native to Python by implementing dunder protocols
5. [Decorators](./04_decorators.md) — understand how `@property`, `@staticmethod`, and custom decorators work under the hood

### Advanced — Write idiomatic, production-quality Python
6. [Dataclasses](./06_dataclasses.md) — eliminate boilerplate from data-holding classes with `@dataclass`
7. [Enums & NamedTuples](./07_enums_and_namedtuples.md) — model constants and lightweight value types cleanly

---

## What You'll Learn

- How Python's `class` model differs from TypeScript: why `self` is explicit, how attributes are declared, and what `__init__` really does
- Single and multiple inheritance, method resolution order (MRO), and the `super()` call chain
- The full dunder/magic method system: `__str__`, `__repr__`, `__eq__`, `__len__`, `__add__`, `__iter__`, `__enter__`/`__exit__`, and more
- How Python decorators work as higher-order functions, and how `@property` replaces TypeScript getters/setters
- Defining and enforcing interfaces using `ABC` and `@abstractmethod`, plus structural subtyping with `Protocol`
- Using `@dataclass` to auto-generate `__init__`, `__repr__`, `__eq__`, and immutability with `frozen=True`
- Modelling constant sets and lightweight records with `Enum`, `IntEnum`, and `NamedTuple`
- TypeScript-to-Python mappings for every concept so you build on what you already know

---

## Prerequisites

- Comfortable with Python functions, type hints, and basic syntax (covered in the Python Basics section)
- Familiarity with classes and interfaces in TypeScript or another OOP language — this section uses TypeScript comparisons throughout
- No prior Python OOP experience required

---

## How to Use This Guide

1. **Follow the beginner path first.** Chapters 1 and 2 are dense but foundational — everything else builds on them. Skim nothing.
2. **Run the code examples.** Every file is packed with runnable snippets. Open a Python REPL alongside and type them out; muscle memory matters.
3. **Use the TypeScript comparisons actively.** When you see a side-by-side example, ask yourself why Python made a different choice — the reasoning is usually illuminating.
4. **Return to Magic Methods after finishing everything else.** Chapter 3 makes a lot more sense once you have seen how dataclasses and ABCs use dunders internally.
5. **Check the "when to use each" sections.** Dataclasses, NamedTuples, and plain classes all overlap — the guides tell you exactly when to reach for which tool.

---

Python's object model rewards curiosity — the more you poke at how things work under the hood, the more naturally Pythonic code you'll write. Keep experimenting.

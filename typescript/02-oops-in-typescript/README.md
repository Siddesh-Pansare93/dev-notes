# OOP in TypeScript

TypeScript brings full object-oriented programming to JavaScript — with compile-time enforcement. This section covers everything from class fundamentals to production-grade design patterns and SOLID principles, all grounded in backend and real-world TypeScript code.

## Table of Contents

1. [Classes and Access Modifiers](./01-classes-and-access-modifiers.md)
2. [Interfaces vs Abstract Classes](./02-interfaces-vs-abstract-classes.md)
3. [Inheritance and Polymorphism](./03-inheritance-and-polymorphism.md)
4. [Design Patterns](./04-design-patterns.md)
5. [SOLID Principles](./05-solid-principles.md)

---

## Learning Path

### Beginner
Start here if you are coming from plain JavaScript or are new to OOP concepts in TypeScript.

1. **Chapter 1** — Classes and Access Modifiers: learn `public`, `private`, `protected`, `readonly`, parameter properties, static members, and getters/setters
2. **Chapter 2** — Interfaces vs Abstract Classes: understand the key differences, when to use each, and how TypeScript erases interfaces at runtime

### Intermediate
You know the basics but want to write more structured, extensible code.

3. **Chapter 3** — Inheritance and Polymorphism: method overriding with `override`, `super`, mixins, and composition vs inheritance trade-offs
4. **Chapter 4** — Design Patterns: Singleton, Factory, Strategy, Observer, Repository, and Decorator patterns with typed TypeScript examples

### Advanced
You are writing production systems and want code that is maintainable at scale.

5. **Chapter 5** — SOLID Principles: all five principles (SRP, OCP, LSP, ISP, DIP) with bad/good comparisons and how NestJS leverages each one in its architecture

---

## What You'll Learn

- How TypeScript access modifiers (`public`, `private`, `protected`, `readonly`) enforce encapsulation at compile time
- Parameter properties — the constructor shorthand that eliminates class boilerplate
- Static members, getters/setters, and the `abstract` keyword
- The real differences between interfaces and abstract classes, and when to reach for each
- Declaration merging and implementing multiple interfaces on a single class
- Method overriding with the `override` keyword and calling parent logic via `super`
- The mixins pattern for composing behaviors across classes
- Why composition is often preferred over deep inheritance chains
- Six essential design patterns (Singleton, Factory, Strategy, Observer, Repository, Decorator) with typed, practical examples
- All five SOLID principles with before/after code examples in a backend context
- How modern frameworks like NestJS apply these OOP principles in their architecture

---

## Prerequisites

Before starting this section, you should be comfortable with:

- **TypeScript basics** — type annotations, interfaces for data shapes, generics at a surface level (covered in the previous section of this repo)
- **JavaScript classes** — the ES6 `class` syntax, constructors, and `extends`; you do not need to be an expert, but the fundamentals should be familiar
- **Async/await** — examples use Promises and `async/await` throughout
- **General programming concepts** — what a function, an argument, and a return type are

---

## How to Use This Guide

1. **Read in order the first time.** Each chapter builds on the last — access modifiers introduced in Chapter 1 appear in abstract class examples in Chapter 2, then in pattern implementations in Chapter 4.
2. **Type out the examples yourself.** Copying code into a TypeScript playground or local `.ts` file and seeing the compiler errors in real time is the fastest way to internalize the rules.
3. **Do the mini-exercises.** Chapter 1 includes a `CacheManager` exercise that ties together nearly every concept in the chapter. Resist skipping these.
4. **Use the bad/good comparisons in Chapter 5 as a code review checklist.** When reviewing your own code, run through the five SOLID questions — you will catch design issues early.
5. **Come back to Chapter 4 when you start a real project.** Design patterns are easier to appreciate once you have felt the pain they solve. Read it once now to know the vocabulary, then revisit it when you hit the problem each pattern addresses.

---

Good OOP in TypeScript is not about using every feature — it is about writing code that is clear, extensible, and safe to change. Work through these chapters and you will have the vocabulary and tools to do exactly that.

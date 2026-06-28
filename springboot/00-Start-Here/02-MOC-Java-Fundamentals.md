---
tags: [moc, java, fundamentals]
aliases: [MOC Java Fundamentals, Java MOC]
stage: foundation
---

# MOC: Java Fundamentals

> [!info] Map of Content
> Everything you need from the Java language itself before touching Spring. If you're coming from TypeScript, focus on the *differences* — most concepts (classes, generics, async, exceptions) translate, but the details bite.

## The platform

- [[01-JDK-JRE-JVM-Basics]] — JDK vs JRE vs JVM, what runs what
- [[02-Bytecode-and-Class-Loading]] — what `javac` produces, how it loads
- [[03-JVM-Memory-and-GC]] — heap, stack, garbage collectors
- [[04-Modules-and-the-Module-System]] — JPMS (Java 9+) — usually safe to ignore at first

> [!tip] Reading order
> Skim 01 first; revisit 03 once you've seen GC pauses in production.

## Language basics

- [[01-Classes-and-Objects]]
- [[02-Primitives-vs-Reference-Types]]
- [[03-Visibility-and-Access-Modifiers]]
- [[04-Static-vs-Instance]]
- [[05-Constructors-and-Initialization]]
- [[06-Interfaces-and-Abstract-Classes]]
- [[07-Inheritance-and-Polymorphism]]
- [[08-Enums]]
- [[09-Records-and-Pattern-Matching]]
- [[10-Sealed-Classes]]

## Type system

- [[01-Generics]]
- [[02-Bounded-Type-Parameters-and-Wildcards]]
- [[03-Type-Erasure]]
- [[04-Optional-and-Null-Safety]]
- [[05-var-and-Local-Type-Inference]]

## Collections & streams

- [[01-Collections-Framework]] — `List`, `Set`, `Map`, `Queue`
- [[02-Iterators-and-for-each]]
- [[03-Streams-and-Lambdas]]
- [[04-Collectors]]
- [[05-Functional-Interfaces]] — `Function`, `Predicate`, `Supplier`, `Consumer`

## Exceptions

- [[01-Exception-Handling]]
- [[02-Checked-vs-Unchecked]]
- [[03-Try-with-Resources]]
- [[04-Custom-Exceptions]]

## Concurrency

- [[01-Concurrency-Basics]] — `Thread`, `Runnable`, `Callable`
- [[02-ExecutorService-and-Thread-Pools]]
- [[03-CompletableFuture]]
- [[04-Synchronization-and-Locks]]
- [[05-Virtual-Threads]] (JDK 21+) — game-changer for I/O-bound apps
- [[06-Atomic-Types-and-Concurrent-Collections]]

> [!tip] Modern Java tip
> If you're on JDK 21+, virtual threads make blocking I/O cheap again. Read [[05-Virtual-Threads]] before assuming you need reactive/WebFlux.

## I/O & files

- [[01-Streams-IO-vs-NIO]]
- [[02-Reading-and-Writing-Files]]
- [[03-Charsets-and-Encoding]]

## Date & time

- [[01-java-time-Overview]] — `Instant`, `LocalDate`, `LocalDateTime`, `ZonedDateTime`, `Duration`, `Period`
- [[02-Time-Zones-Done-Right]]

## Modern features (worth knowing)

- [[01-Records-and-Pattern-Matching]] (also linked above)
- [[02-Switch-Expressions-and-Patterns]]
- [[03-Text-Blocks]]
- [[04-Sealed-Classes]] (also linked above)

## TS-to-Java translation aids

These live in the `02-Java-vs-TypeScript/` section:

- [[01-Java-vs-TypeScript-Quick-Map]]
- [[02-Type-System-Differences]]
- [[03-Async-Patterns-Comparison]]
- [[04-Modules-and-Imports-Compared]]
- [[05-Tooling-Compared]]

## Suggested study path

> [!tip] If you only do five things from this MOC
> 1. [[01-Classes-and-Objects]] + [[02-Primitives-vs-Reference-Types]]
> 2. [[01-Generics]]
> 3. [[03-Streams-and-Lambdas]]
> 4. [[01-Exception-Handling]] (especially checked vs unchecked)
> 5. [[01-Concurrency-Basics]] + [[05-Virtual-Threads]]

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[03-MOC-Spring]]
- [[05-Glossary]]
- [[06-FAQ-for-Express-Devs]]

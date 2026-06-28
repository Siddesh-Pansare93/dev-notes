---
tags: [java, fundamentals, runtime, jvm]
aliases: [JVM, JDK, JRE, Java Runtime]
stage: foundation
---

# JVM, JDK, and JRE

> [!info] For the Express/TS dev
> In Node.js you have one thing: the `node` binary, which embeds V8. In Java the runtime is split into three layers — the **JVM** (the V8-equivalent engine that runs bytecode), the **JRE** (JVM + standard library, like a stripped-down `node` for end users), and the **JDK** (JRE + compiler + dev tools, like `node` plus `tsc` plus `npm` bundled). As a developer you install the **JDK**.

## Concept

Java compiles `.java` source files into platform-neutral `.class` bytecode. The JVM then runs that bytecode on any OS. This is "write once, run anywhere".

- **JVM (Java Virtual Machine)** — the process that loads `.class` files, JIT-compiles hot paths to native code, manages the heap, and runs your program. Implementations: HotSpot (the default), GraalVM, OpenJ9.
- **JRE (Java Runtime Environment)** — JVM + the standard class library (`java.util`, `java.io`, `java.net`, ...). Just enough to *run* a Java app. Modern JDKs no longer ship a separate JRE — you just use the JDK.
- **JDK (Java Development Kit)** — JRE + `javac` (compiler), `jar`, `javadoc`, `jshell`, `jlink`, debuggers. This is what you install to build apps.

### Compile and run

```bash
javac Hello.java     # produces Hello.class (bytecode)
java Hello           # JVM loads & runs Hello.class
```

In modern Java (11+) you can also run a single file directly:

```bash
java Hello.java      # compile-and-run in one step
```

### Distributions

Oracle JDK is one vendor; the source is OpenJDK. You should use a free distribution:

- **Eclipse Temurin** (Adoptium) — the safe default
- **Amazon Corretto** — good for AWS
- **Azul Zulu**, **Microsoft Build of OpenJDK**, **GraalVM** — specialty cases

### LTS versions

Use **LTS (Long-Term Support)** releases for production: 8, 11, 17, 21, 25. For Spring Boot 3.x you need **Java 17+**; **Java 21** is the current sweet spot.

### Managing versions

Like `nvm` for Node, Java has version managers:

- **SDKMAN!** (macOS/Linux) — `sdk install java 21-tem`
- **jenv**, **asdf**
- **Scoop** / **Chocolatey** on Windows, or just install Temurin MSI

## TypeScript ↔ Java comparison

| TypeScript / Node                     | Java                                     |
| ------------------------------------- | ---------------------------------------- |
| `node` binary (V8 engine)             | JVM (HotSpot)                            |
| `.ts` → `.js` via `tsc`               | `.java` → `.class` via `javac`           |
| Source is what runs (after transpile) | Bytecode runs in the JVM                 |
| `node_modules` per project            | Classpath / module path                  |
| `nvm use 20`                          | `sdk use java 21-tem`                    |
| npm + `package.json`                  | [[Maven]] / [[Gradle]] + `pom.xml`       |
| V8 GC, single-threaded event loop     | JVM GC (G1, ZGC), real OS threads        |
| Interpreted + V8 JIT                  | Bytecode interpreter + HotSpot C2 JIT    |

## Code example

```java
// File: Hello.java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Java " + Runtime.version());
        System.out.println("Vendor: " + System.getProperty("java.vendor"));
        System.out.println("Home:   " + System.getProperty("java.home"));
    }
}
```

```bash
$ javac Hello.java
$ java Hello
Java 21.0.2+13-LTS
Vendor: Eclipse Adoptium
Home:   /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
```

> [!tip] jshell — Java's REPL
> Run `jshell` for an interactive session, like `node` REPL:
> ```
> jshell> int x = 40 + 2
> x ==> 42
> jshell> "hello".toUpperCase()
> $2 ==> "HELLO"
> ```

## Gotchas

> [!warning] One public class per file
> The file **must** be named after the public class. `Hello.java` must contain `public class Hello`. Unlike TS where filename is decoupled from exports.

> [!warning] `JAVA_HOME` matters
> Many tools ([[Maven]], [[Gradle]], IDEs) read `JAVA_HOME`. If you have multiple JDKs installed and `JAVA_HOME` points at the wrong one, builds will silently use the wrong version.

> [!warning] Class versioning
> A class compiled by JDK 21 cannot run on JDK 17 by default — you'll get `UnsupportedClassVersionError`. Use `--release 17` flag to target older runtimes. There is no equivalent of "downlevel" the way `tsc` lets you target ES5 from TS5.

## Related

- [[02-Syntax-Basics]]
- [[14-Packages-Modules]]
- [[Maven]]
- [[Gradle]]
- [[Spring-Boot-Setup]]

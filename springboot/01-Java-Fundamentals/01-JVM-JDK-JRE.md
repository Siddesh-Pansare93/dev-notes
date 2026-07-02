# JVM, JDK, aur JRE — Foundations Samjho

Socho tum ek Node.js developer ho — `node` install karo, `tsc` se compile karo, aur `node index.js` run karo. Simple hai. Ab Java ki duniya mein aao toh pehli baar thoda confusing lagta hai — JVM kya hai, JRE kya hai, JDK kya hai? Alag-alag kyu hain? Install kya karoon?

Ye file seedha is confusion ko khatam karti hai. Aur ek baar ye samajh aaya, toh Spring Boot ka poora ecosystem automatically sense karne lagega.

---

## Node.js wale ke liye ek line mein

> [!info] Agar tum Node.js/TypeScript se aa rahe ho
> Node.js mein ek hi cheez hai: `node` binary jiske andar V8 engine embed hai. Java ka runtime teen layers mein split hai —
> - **JVM** = V8 engine ka equivalent — woh machine jo bytecode chalati hai
> - **JRE** = JVM + standard library — sirf app run karne ke liye (stripped-down `node` for end users)
> - **JDK** = JRE + compiler + dev tools — yani `node` + `tsc` + `npm` sab ek jagah
>
> As a developer, tum **JDK install karte ho**. Hamesha.

---

## Problem kya thi? Java ne kya solve kiya?

1990s mein ek bada problem tha — agar tumne C/C++ mein code likha Windows ke liye, toh wahi code Linux pe directly nahi chalta tha. Har platform ke liye alag compile karo, alag binary banao. Bahut jhanjhat.

Sun Microsystems ne socha — kya hoga agar ek intermediate language banayein jo kisi bhi machine pe chal sake? Aisa bytecode jo platform-specific nahi ho, lekin ek virtual machine (JVM) pe chal sake jo har platform pe available ho?

Result: **"Write Once, Run Anywhere"** — Java ka famous tagline.

Aaj ke context mein socho — Zomato ka backend Spring Boot pe chalta hai. Wahi JAR file AWS ke Linux servers pe bhi chalti hai, local development ke Windows machine pe bhi, aur CI/CD ke Ubuntu containers mein bhi. Ek build, sab jagah.

---

## Teen Cheezein — Ek Ek Karke

### JVM — Java Virtual Machine

JVM ek process hai — ek software-based machine — jo tumhara Java program actually run karta hai. Iska kaam hai:

1. `.class` files (bytecode) load karna
2. Bytecode verify karna (security ke liye)
3. **JIT (Just-In-Time) compilation** — hot code paths ko native machine code mein convert karna runtime pe
4. **Garbage Collection** — memory automatically manage karna (Node.js ki tarah, lekin kaafi zyada sophisticated)
5. Thread management — real OS threads (Node ke single-threaded event loop se bilkul alag)

> [!info] JIT kya hota hai?
> JVM pehle bytecode ko interpret karta hai (slow). Jab koi code baar baar run hota hai — jaise Swiggy pe order processing loop — JVM notice karta hai aur us code ko **native machine code** mein compile kar deta hai. Iske baad woh code bina interpretation ke directly CPU pe chalta hai. Yahi reason hai ki Java production mein bahut fast hota hai — warm-up ke baad.

**JVM Implementations:**
- **HotSpot** — Oracle ka default, sabse zyada use hota hai
- **GraalVM** — next-gen, native image compilation support karta hai (Spring Boot 3 isme kaafi interested hai)
- **OpenJ9** — IBM ka, memory-efficient

### JRE — Java Runtime Environment

JRE = JVM + Standard Class Library

Standard library mein woh sab hai jo tumhe daily kaam aata hai:
- `java.util` — collections (List, Map, Set), Date/Time
- `java.io` — file read/write
- `java.net` — networking, HTTP
- `java.lang` — String, Math, Thread (ye automatically import hoti hai)
- Aur bahut kuch

> [!warning] JRE alag download nahi milta ab
> Java 9 se JRE alag distribute nahi hoti. Agar tumhe sirf app run karni hai, tum JDK install karo. Production pe bhi JDK hi use hota hai mostly. `jlink` tool se custom minimal runtime bana sakte ho agar chahiye toh — lekin mostly JDK hi kafi hai.

### JDK — Java Development Kit

JDK = JRE + Development Tools

Tools jo JDK mein aate hain:
- **`javac`** — Java compiler (`.java` → `.class`)
- **`java`** — JVM launcher (`.class` run karta hai)
- **`jar`** — JAR (Java ARchive) files banata hai — NPM ka tarball equivalent
- **`javadoc`** — documentation generate karta hai source comments se
- **`jshell`** — interactive REPL (Node ke `node` REPL jaisa)
- **`jlink`** — custom minimal JRE banana
- **`jps`, `jstack`, `jmap`** — debugging aur profiling tools

---

## Bytecode kya hota hai? Flow samjho

TypeScript wale ke liye ek perfect analogy hai:

```
TypeScript Flow:
  hello.ts  →  tsc  →  hello.js  →  node (V8)  →  Machine Code
  (source)  (compile) (JS code)  (interpret/JIT)

Java Flow:
  Hello.java  →  javac  →  Hello.class  →  JVM (HotSpot)  →  Machine Code
  (source)    (compile)  (bytecode)     (interpret/JIT)
```

Difference yeh hai ki `.js` text format mein hota hai (human-readable), lekin `.class` binary bytecode hota hai — sirf JVM padh sakta hai use.

**Bytecode platform-neutral hota hai.** Ek Windows machine pe compile kiya hua `.class` file directly Linux pe chal sakta hai — JVM wahan ka local machine code handle karta hai. TypeScript mein bhi kuch aisa hai — `.js` har jagah chalta hai jahan Node ya browser ho.

---

## Compile aur Run karna

### Basic way:

```bash
# Step 1: Compile karo — Hello.java se Hello.class banega
javac Hello.java

# Step 2: Run karo — class name do, file extension nahi
java Hello
```

### Modern shortcut (Java 11+):

```bash
# Single file ke liye directly run karo — internally compile-and-run karta hai
java Hello.java
```

> [!tip] Ye shortcut sirf single-file programs ke liye hai
> Production Spring Boot apps mein tum hamesha Maven ya Gradle use karoge — directly `javac` rarely chalate hain manually. Ye samjhna important hai ki andar kya ho raha hai.

### Ek real example:

```java
// File: Hello.java
// Note: File ka naam class ke naam se match karna chahiye — Hello.java mein public class Hello
public class Hello {
    public static void main(String[] args) {
        // Runtime version print karo — kaun sa JDK chal raha hai
        System.out.println("Java version: " + Runtime.version());

        // Vendor kaunsa hai — Temurin, Corretto, etc.
        System.out.println("Vendor: " + System.getProperty("java.vendor"));

        // JDK kahan install hai
        System.out.println("JAVA_HOME: " + System.getProperty("java.home"));

        // OS information
        System.out.println("OS: " + System.getProperty("os.name") + " " + System.getProperty("os.arch"));
    }
}
```

```bash
$ javac Hello.java
$ java Hello
Java version: 21.0.2+13-LTS
Vendor: Eclipse Adoptium
JAVA_HOME: /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
OS: Mac OS X aarch64
```

---

## jshell — Java ka REPL

Jaise Node.js mein `node` command se interactive session khulta hai, Java mein `jshell` hai:

```bash
$ jshell
|  Welcome to JShell -- Version 21.0.2
|  For an introduction type: /help intro

jshell> int x = 40 + 2
x ==> 42

jshell> "Swiggy".toUpperCase()
$2 ==> "SWIGGY"

jshell> var list = List.of("Zomato", "Swiggy", "Blinkit")
list ==> [Zomato, Swiggy, Blinkit]

jshell> list.stream().filter(s -> s.startsWith("Z")).toList()
$4 ==> [Zomato]

jshell> /exit
```

> [!tip] jshell learning ke liye bahut kaam aata hai
> Naya API try karna ho, quick calculation karni ho — `jshell` kholo aur experiment karo. Spring Boot seekhte waqt ye bahut helpful hai.

---

## JDK Distributions — Kaunsa Install Karoon?

Java open-source hai (OpenJDK) lekin kई vendors apni distribution ship karte hain. Ye confusion create karta hai beginners ke liye.

Think of it like Linux distributions — kernel same hai (OpenJDK), packaging alag hai.

| Distribution | Kaunsa use kare? | Notes |
|---|---|---|
| **Eclipse Temurin** (Adoptium) | Default choice | Community-driven, free, production-grade |
| **Amazon Corretto** | AWS pe deploy karna hai toh | Amazon maintain karta hai, free |
| **Azul Zulu** | Enterprise environments | Commercial support available |
| **Microsoft Build of OpenJDK** | Azure environments | Windows pe bhi smooth |
| **GraalVM** | Native image chahiye | Spring Boot 3 ke AOT features ke liye |
| **Oracle JDK** | Avoid (mostly) | Commercial license, production pe costly |

> [!warning] Oracle JDK se bachke rahna
> Purani guides mein Oracle JDK download karne ke steps hote hain. Production mein Oracle JDK use karna hai toh license khareedna padta hai. **Eclipse Temurin** free hai, reliable hai, use karo.

---

## LTS Versions — Kaunsa Java Version Use Karoon?

Java har 6 mahine mein ek version release karta hai, lekin **LTS (Long-Term Support)** versions pe hi stay karo production ke liye.

**LTS Versions:** 8, 11, 17, 21, 25

```
Java 8   — 2014 — bahut purana, legacy apps mein milta hai
Java 11  — 2018 — pehla "modern" LTS
Java 17  — 2021 — Spring Boot 3 ka minimum requirement
Java 21  — 2023 — current sweet spot, virtual threads!
Java 25  — 2025 — aane wala, abhi bleeding edge
```

> [!tip] Spring Boot 3.x ke liye Java 17+ mandatory hai
> Spring Boot 2.x Java 8/11 pe bhi chalta tha. Lekin Spring Boot 3.x ne minimum Java 17 set kiya. Agar tum fresh project start kar rahe ho — **Java 21 with Spring Boot 3.x** — yahi recommendation hai 2024-25 mein.

**Java 21 mein kya special hai?**
- **Virtual Threads (Project Loom)** — millions of lightweight threads possible, Node ke async pattern ka Java answer
- **Pattern Matching** — code kaafi cleaner hota hai
- **Record classes** — boilerplate drastically kam hoti hai
- **Sequenced Collections** — List/Set/Map APIs aur intuitive

---

## Version Management — nvm jaisi cheez Java ke liye

Jaise Node mein `nvm` se multiple Node versions manage karte hain, Java mein bhi similar tools hain:

### SDKMAN! (macOS/Linux — Recommended)

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash

# Available Java versions dekhna
sdk list java

# Java 21 Temurin install karna
sdk install java 21.0.2-tem

# Java 17 Corretto bhi install karna
sdk install java 17.0.10-amzn

# Version switch karna (nvm use jaisa)
sdk use java 21.0.2-tem

# Default set karna
sdk default java 21.0.2-tem

# Current version check
sdk current java
```

### Windows pe options:

```powershell
# Scoop package manager se (recommended)
scoop install temurin21

# Ya directly Temurin MSI download karo from adoptium.net
# Ya Chocolatey se:
choco install temurin21
```

### .sdkmanrc file — project-specific version

Exactly jaise `.nvmrc` Node version pin karta hai, `.sdkmanrc` Java version pin karta hai:

```bash
# project root mein .sdkmanrc file banao
echo "java=21.0.2-tem" > .sdkmanrc

# Project directory mein jaate hi auto-switch hoga (agar configured hai)
sdk env install
```

---

## TypeScript ↔ Java — Side by Side Comparison

| TypeScript / Node.js | Java |
|---|---|
| `node` binary (V8 engine) | JVM (HotSpot engine) |
| `hello.ts` → `tsc` → `hello.js` | `Hello.java` → `javac` → `Hello.class` |
| `.js` text file, human-readable | `.class` binary bytecode |
| `node hello.js` se run | `java Hello` se run |
| `node_modules` per project | Classpath / Maven local repo (`~/.m2`) |
| `nvm use 20` | `sdk use java 21-tem` |
| `npm` + `package.json` | Maven + `pom.xml` ya Gradle + `build.gradle` |
| V8 GC, single-threaded event loop | JVM GC (G1, ZGC), real OS threads |
| Interpreted + V8 JIT | Bytecode interpreter + HotSpot C2 JIT |
| `ts-node` for dev, build for prod | `jshell` for dev, `javac` + `java` for prod |
| `@types/*` for type definitions | Built-in types, no separate type packages |

### Thread model ka fark samjho

Ye ek important difference hai jo production behavior affect karta hai:

**Node.js:** Single-threaded event loop. Ek request aa rahi hai toh callback queue mein daalo, non-blocking I/O karo. 10,000 concurrent connections handle ho jaati hain — but ek bhi synchronous blocking code sab block kar deta hai.

**Java/JVM:** Real OS threads. Har request ke liye ek thread. Java 21 mein Virtual Threads aane ke baad — Node jaisa scale possible hai, lekin code synchronous style mein likho. IRCTC jaisi high-concurrency sites Java pe kyu chalti hain? Yahi reason hai.

---

## Gotchas — Beginners Yahan Galti Karte Hain

> [!warning] File ka naam class ke naam se match karna MUST hai
> ```java
> // File: Hello.java — SAHI
> public class Hello { ... }
>
> // File: hello.java — GALAT (lowercase h)
> public class Hello { ... }  // javac error dega
>
> // File: MyClass.java — GALAT (naam match nahi karta)
> public class Hello { ... }  // javac error dega
> ```
> TypeScript mein filename aur export ka koi connection nahi hota — Java mein strictly enforce hota hai.

> [!warning] JAVA_HOME environment variable set karo
> Maven, Gradle, IDEs — sab `JAVA_HOME` environment variable padhte hain. Agar ye galat set hai ya set hi nahi hai, tools wrong Java version use karenge aur silently broken builds aayenge.
>
> ```bash
> # Check karo JAVA_HOME kya hai
> echo $JAVA_HOME  # Linux/Mac
> echo %JAVA_HOME%  # Windows CMD
> $env:JAVA_HOME   # Windows PowerShell
>
> # Set karna (bash)
> export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
> export PATH=$JAVA_HOME/bin:$PATH
>
> # Verify karo
> java -version
> javac -version
> ```

> [!warning] UnsupportedClassVersionError — version mismatch
> Agar Java 21 pe compile kiya aur Java 17 pe run karne ki koshish ki:
>
> ```
> Error: LinkageError occurred while loading main class Hello
>     java.lang.UnsupportedClassVersionError: Hello has been compiled by a more recent version of the Java Runtime
> ```
>
> Fix: Compile karte waqt target version specify karo:
>
> ```bash
> # Java 17 compatible bytecode generate karo, chahe JDK 21 use ho
> javac --release 17 Hello.java
> ```
>
> TypeScript mein `tsc --target ES5` jaisa hai — downlevel compilation. Maven/Gradle projects mein ye `pom.xml` ya `build.gradle` mein configure hota hai, manually nahi karna padta.

> [!warning] `java` command mein `.class` extension mat dena
> ```bash
> java Hello.class  # GALAT — error aayega
> java Hello        # SAHI — class name do, extension nahi
> ```
> Node.js mein `node hello.js` mein extension dete hain. Java mein class name dete hain — confusing hai beginners ke liye.

> [!warning] Multiple public classes ek file mein nahi hoti
> ```java
> // GALAT — ek file mein do public classes nahi hoti
> public class Hello { ... }
> public class World { ... }  // Compile error!
>
> // SAHI — non-public class same file mein ho sakti hai
> public class Hello { ... }
> class Helper { ... }  // Ye allowed hai
> ```

---

## Production Reality — Spring Boot Apps Mein Kya Hota Hai

Jab tum Spring Boot app deploy karte ho (jaise Zomato jaisi company kare), toh flow kuch aisa hota hai:

```
Developer Machine:
  src/main/java/**/*.java
        ↓ (Maven: mvn package)
  target/myapp-1.0.jar  ← ek fat JAR mein sab kuch pack hota hai

Production Server (AWS/GCP/Azure):
  java -jar myapp-1.0.jar
        ↓
  JVM starts
        ↓
  Spring context loads
        ↓
  HTTP server starts (port 8080)
        ↓
  Requests handle hoti hain
```

FAT JAR (uber JAR) mein kya hota hai:
- Tumhara compiled bytecode (`.class` files)
- Saari dependencies (Spring Boot, Hibernate, etc.)
- Embedded Tomcat server
- Resources (templates, configs)

Node.js mein jo `node_modules` hota hai project ke saath, Java mein wo sab fat JAR mein bundle ho jaata hai. Deployment simple ho jaata hai — ek JAR file copy karo, `java -jar` karo, done.

---

## JVM Internals — Thoda Deep Dive

Production issues debug karne ke liye JVM ka basic structure pata hona chahiye:

```
JVM Memory Structure:
┌─────────────────────────────────────────┐
│              JVM Process                │
│  ┌───────────────────────────────────┐  │
│  │            Heap Memory            │  │
│  │  ┌──────────────┐ ┌────────────┐  │  │
│  │  │  Young Gen   │ │  Old Gen   │  │  │
│  │  │  (Eden +     │ │  (long-    │  │  │
│  │  │   Survivors) │ │   lived    │  │  │
│  │  └──────────────┘ │   objects) │  │  │
│  │                   └────────────┘  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────┐  ┌─────────────────┐ │
│  │  Metaspace    │  │  Thread Stacks  │ │
│  │  (class       │  │  (each thread   │ │
│  │   metadata)   │  │   ka apna stack)│ │
│  └───────────────┘  └─────────────────┘ │
└─────────────────────────────────────────┘
```

**Garbage Collection kaise kaam karta hai (simplified):**
- Nayi objects Young Generation (Eden) mein jaati hain
- Jab Eden full hota hai, Minor GC hota hai — dead objects clean hote hain
- Jo objects survive karte hain baar baar, woh Old Generation mein promote hote hain
- Old Gen full hone pe Major GC — thoda slow

Node.js mein bhi V8 GC hota hai similar pattern se, lekin Java ka GC kaafi advanced hai — G1GC, ZGC (near-zero pause), Shenandoah.

---

## Key Takeaways

- **JDK install karo** — development ke liye hamesha JDK chahiye, JRE nahi. Modern distributions mein JRE alag nahi milta.
- **JVM = Java ka V8** — bytecode run karta hai, memory manage karta hai, JIT compile karta hai
- **Bytecode platform-neutral hota hai** — ek jagah compile karo, kahin bhi chalao — "Write Once, Run Anywhere"
- **Eclipse Temurin use karo** — free, production-grade, default safe choice
- **Java 21 LTS use karo** — Spring Boot 3.x ke saath, current sweet spot hai
- **SDKMAN!** macOS/Linux pe — `nvm` jaisa tool for Java version management
- **JAVA_HOME set karo** — Maven, Gradle, IDEs sab isko padhte hain
- **File naam = Class naam** — `Hello.java` mein `public class Hello` honi chahiye, koi flexibility nahi
- **`java Hello` nahi `java Hello.class`** — class name do, extension nahi
- **JIT warm-up hota hai** — Java apps startup pe slow lagte hain, baad mein bahut fast ho jaate hain (Zomato jaise apps isko startup pe handle karte hain)

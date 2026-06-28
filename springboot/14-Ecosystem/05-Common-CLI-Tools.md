---
tags: [ecosystem, cli, tooling, jshell, sdkman]
aliases: [CLI Tools, Spring CLI, jshell, sdkman, jenv]
stage: foundation
---

# Common CLI Tools

> [!info] For the Express/TS dev
> Java doesn't have a single `npm`/`pnpm`-like CLI. Instead, you'll juggle a JDK manager (`sdkman` or `jenv`), the language REPL (`jshell`), and optional helpers like the Spring Boot CLI. Maven/Gradle handle dependencies — see [[01-Maven-Basics]], [[02-Gradle-Basics]].

## SDKMAN! — manage JDKs and Java tooling

The recommended way to install/switch JDK versions on macOS, Linux, and WSL.

```bash
curl -s "https://get.sdkman.io" | bash

# Install a JDK
sdk install java 21.0.5-tem            # Temurin 21
sdk install java 17.0.13-tem
sdk install java 21.0.5-graalce        # GraalVM CE

# Switch
sdk use java 21.0.5-tem                # this shell
sdk default java 21.0.5-tem            # globally

# Per-project pin
echo "java=21.0.5-tem" > .sdkmanrc
sdk env install
```

Also installs Maven, Gradle, kotlin, sbt, springboot CLI, etc.:

```bash
sdk install maven
sdk install gradle
sdk install springboot
```

## jenv (alternative)

Lighter, manages already-installed JDKs (doesn't download them):

```bash
brew install jenv
jenv add /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
jenv local 21.0.5    # writes .java-version
```

Use SDKMAN! if you want install + switch in one tool. Use jenv if you already manage JDKs via Homebrew/system packages.

## Windows: scoop / winget

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
# or
scoop install temurin21-jdk
```

For SDKMAN! on Windows, use WSL.

## jshell — the Java REPL

Built into JDK 9+. Yes, Java has a REPL:

```bash
$ jshell
|  Welcome to JShell -- Version 21
jshell> int x = 41
x ==> 41
jshell> x + 1
$2 ==> 42
jshell> List.of(1,2,3).stream().map(i -> i*i).toList()
$3 ==> [1, 4, 9]
jshell> /exit
```

Useful flags:

```bash
jshell --class-path target/classes              # play with your code
jshell --enable-preview --source 21
jshell my-script.jsh                            # run a script
```

## Spring Boot CLI

Quickly scaffold or run Groovy-based Spring scripts. Mostly superseded by [start.spring.io](https://start.spring.io) but handy:

```bash
sdk install springboot

spring init --dependencies=web,data-jpa,h2 my-app   # scaffold
cd my-app && ./mvnw spring-boot:run

spring run app.groovy        # run a single Groovy script as a Spring app
```

## start.spring.io (CLI usage)

You can curl the Initializr directly:

```bash
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.4.0 \
  -d javaVersion=21 \
  -d groupId=com.example \
  -d artifactId=orders-api \
  -d dependencies=web,data-jpa,validation,actuator,postgresql \
  -o orders-api.zip
unzip orders-api.zip
```

## The standard JDK CLI tools

Bundled with every JDK install:

| Tool | Purpose |
|------|---------|
| `java` | Run a class or JAR |
| `javac` | Compile (rarely used directly — Maven/Gradle do this) |
| `jar` | Build/inspect JARs |
| `jshell` | REPL |
| `jpackage` | Build native installers (.dmg, .msi, .deb) |
| `jdeps` | Dependency analyzer |
| `jdeprscan` | Detect deprecated API usage |
| `jlink` | Build custom JREs from modules |
| `keytool` | Manage keystores/certs |

## JVM diagnostics

| Tool | Purpose |
|------|---------|
| `jps` | List running JVMs |
| `jstack <pid>` | Thread dump |
| `jmap -dump:live,format=b,file=heap.hprof <pid>` | Heap dump |
| `jstat -gc <pid> 1s` | GC stats live |
| `jcmd <pid> <command>` | Swiss-army knife (heap dumps, JFR, GC, etc.) |
| `jfr` | Java Flight Recorder analysis |

Example:

```bash
jps -l
# 12345 com.example.OrdersApplication

jcmd 12345 GC.heap_info
jcmd 12345 JFR.start duration=60s filename=app.jfr
jcmd 12345 Thread.print
```

## httpie / curl for API testing

Same as Node — no Java-specific tool needed. `httpie` is great:

```bash
http :8080/api/orders Authorization:"Bearer $TOKEN"
http POST :8080/api/orders userId=1 total=99.99
```

## mvnw / gradlew — wrappers

Always commit `mvnw`, `mvnw.cmd`, `.mvn/` (or `gradlew`, `gradlew.bat`, `gradle/`) so anyone can build without installing Maven/Gradle:

```bash
./mvnw clean verify
./gradlew build
```

## Related
- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[06-IDE-Setup]]
- [[01-JDK-JRE-JVM-Basics]]

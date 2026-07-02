# Common CLI Tools

> [!info] Express/TS dev ke liye
> Java mein `npm`/`pnpm` jaisa ek single CLI nahi hota. Yahan tumhe alag-alag cheezein juggle karni padengi — JDK manager (`sdkman` ya `jenv`), language ka REPL (`jshell`), aur optional helpers jaise Spring Boot CLI. Dependencies ka kaam Maven/Gradle karte hain — dekho [[01-Maven-Basics]], [[02-Gradle-Basics]].

## SDKMAN! — JDK aur Java tooling manage karna

Kya hota hai? Socho SDKMAN! ko tum `nvm` ka Java version samjho — jaise `nvm` se tum Node ka version install/switch karte ho, waise hi SDKMAN! se JDK versions install aur switch karte ho. macOS, Linux, aur WSL pe yehi recommended tareeka hai.

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

`.sdkmanrc` wala part bilkul `.nvmrc` jaisa hai — project mein ek file daal do jisme Java version likha ho, aur team ka har banda `sdk env install` chala ke wahi version use karega. Consistency ke liye zaruri.

Best baat — SDKMAN! sirf JDK tak limited nahi hai, ye Maven, Gradle, Kotlin, sbt, springboot CLI sab install kar sakta hai:

```bash
sdk install maven
sdk install gradle
sdk install springboot
```

## jenv (alternative option)

Kya farak hai SDKMAN! se? jenv lighter hai — ye JDK download nahi karta, sirf jo pehle se tumhare system pe installed hain (Homebrew ya kahin aur se), unko manage karta hai aur switch karne mein help karta hai.

```bash
brew install jenv
jenv add /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
jenv local 21.0.5    # writes .java-version
```

Kaunsa use karein? Agar tumhe ek hi tool chahiye jo install bhi kare aur switch bhi — SDKMAN! use karo. Agar tum already Homebrew/system packages se JDKs manage karte ho aur bas switching ka layer chahiye — jenv use karo.

## Windows: scoop / winget

Windows pe SDKMAN! directly kaam nahi karta, toh yeh options hain:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
# or
scoop install temurin21-jdk
```

> [!tip] Agar tumhe SDKMAN! hi chahiye Windows pe, toh WSL install karo — usme Linux jaisa hi environment milega.

## jshell — Java ka REPL

Kya hota hai? Haan, Java ka bhi apna REPL hai — bilkul Node ke `node` REPL jaisa jahan tum quickly kuch line ka code test kar sakte ho bina poora project setup kiye. JDK 9+ mein built-in hai.

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

Kyun zaruri hai? Jab tumhe quickly ek stream operation, ek regex, ya koi chhoti si Java syntax test karni ho — poora Maven project banane ki zaroorat nahi, seedha `jshell` khol ke try karo, exactly jaise tum Node console mein `node` type karke kuch check karte ho.

Useful flags:

```bash
jshell --class-path target/classes              # play with your code
jshell --enable-preview --source 21
jshell my-script.jsh                            # run a script
```

`--class-path target/classes` wala flag kaafi handy hai — apne compiled project ki classes ko jshell session mein load karke unke saath directly khelo, bina naya test file banaye.

## Spring Boot CLI

Kya karta hai? Groovy-based Spring scripts ko jaldi scaffold ya run karne ke liye. Aaj kal zyada log [start.spring.io](https://start.spring.io) use karte hain (browser se), lekin CLI abhi bhi handy hai jab tumhe terminal se hi kaam nikalna ho.

```bash
sdk install springboot

spring init --dependencies=web,data-jpa,h2 my-app   # scaffold
cd my-app && ./mvnw spring-boot:run

spring run app.groovy        # run a single Groovy script as a Spring app
```

`spring init` bilkul `npm create vite@latest` jaisa hai — dependencies specify karo, project scaffold ho jaata hai.

## start.spring.io (CLI usage)

Kya hota hai? Initializr ko browser mein khole bina, seedha `curl` se hit kar sakte ho — CI scripts ya automation mein kaafi useful hai.

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

Socho isse jaise `npm create` ka ek HTTP API version — same scaffolding, bas curl se trigger hoti hai.

## Standard JDK CLI tools

Yeh sab tools har JDK install ke saath free mein aate hain — kuch bhi extra install nahi karna padta:

| Tool | Purpose |
|------|---------|
| `java` | Class ya JAR run karna |
| `javac` | Compile karna (directly kam hi use hota hai — Maven/Gradle yeh kaam khud karte hain) |
| `jar` | JARs build/inspect karna |
| `jshell` | REPL |
| `jpackage` | Native installers banana (.dmg, .msi, .deb) |
| `jdeps` | Dependency analyzer |
| `jdeprscan` | Deprecated API usage detect karna |
| `jlink` | Modules se custom JREs banana |
| `keytool` | Keystores/certs manage karna |

## JVM diagnostics

Kyun zaruri hai? Production mein jab app slow ho jaaye, memory leak ho, ya hang ho jaaye — yeh tools batate hain JVM ke andar chal kya raha hai. Node ke duniya mein isko `clinic.js` ya Chrome DevTools ke profiler se compare kar sakte ho.

| Tool | Purpose |
|------|---------|
| `jps` | Running JVMs ki list |
| `jstack <pid>` | Thread dump |
| `jmap -dump:live,format=b,file=heap.hprof <pid>` | Heap dump |
| `jstat -gc <pid> 1s` | GC stats live dekhna |
| `jcmd <pid> <command>` | Swiss-army knife (heap dumps, JFR, GC, sab kuch) |
| `jfr` | Java Flight Recorder analysis |

Example — jaise Zomato ke backend mein ek order-service JVM hang ho gaya ho aur tumhe pata karna ho ki kya chal raha hai:

```bash
jps -l
# 12345 com.example.OrdersApplication

jcmd 12345 GC.heap_info
jcmd 12345 JFR.start duration=60s filename=app.jfr
jcmd 12345 Thread.print
```

`jcmd` sabse zyada useful hai — ek hi tool se GC info, thread dump, aur Flight Recorder sab operate kar sakte ho, PID pakad ke.

## httpie / curl API testing ke liye

Yahan Node se koi farak nahi — Java-specific koi tool nahi chahiye. Postman/Insomnia jaisa hi kaam `httpie` se terminal pe ho jaata hai:

```bash
http :8080/api/orders Authorization:"Bearer $TOKEN"
http POST :8080/api/orders userId=1 total=99.99
```

## mvnw / gradlew — wrappers

Kyun zaruri hai? Socho yeh Node ke `package-lock.json` jaisa concept hai, bas dependencies ke liye nahi — build tool ke version ke liye. `mvnw`/`gradlew` wrapper scripts commit karne se koi bhi teammate project clone karke seedha build kar sakta hai, bina apne system pe Maven/Gradle install kiye. Isliye `mvnw`, `mvnw.cmd`, `.mvn/` (ya `gradlew`, `gradlew.bat`, `gradle/`) hamesha commit karo:

```bash
./mvnw clean verify
./gradlew build
```

> [!warning] Agar `mvnw`/`gradlew` ko `.gitignore` mein daal diya, toh naya developer clone karte hi stuck ho jaayega — usse manually Maven/Gradle install karna padega. Ye bilkul waisa hi hai jaise koi `node_modules` commit kar de ya `package-lock.json` hi delete kar de.

## Key Takeaways

- SDKMAN! = Java duniya ka `nvm` — JDK install aur switch karne ke liye go-to tool (macOS/Linux/WSL).
- jenv lighter alternative hai jab JDKs already installed hain aur bas switching layer chahiye.
- Windows pe direct SDKMAN! nahi chalta — `winget`/`scoop` use karo, ya WSL le lo.
- `jshell` Java ka REPL hai — Node console jaisa quick experimentation ke liye.
- Spring Boot CLI aur `start.spring.io` curl API dono scaffolding ke liye handy hain — `npm create` jaisa flow.
- JDK ke saath free mein `java`, `javac`, `jar`, `jpackage`, `jdeps`, `jlink`, `keytool` jaise tools milte hain.
- JVM diagnostics tools (`jps`, `jstack`, `jmap`, `jstat`, `jcmd`, `jfr`) production debugging ke liye zaruri hain — `jcmd` sabse versatile hai.
- `mvnw`/`gradlew` wrapper scripts hamesha commit karo — bina isse team ka build reproducible nahi rahega.

## Related
- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[06-IDE-Setup]]
- [[01-JDK-JRE-JVM-Basics]]

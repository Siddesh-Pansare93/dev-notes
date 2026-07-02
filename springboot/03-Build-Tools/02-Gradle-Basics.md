# Gradle Basics

Socho ek second ke liye — Swiggy ka backend kitna bada hoga. Hundreds of microservices, thousands of Java files, dozens of teams. Har team apna code likhti hai, phir sab ko ek saath compile karo, test karo, aur production pe deploy karo. Yeh sab manually karna? Impossible. Yahan aata hai Gradle — Java world ka sabse powerful build tool.

Agar tum Node.js se aaye ho, toh `package.json` + `npm scripts` + `webpack` — yeh sab ek jagah mila ke jitna power milti hai, Gradle uss se kaafi zyada deta hai, aur bhi intelligent tarike se.

> [!info] Node.js dev ke liye ek line mein
> Gradle = `package.json` + `npm scripts` + build cache + task dependency graph, sab ek jagah — aur build file actual code hai (Kotlin ya Groovy), koi XML nahi.

---

## Gradle vs Maven — Asli Fark Kya Hai?

Pehle Maven ke baare mein ek line: Maven bolta hai "describe karo kya chahiye, main standard tarike se kar dunga." Gradle bolta hai "define karo task graph, aur Kotlin mein likho exactly kya karna hai."

Practical fark:

- **Maven** — XML-based, opinionated, convention-heavy. Simple projects ke liye perfect.
- **Gradle** — DSL-based (Kotlin/Groovy), flexible, programmable. Complex builds ke liye built.

Zomato jaisi company ke liye jahan custom code generation, multi-language builds (Java + Kotlin), aur complex packaging hoti hai — Gradle Maven se bahut better fit hai.

Node.js analogy: Maven waisa hai jaise `create-react-app` — sab kuch preset. Gradle waisa hai jaise apna `webpack.config.js` khud likhna — full control, full responsibility.

---

## Project Layout — Files Kahan Jaati Hain?

Gradle Maven ka standard layout use karta hai by default. Iska matlab hai agar tum Maven jaante ho, toh directory structure same hi hai:

```
my-app/
├── build.gradle.kts          ← Kotlin DSL build file (recommended)
├── build.gradle              ← Groovy DSL build file (purana tarika)
├── settings.gradle.kts       ← project ka naam, sub-projects
├── gradle.properties         ← Gradle configuration flags
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties   ← exact Gradle version pin
├── gradlew                   ← Unix wrapper script
├── gradlew.bat               ← Windows wrapper script
└── src/
    ├── main/
    │   ├── java/             ← tumhara application code
    │   └── resources/        ← application.properties, etc.
    └── test/
        ├── java/             ← test classes
        └── resources/        ← test configs
```

> [!tip] Hamesha `./gradlew` use karo, `gradle` command nahi
> `gradlew` (Gradle Wrapper) ek script hai jo automatically sahi version ka Gradle download karta hai. Matlab tumhare machine pe globally Gradle install nahi hona chahiye. Naya developer aaya? Bas `./gradlew build` chalao — woh khud sab setup kar lega. Exactly waisa jaise Node mein `package.json` ka `engines.node` field, but much more reliable.

---

## `build.gradle.kts` ka Anatomy — Ek Ek Block Samjho

Yeh file tumhare project ki backbone hai. Jaise Swiggy ke order system mein ek main config hoti hai jo define karti hai ki kaise build karna hai, kaise test karna hai, aur kahan se dependencies leni hain — yahi kaam `build.gradle.kts` karta hai.

```kotlin
// Spring Boot + JPA ke liye ek typical build file

plugins {
    // Java plugin — compileJava, test, jar tasks deta hai
    java

    // Spring Boot plugin — bootRun, bootJar tasks deta hai
    id("org.springframework.boot") version "3.3.4"

    // Spring ka dependency management — version conflicts handle karta hai
    id("io.spring.dependency-management") version "1.1.6"
}

// Project coordinates — Maven ke groupId/artifactId/version jaisa
group = "com.acme"
version = "1.0.0-SNAPSHOT"

// Java version pin — tumhare machine pe jo bhi Java ho, build Java 21 use karega
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

// Dependencies kahan se download hogi — Maven Central = npm registry jaisa
repositories {
    mavenCentral()
}

// Actual dependencies — npm install jaisa
dependencies {
    // Web layer — REST APIs ke liye
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Database layer — JPA/Hibernate ke liye
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // PostgreSQL driver — runtime pe chahiye, compile pe nahi
    runtimeOnly("org.postgresql:postgresql")

    // Test framework — sirf test ke waqt chahiye
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

// Test runner configure karo — JUnit 5 platform use karo
tasks.test {
    useJUnitPlatform()
}
```

Yeh har block kya karta hai, ek table mein:

| Block | Kya karta hai | Maven mein equivalent |
|-------|--------------|----------------------|
| `plugins` | Build plugins apply karo (Java, Spring Boot, etc.) | `<build><plugins>` in pom.xml |
| `group`/`version` | Project coordinates define karo | `<groupId>`/`<version>` |
| `java { toolchain }` | Java version lock karo | `<maven.compiler.release>` |
| `repositories` | Dependency sources — Maven Central, JitPack, etc. | (Maven Central implicit rehta hai) |
| `dependencies` | Libraries add karo | `<dependencies>` block |
| `tasks.<name>` | Built-in tasks configure karo | Plugin `<configuration>` block |

---

## Dependency Configurations — Matlab Kya Hai?

Node.js mein `dependencies` aur `devDependencies` hoti hain. Gradle mein yeh concept zyada granular hai — 6+ configurations hain, har ek ka specific meaning hai.

| Gradle Configuration | Maven Scope | Kab use karo |
|---------------------|-------------|-------------|
| `implementation` | `compile` | Default choice — compile + runtime dono pe chahiye |
| `api` | `compile` | Library bana rahe ho jo doosre use karenge — dependency expose hoti hai |
| `compileOnly` | `provided` | Sirf compile pe chahiye, JAR mein nahi (jaise Lombok annotations) |
| `runtimeOnly` | `runtime` | Sirf runtime pe chahiye, compile pe nahi (jaise JDBC drivers) |
| `testImplementation` | `test` | Sirf test code ke liye (JUnit, Mockito) |
| `testRuntimeOnly` | `test+runtime` | Test runtime ke liye (jaise H2 in-memory DB) |
| `annotationProcessor` | (special) | Annotation processors — Lombok, MapStruct |
| `developmentOnly` | (Spring Boot) | Sirf development ke liye — DevTools, LiveReload |

```kotlin
dependencies {
    // App ka core logic — Web layer
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Lombok — compile pe annotations process karta hai, JAR mein nahi jaata
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // PostgreSQL driver — app run hone pe chahiye, compile pe nahi
    runtimeOnly("org.postgresql:postgresql")

    // Dev mein hot reload ke liye — production build mein nahi jaata
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // Testing ke liye
    testImplementation("org.springframework.boot:spring-boot-starter-test")

    // Integration tests ke liye real PostgreSQL container
    testImplementation("org.testcontainers:postgresql:1.20.1")
    testImplementation("org.testcontainers:junit-jupiter:1.20.1")
}
```

> [!tip] `implementation` vs `api` — practically samjho
> Agar tum ek library likh rahe ho jisko doosre developers apne project mein use karenge, tab `api` use karo — iska matlab tumhari dependency unke classpath pe bhi aayegi. Agar sirf apna application likh rahe ho (jo most cases mein hota hai), hamesha `implementation` use karo. Faster builds milte hain kyunki downstream projects ko recompile nahi karna padta.

---

## Tasks — Gradle Ka Dil

Gradle mein sab kuch ek **task** hai. `compileJava` ek task hai, `test` ek task hai, `bootRun` ek task hai, `clean` ek task hai. Har task ke inputs hote hain, outputs hote hain, aur doosre tasks pe dependencies hoti hain.

Yeh waisa hai jaise Zomato ka order pipeline — pehle restaurant confirm karta hai, phir rider pickup karta hai, phir delivery hoti hai. Har step ek task, aur ek task doosre ke baad hi chalta hai.

### Commonly Used Commands

```bash
# Sabse important commands — yeh yaad rakhna

./gradlew tasks                    # available tasks ki list dekhna
./gradlew build                    # compile + test + assemble (sabse common)
./gradlew bootRun                  # Spring Boot app run karo (dev mein)
./gradlew test                     # sirf tests chalao
./gradlew clean build              # fresh build — sab kuch clean karke phir build

# Specific test chalana
./gradlew test --tests UserServiceTest
./gradlew test --tests "com.acme.service.*"  # package ke sab tests

# Dependency related
./gradlew dependencies                              # full dependency tree
./gradlew dependencyInsight --dependency jackson    # specific lib kahan se aa rahi hai

# Debug mode — kuch kaam na kare toh
./gradlew build --info             # zyada output
./gradlew build --debug            # bahut zyada output
./gradlew build --scan             # Gradle Build Scan (browser mein detailed report)

# Cache bypass — stale cache ki wajah se issues ho toh
./gradlew clean build --rerun-tasks
```

### Task Lifecycle — Maven Phase Se Comparison

Agar tum Maven ke lifecycle (`compile` → `test` → `package` → `install`) ke baare mein jaante ho:

| Maven Phase | Gradle Task | Kya karta hai |
|------------|-------------|--------------|
| `clean` | `clean` | `build/` directory delete karo |
| `compile` | `compileJava` | `.java` files ko `.class` mein compile karo |
| `test` | `test` | Unit tests chalao |
| `package` | `assemble` / `bootJar` | JAR/WAR banao |
| `verify` | `check` | Tests + code quality checks |
| `install` | `publishToMavenLocal` | Local Maven cache mein install karo |
| `deploy` | `publish` | Remote repository pe publish karo |
| (all) | `build` | `assemble` + `check` — sab kuch |

---

## Groovy DSL vs Kotlin DSL — Kaun Sa Chunna Chahiye?

Gradle mein do tarike hain build file likhne ke — Groovy (`.gradle`) aur Kotlin (`.gradle.kts`).

**Groovy DSL** (purana, `build.gradle`):

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.4'
    id 'io.spring.dependency-management' version '1.1.6'
}

group = 'com.acme'
version = '1.0.0-SNAPSHOT'
sourceCompatibility = '21'

repositories { mavenCentral() }

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    runtimeOnly 'org.postgresql:postgresql'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

tasks.named('test') { useJUnitPlatform() }
```

**Kotlin DSL** (naya, recommended, `build.gradle.kts`):

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.acme"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.named<Test>("test") { useJUnitPlatform() }
```

> [!tip] Naye projects ke liye Kotlin DSL chunna
> Kotlin DSL statically typed hai — IntelliJ mein autocomplete milta hai, typos compile time pe pakde jaate hain, aur refactoring support bahut better hai. Groovy DSL dynamic hai — typos runtime pe fail hote hain. Agar tum TypeScript se aaye ho, Kotlin DSL ka vibe bahut familiar lagega.

---

## Custom Tasks — Apne Scripts Likhna

Node.js mein `package.json` ke `scripts` section mein custom commands likhte ho:

```json
{
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/"
  }
}
```

Gradle mein custom tasks likhte ho:

```kotlin
// Simple task — ek message print karo
tasks.register("hello") {
    doLast {
        println("Namaste from ${project.name}!")
    }
}
```

```bash
./gradlew hello
# Output: Namaste from my-app!
```

Zyada useful example — files copy karna aur JAR se pehle run karna:

```kotlin
// Config files build directory mein copy karo
tasks.register<Copy>("copyConfig") {
    description = "Config files ko dist mein copy karo"
    group = "build"                           // tasks list mein kahan dikhega

    from("config")                            // source directory
    into(layout.buildDirectory.dir("dist/config"))  // destination
}

// bootJar chalane se pehle copyConfig chalega
tasks.named("bootJar") {
    dependsOn("copyConfig")
}
```

Task wiring — inputs, outputs declare karo taaki incremental builds kaam karein:

```kotlin
tasks.register("generateApiDocs") {
    // Inputs — yeh change hone pe task re-run hoga
    inputs.dir("src/main/java")
    inputs.file("src/main/resources/openapi.yaml")

    // Outputs — yeh generate hota hai
    outputs.dir(layout.buildDirectory.dir("api-docs"))

    doLast {
        println("API docs generate ho rahi hain...")
        // actual generation logic
    }
}
```

---

## `settings.gradle.kts` — Project Ka Naam Aur Sub-Projects

```kotlin
// Project ka naam define karo
rootProject.name = "zomato-backend"

// Multi-module project ke liye sub-modules include karo
include("api-gateway", "order-service", "delivery-service", "payment-service")
```

Yeh file Gradle sabse pehle padhta hai — isi se pata chalta hai ki project single module hai ya multi-module. Multi-module projects ke liye alag detailed notes hain.

---

## `gradle.properties` — Performance Settings

Yeh file Gradle ka behavior tune karti hai. IRCTC jaise high-traffic systems mein jaise database connections pool karte hain performance ke liye, usi tarah Gradle ke liye bhi settings hain:

```properties
# Daemon — JVM ek baar start hoti hai, baar baar nahi
org.gradle.daemon=true

# Build cache — unchanged tasks ke outputs dobara use karo
org.gradle.caching=true

# Independent tasks parallel chalao
org.gradle.parallel=true

# Sirf zaruri sub-projects configure karo
org.gradle.configureondemand=true

# Gradle daemon ko 2GB RAM do (bade projects ke liye)
org.gradle.jvmargs=-Xmx2g -XX:+HeapDumpOnOutOfMemoryError

# Console output colorful karo
org.gradle.console=rich
```

---

## Build Cache aur Daemon — Gradle Ki Speed Ka Raaz

### Gradle Daemon

Jab tum pehli baar `./gradlew build` chalate ho, ek JVM process start hoti hai. Woh process background mein chalti rehti hai. Doosri baar `./gradlew build` chalate ho — no JVM startup time. Bas kaam karta hai.

Yeh waisa hai jaise tumhara Node.js dev server hot-reload ke saath chal raha ho — recompile fast hota hai kyunki process already memory mein hai.

### Build Cache (Incremental Builds)

Yeh Gradle ki superpower hai. Har task ke inputs (source files, configurations) ka hash calculate hota hai. Agar inputs same hain, toh task phir se run nahi karta — bas cached output use karta hai.

```
Task :compileJava UP-TO-DATE      ← kuch nahi badla, skip
Task :processResources UP-TO-DATE ← same
Task :test UP-TO-DATE             ← tests cached hain
Task :bootJar                     ← yeh naya hai, chalega
```

Yeh CI/CD mein bahut kaam aata hai — ek developer ka build cache doosre developers ke saath share ho sakta hai (remote build cache).

---

## Complete `build.gradle.kts` — Production-Ready Example

Ek real Spring Boot app ka build file, jaise Paytm ya CRED ka koi microservice hoga:

```kotlin
import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    java

    // Spring Boot — bootRun, bootJar, bootBuildImage tasks
    id("org.springframework.boot") version "3.3.4"

    // Dependency version management — BOM se versions manage hoti hain
    id("io.spring.dependency-management") version "1.1.6"

    // Code formatting — Google Java Format enforce karta hai
    id("com.diffplug.spotless") version "6.25.0"
}

group = "com.acme"
version = "1.0.0-SNAPSHOT"

// Java toolchain — machine pe jo bhi Java ho, yeh Java 21 use karega
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // === Application Dependencies ===

    // Web layer — REST endpoints ke liye (Tomcat embedded)
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Database layer — JPA + Hibernate
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Validation — @Valid, @NotNull, @Email annotations
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Security — JWT, OAuth2 ke liye base
    implementation("org.springframework.boot:spring-boot-starter-security")

    // Actuator — health checks, metrics (/actuator/health)
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Lombok — boilerplate reduce karta hai (@Getter, @Builder, etc.)
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // === Runtime Dependencies ===

    // PostgreSQL JDBC driver
    runtimeOnly("org.postgresql:postgresql")

    // === Development Only ===

    // Hot reload — code change pe automatically restart
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // === Test Dependencies ===

    // Spring Boot test utilities + JUnit 5 + Mockito
    testImplementation("org.springframework.boot:spring-boot-starter-test")

    // Real PostgreSQL for integration tests (Docker container spin up karta hai)
    testImplementation("org.testcontainers:postgresql:1.20.1")
    testImplementation("org.testcontainers:junit-jupiter:1.20.1")

    // Lombok for tests bhi
    testCompileOnly("org.projectlombok:lombok")
    testAnnotationProcessor("org.projectlombok:lombok")
}

// === Test Configuration ===
tasks.withType<Test> {
    useJUnitPlatform()

    // Test profile use karo — application-test.properties load hogi
    systemProperty("spring.profiles.active", "test")

    // Test output format improve karo
    testLogging {
        events("passed", "skipped", "failed")
    }
}

// === JAR Configuration ===
tasks.withType<BootJar> {
    // Default naam "my-app-1.0.0-SNAPSHOT.jar" se "app.jar" kar do
    // Docker mein helpful — Dockerfile simple rehti hai
    archiveFileName.set("app.jar")
}

// === Code Quality ===
spotless {
    java {
        // Google Java Format enforce karo
        googleJavaFormat("1.22.0").aosp()
        removeUnusedImports()
        importOrder()
    }
}

// === Custom Tasks ===

// Build info generate karo — app.properties mein version/git info
tasks.register("buildInfo") {
    val outputDir = layout.buildDirectory.dir("resources/main")
    outputs.dir(outputDir)

    doLast {
        val propsFile = outputDir.get().file("build-info.properties").asFile
        propsFile.writeText("""
            build.version=${project.version}
            build.time=${java.time.Instant.now()}
        """.trimIndent())
    }
}

// processResources se pehle buildInfo chalega
tasks.named("processResources") {
    dependsOn("buildInfo")
}
```

---

## Node.js ↔ Gradle — Side-by-Side Comparison

Kyunki tum TypeScript/Node.js se aaye ho, yeh comparison helpful hoga:

| Concept | npm / TypeScript | Gradle |
|---------|-----------------|--------|
| Manifest file | `package.json` | `build.gradle.kts` |
| Custom scripts | `"scripts": { "build": "tsc" }` | `tasks.register("build") { ... }` |
| Dependency lock | `package-lock.json` | `gradle.lockfile` (opt-in) |
| Tool version pin | `engines.node` in package.json | `gradle/wrapper/gradle-wrapper.properties` |
| Monorepo/workspaces | `workspaces` in package.json | `include("a", "b")` in settings.gradle |
| Task dependencies | Sequential scripts (no DAG) | `dependsOn` / `mustRunAfter` — full DAG |
| Build caching | No native caching | Local + Remote build cache |
| Long-running process | (no equivalent) | Gradle Daemon |
| Install deps | `npm install` | `./gradlew dependencies` (auto on build) |
| Run app | `npm start` / `node index.js` | `./gradlew bootRun` |
| Build for prod | `npm run build` | `./gradlew build` |
| Run tests | `npm test` | `./gradlew test` |
| Publish package | `npm publish` | `./gradlew publish` |

---

## Gotchas — Yeh Mistakes Mat Karna

> [!warning] Configuration Phase vs Execution Phase
> Build file ka top-level code *configuration phase* mein chalta hai — yani **har** `./gradlew` command pe, chahe ek simple task bhi chalaao. Heavy work (file reading, network calls) `doLast { }` ke andar rakho, jo sirf tab chalta hai jab task actually execute ho.
>
> ```kotlin
> // GALAT — configuration phase mein heavy work
> tasks.register("badTask") {
>     val data = File("big-file.json").readText()  // har build pe chalega!
>     doLast { println(data) }
> }
>
> // SAHI — execution phase mein
> tasks.register("goodTask") {
>     doLast {
>         val data = File("big-file.json").readText()  // sirf tab jab task chale
>         println(data)
>     }
> }
> ```

> [!warning] `compile` configuration gone hai — Gradle 7+ mein
> Purani tutorials mein `compile 'org.something:lib'` dikhega. Yeh deprecated aur remove ho gaya hai. Hamesha `implementation` use karo. Agar code kisi purani project mein yeh dekhe toh update karo.

> [!warning] `dependsOn` mein string se zyada typed reference better hai
> ```kotlin
> // THEEK hai lekin string typo runtime pe fail hoga
> tasks.named("bootJar") { dependsOn("copyConfig") }
>
> // BETTER — compile time pe typo pakda jayega
> val copyConfigTask = tasks.named("copyConfig")
> tasks.named("bootJar") { dependsOn(copyConfigTask) }
> ```

> [!warning] SNAPSHOT dependencies — stale ho sakti hain
> `1.0.0-SNAPSHOT` dependencies daily refresh hoti hain by default. CI pe unexpected failures aa sakte hain agar snapshot ka naya version break kar de. Production projects mein stable versions pin karo.

> [!warning] `.gradle/` directory commit mat karo
> `.gradle/` local cache hai — `.gitignore` mein hona chahiye. Lekin `gradle/wrapper/` directory zaroor commit karo — isme Gradle version pin hoti hai. Bahut common mistake hai naye developers ki.

> [!warning] Daemon memory — bade projects mein OOM
> Default daemon memory kaafi choti hoti hai. Bade projects mein daemon crash ho sakta hai. `gradle.properties` mein set karo:
> ```properties
> org.gradle.jvmargs=-Xmx2g -XX:+HeapDumpOnOutOfMemoryError
> ```

> [!warning] Build script vs application classpath — mix mat karo
> `buildscript {}` ya `plugins {}` block mein sirf build tools jaate hain (Gradle plugins, etc.). App ki runtime dependencies wahan nahi jaati. Yeh common confusion hai naye developers mein.

---

## Key Takeaways

- **Gradle = task graph** — sab kuch tasks hain, tasks ke inputs/outputs hote hain, tasks ek doosre pe depend karte hain
- **Kotlin DSL use karo** naye projects ke liye — static typing, better IDE support, TypeScript developers ke liye familiar feel
- **`./gradlew` hamesha** — globally Gradle install karne ki zarurat nahi, wrapper sab sambhal leta hai
- **Configurations samjho** — `implementation`, `compileOnly`, `runtimeOnly`, `testImplementation` — har ek ka alag matlab hai aur galat use karne se classpath issues aate hain
- **Daemon + caching ON rakho** `gradle.properties` mein — builds dramatically fast hote hain
- **Configuration vs execution phase** — heavy work `doLast { }` ke andar, kabhi bhi top-level nahi
- **`.gradle/` gitignore karo, `gradle/wrapper/` commit karo** — dono alag hain
- **`compile` deprecated hai** — `implementation` use karo Gradle 7+ mein

---

## Related

- [Maven Basics](01-Maven-Basics.md)
- [Maven vs Gradle](03-Maven-vs-Gradle.md)
- [Dependency Management](04-Dependency-Management.md)
- [Multi-Module Projects](05-Multi-Module-Projects.md)
- [Common Plugins](06-Common-Plugins.md)

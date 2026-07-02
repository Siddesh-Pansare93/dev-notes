# Maven vs Gradle — Kaun Sa Tool Pick Karo Aur Kyun?

Socho ek second ke liye — tu ek nayi Spring Boot project shuru karna chahta hai. `start.spring.io` khola, sab kuch set kar raha hai, aur pehla hi sawaal aata hai: **Maven ya Gradle?**

Ye decision chhoti nahi hai. Build tool woh engine hai jo teri poori project ko chalaata hai — dependencies download karta hai, code compile karta hai, tests run karta hai, aur final JAR/WAR banata hai. Node.js mein tune `npm` ya `yarn` use kiya hoga, wo tere liye `package.json` handle karta tha. Java world mein Maven aur Gradle wahi kaam karte hain — lekin dono ki apni alag philosophy hai, aur dono ke trade-offs samajhna padenge.

Is note mein hum dono ko side-by-side dekhenge — syntax, performance, gotchas, aur real projects mein kab kya use karna chahiye.

---

## Pehle Samjho — Ye Tools Kya Problem Solve Karte Hain?

Node.js mein tera `package.json` kuch aisa dikhta tha:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0"
  },
  "scripts": {
    "start": "node index.js",
    "build": "tsc"
  }
}
```

`npm install` karo — sab libraries aa jaati hain. `npm run build` karo — TypeScript compile ho jaata hai.

Java mein ye same kaam build tools karte hain, lekin zyada structured tarike se. Kyunki Java ecosystem mein:
- Libraries ko **Maven Central** se download karna padta hai (npm registry jaisi cheez)
- Code **compile** karna padta hai before running (TypeScript ki tarah, but mandatory)
- Tests run karne ka ek defined lifecycle hota hai
- Final output ek **JAR file** hoti hai jo anywhere deploy ho sakti hai

**Maven** aur **Gradle** dono yahi sab karte hain. Fark hai approach mein.

---

## TL;DR — Kab Kya Pick Karo

Seedha answer chahiye? Yahan hai:

| Situation | Recommendation |
|-----------|----------------|
| Nayi Spring Boot project, pehli baar seekh raha hai | **Maven** — zero confusion |
| `start.spring.io` se project generate karna | **Maven** — default wahi hota hai |
| Library publish karni hai Maven Central pe | **Maven** (ya Gradle, dono kaam karte hain) |
| Bada monorepo, multiple modules | **Gradle** — build cache ka fayda milega |
| Custom code generation, multi-language build | **Gradle** — task graph zyada flexible hai |
| Android app | **Gradle only** — Maven ka option nahi hai |
| Build time matter karta hai (large project) | **Gradle** — incremental builds |
| Team already koi ek use kar raha hai | Jo team use kare, wahi |

---

## Side-by-Side: Ek Hi Project, Do Alag Files

Maan lo tune Zomato ka backend Spring Boot mein banana hai. Basic setup dono tools mein kuch aisa lagega:

### Maven — `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <!-- Project ki identity — npm ka "name" + "version" jaisa -->
    <groupId>com.zomato</groupId>
    <artifactId>order-service</artifactId>
    <version>1.0.0</version>

    <!-- Spring Boot ka parent POM — iske through version management aata hai -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>

    <!-- Java version set karo -->
    <properties>
        <java.version>21</java.version>
    </properties>

    <!-- Dependencies — npm ke "dependencies" jaisa -->
    <dependencies>
        <!-- Web API banana hai toh ye chahiye -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Testing ke liye — scope:test matlab sirf tests mein use hoga -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- Build plugins -->
    <build>
        <plugins>
            <!-- Ye plugin `mvn spring-boot:run` aur fat JAR banana enable karta hai -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### Gradle — `build.gradle.kts` (Kotlin DSL)

```kotlin
// Plugins declare karo — Maven ke plugins section jaisa
plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

// Project identity
group = "com.zomato"
version = "1.0.0"

// Java toolchain — JDK version specify karna
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

// Kahan se dependencies download hongi
repositories {
    mavenCentral()
}

// Dependencies — Maven jaisi, but compact syntax
dependencies {
    // "implementation" = normal dependency (Maven ka "compile" scope)
    implementation("org.springframework.boot:spring-boot-starter-web")

    // "testImplementation" = sirf tests ke liye (Maven ka "test" scope)
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

// JUnit 5 use karo tests mein
tasks.test {
    useJUnitPlatform()
}
```

**Notice karo:** Maven ka `pom.xml` ~30 lines ka hai, Gradle ka `build.gradle.kts` ~25 lines ka. Fark lines mein nahi, philosophy mein hai. Gradle ki file **actual code** hai — IDE autocomplete karta hai, if-else likh sakte ho, functions bana sakte ho. Maven ka XML sirf **declaration** hai — flexible nahi, lekin predictable hai.

---

## Feature-by-Feature Comparison — Zomato vs Swiggy Ki Tarah

Jaise Zomato aur Swiggy dono food deliver karte hain lekin differently — Maven aur Gradle dono build karte hain lekin differently:

| Feature | Maven | Gradle |
|---------|-------|--------|
| **Build file format** | `pom.xml` (XML) | `build.gradle.kts` (Kotlin) ya `build.gradle` (Groovy) |
| **Philosophy** | Convention + Declaration | Programmable Task Graph |
| **Seekhne mein time** | Kam — XML readable hai | Zyada — especially jab debugging karo |
| **Cold build speed** | Maven ke barabar | Gradle ke barabar |
| **Warm build speed (kuch changes ke baad)** | Sab kuch re-run karta hai | Incremental — sirf jo change hua wahi run karta hai |
| **IDE support** | Excellent (IntelliJ, Eclipse, VS Code) | IntelliJ mein excellent, baaki mein thoda weak |
| **Plugin ecosystem** | Mature, stable | Bada, diverse |
| **Custom build steps** | Awkward — plugin likhna padta hai | Easy — bas ek task likhdo |
| **Multi-module projects** | Parent POM + `<modules>` | `settings.gradle` + sub-projects |
| **Build cache** | Nahi hai | Hai — local + remote |
| **Broken build debug** | Easy — XML static hai, dynamic nahi | Mushkil — config phase logic complex ho sakta hai |
| **Android support** | Nahi | Haan — Android ka official tool |

---

## Dependency Syntax — Teen Flavors

Ek hi dependency ko teeno tarico se likhte hain — PostgreSQL driver example ke saath:

```xml
<!-- Maven pom.xml — verbose but clear -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
    <!-- version Spring Boot parent se automatically manage hogi -->
</dependency>
```

```kotlin
// Gradle Kotlin DSL (build.gradle.kts) — type-safe, IDE friendly
runtimeOnly("org.postgresql:postgresql")
// Format: "groupId:artifactId" — version BOM se manage hoti hai
```

```groovy
// Gradle Groovy DSL (build.gradle) — older style, still common
runtimeOnly 'org.postgresql:postgresql'
```

**Dependency scopes ka mapping samjho** (ye gotcha hai, neeche bhi cover karenge):

| Maven scope | Gradle configuration | Kab use karo |
|-------------|---------------------|--------------|
| `compile` (default) | `implementation` | Normal dependency |
| `test` | `testImplementation` | Sirf tests ke liye |
| `runtime` | `runtimeOnly` | Runtime pe chahiye, compile pe nahi |
| `provided` | `compileOnly` | Compile ke liye chahiye, runtime pe server provide karega |
| `optional` | `compileOnly` (manually) | Optional feature |

---

## Common Commands — npm Scripts Ki Tarah Yaad Karo

Node.js mein `npm run build`, `npm test` run karte the. Java mein waise hi karo:

| Kaam kya karna hai | Maven command | Gradle command |
|---------------------|---------------|----------------|
| Clean (purana build hatao) | `mvn clean` | `./gradlew clean` |
| Sirf compile karo | `mvn compile` | `./gradlew compileJava` |
| Tests run karo | `mvn test` | `./gradlew test` |
| Final JAR banao | `mvn package` | `./gradlew build` |
| Spring Boot app run karo | `mvn spring-boot:run` | `./gradlew bootRun` |
| Dependency tree dekho | `mvn dependency:tree` | `./gradlew dependencies` |
| Build karo tests skip karke | `mvn package -DskipTests` | `./gradlew build -x test` |
| Ek specific test run karo | `mvn test -Dtest=OrderTest` | `./gradlew test --tests OrderTest` |
| Local Maven repo mein install karo | `mvn install` | `./gradlew publishToMavenLocal` |
| Saaf karo aur build karo (common combo) | `mvn clean install` | `./gradlew clean build` |

> [!tip] Gradle Wrapper Ka Use Karo
> `./gradlew` use karo, sirf `gradle` nahi. Wrapper ek script hai jo specific Gradle version download karke use karta hai — isse sab log same version pe kaam karte hain. `gradle` command system-installed version use karta hai jo alag ho sakta hai.
>
> Maven mein `mvnw` wrapper hota hai — same concept.

---

## Performance Reality Check — Kyun Gradle Faster Hai?

Maan lo Swiggy ka backend build ho raha hai — 50 modules, hazaron classes. `mvn clean install` run karo aur coffee banaane chale jao. Ye frustration real hai.

**Cold build (pehli baar):**
- Maven aur Gradle roughly same time lete hain
- Dono ko same kaam karna hai — compile, test, package

**Warm build (kuch files change karke dubara build):**
- **Maven**: "Main sab kuch dobara run karunga, chahe kuch change hua ya nahi"
- **Gradle**: "Dekho kya change hua. Sirf wahi tasks run karunga jo affected hain"

Ye difference kuch aise hota hai real projects mein:
- Maven: 3-4 minute every time
- Gradle: 20-30 seconds (agar thoda change hua hai)

**Gradle ka secret sauce:**
1. **Incremental compilation** — sirf changed classes recompile hoti hain
2. **Build daemon** — JVM background mein chalta rehta hai, har build pe restart nahi hota
3. **Build cache** — ek baar build hua output cache ho jaata hai; agar inputs same hain toh cache se use karo
4. **Remote cache** — CI pe ek developer ka build cache doosre ke kaam aa sakta hai

> [!info] Kab Performance Matter Karta Hai?
> Chhote projects mein (ek-do modules) dono roughly same lagte hain. Jab project bada ho — 20+ modules, bade teams — tab Gradle ka fayda clearly dikhta hai. Learning ke liye Maven bilkul theek hai.

---

## Gradle Ka Task Graph — Ye Unique Concept Samjho

Maven ek **fixed lifecycle** pe chalta hai:
```
validate → compile → test → package → verify → install → deploy
```
Har step mandatory sequence mein hota hai.

Gradle ka **task graph** programmable hai. Matlab:

```kotlin
// Custom task — Maven mein ye karna bohot complex hota
tasks.register("generateSwaggerDocs") {
    dependsOn("compileJava")  // pehle compile hoga
    doLast {
        // koi bhi code yahan likh sakte ho
        println("Generating API docs for Zomato Order Service...")
        // file copy, script run, API call — kuch bhi
    }
}

// Existing task ke baad kuch run karo
tasks.named("build") {
    finalizedBy("generateSwaggerDocs")
}
```

Maven mein yahi kaam ke liye ek poora plugin likhna padta ya existing plugin configure karna padta — much more verbose.

---

## Multi-Module Projects — Monorepo Style

Zomato ke backend mein suppose multiple services hain — order-service, payment-service, restaurant-service — sab ek repo mein. Dono tools mein ye kuch aisa structure hoga:

### Maven Multi-Module

**Root `pom.xml`:**
```xml
<project>
    <groupId>com.zomato</groupId>
    <artifactId>zomato-backend</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>  <!-- Important: "pom" packaging for parent -->

    <!-- Ye sab modules build honge -->
    <modules>
        <module>order-service</module>
        <module>payment-service</module>
        <module>restaurant-service</module>
        <module>common-utils</module>
    </modules>

    <!-- Shared dependency versions yahan define karo -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.zomato</groupId>
                <artifactId>common-utils</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

**`order-service/pom.xml`:**
```xml
<project>
    <parent>
        <groupId>com.zomato</groupId>
        <artifactId>zomato-backend</artifactId>
        <version>1.0.0</version>
    </parent>

    <artifactId>order-service</artifactId>

    <dependencies>
        <!-- Sibling module use karo -->
        <dependency>
            <groupId>com.zomato</groupId>
            <artifactId>common-utils</artifactId>
            <!-- Version parent se inherit hogi -->
        </dependency>
    </dependencies>
</project>
```

### Gradle Multi-Module

**Root `settings.gradle.kts`:**
```kotlin
rootProject.name = "zomato-backend"

// Sab modules include karo
include("order-service")
include("payment-service")
include("restaurant-service")
include("common-utils")
```

**Root `build.gradle.kts`:**
```kotlin
// Sab subprojects pe apply hone wali common config
subprojects {
    apply(plugin = "java")

    repositories {
        mavenCentral()
    }

    dependencies {
        testImplementation("org.springframework.boot:spring-boot-starter-test")
    }
}
```

**`order-service/build.gradle.kts`:**
```kotlin
plugins {
    id("org.springframework.boot") version "3.3.4"
}

dependencies {
    // Sibling project directly reference karo
    implementation(project(":common-utils"))
    implementation("org.springframework.boot:spring-boot-starter-web")
}
```

Gradle mein Composite Builds bhi hain — multiple separate repos ko ek saath build kar sakte ho. Maven mein ye feature nahi hai.

---

## `start.spring.io` Pe Kya Choose Karo?

Jab tu `https://start.spring.io` pe jaata hai, pehla option hi ye hota hai:

```
Project: ○ Maven  ○ Gradle - Kotlin  ○ Gradle - Groovy
```

**Beginner ke liye meri recommendation:**
1. **Maven** — agar Spring Boot seekh raha hai aur build tool pe focus nahi karna
2. **Gradle - Kotlin** — agar build tool pe bhi comfortable rehna chahta hai aur performance important hai

Dono se **exactly same application** banegi. Sirf build file ka format alag hoga. Runtime pe koi fark nahi.

---

## TypeScript/Node.js se Comparison — Familiar Territory

Tu Node.js se aaya hai, toh ye mapping helpful rahegi:

| Concept | npm (Node.js) | Maven (Java) | Gradle (Java) |
|---------|---------------|--------------|----------------|
| Config file | `package.json` (JSON) | `pom.xml` (XML) | `build.gradle.kts` (Kotlin code) |
| Registry | npmjs.com | Maven Central | Maven Central (same!) |
| Install deps | `npm install` | `mvn dependency:resolve` | `./gradlew dependencies` |
| Run scripts | `npm run build` | `mvn package` | `./gradlew build` |
| Dev server | `npm run dev` | `mvn spring-boot:run` | `./gradlew bootRun` |
| Caching | None (ya Turborepo/Nx) | Nahi | First-class feature |
| Monorepo | npm workspaces | Multi-module POM | Composite builds |
| Lock file | `package-lock.json` | Implicit (pom.xml mein versions) | `gradle.lockfile` (opt-in) |
| Global install | `npm install -g` | `mvn install` | `./gradlew publishToMavenLocal` |

Ek important fark — npm mein tera `package.json` ek "script runner" bhi hai:
```json
"scripts": {
  "lint": "eslint src/",
  "format": "prettier --write ."
}
```

Maven mein aise arbitrary scripts nahi hote — plugins ke through kaam hota hai. Gradle mein custom tasks likh sakte ho — npm scripts jaisa but zyada powerful.

---

## Migration — Ek Tool Se Dusre Pe Jaana

### Maven se Gradle pe

```bash
# Gradle mein ek built-in importer hai
gradle init --type pom

# Ye tumhara pom.xml read karke Gradle files generate karta hai
# Result rough hoga — manually clean karna padega
# But starting point mil jaata hai
```

### Gradle se Maven pe

Ye seedha nahi hai. Gradle ki dynamic config (if-else, functions, custom tasks) XML mein translate nahi hoti. Usually poora rewrite karna padta hai. Isliye pehle sochlo, phir choose karo.

---

## Gotchas — Ye Mistakes Mat Karo

> [!warning] Common Confusions Jo Beginners Ko Phaansati Hain

**1. Maven `compile` scope != Gradle `compile` configuration**

```xml
<!-- Maven mein ye theek hai (lekin deprecated, "compile" default hai) -->
<scope>compile</scope>
```

```kotlin
// Gradle mein "compile" configuration REMOVE ho gayi hai Gradle 7 se
// Ye likha toh error aayega:
compile("some:library")  // WRONG!

// Sahi tarika:
implementation("some:library")  // SAHI
```

**2. `provided` scope ka Gradle equivalent**

```xml
<!-- Maven: provided = compile pe chahiye, runtime pe server provide karega -->
<scope>provided</scope>
```

```kotlin
// Gradle mein "provided" naam ka koi configuration nahi hoti (without extra plugins)
// Sahi equivalent:
compileOnly("javax.servlet:javax.servlet-api")  // SAHI
```

**3. Version Ranges Mat Use Karo**

```xml
<!-- Maven: legal hai lekin mat karo -->
<version>[1.0,2.0)</version>

<!-- Acha tarika: exact version pin karo -->
<version>1.5.3</version>
```

Gradle mein bhi avoid karo. BOM use karo version management ke liye — next note mein cover karenge.

**4. `./gradlew` vs `gradle`**

```bash
# GALAT — system installed Gradle use karega (different version ho sakti hai)
gradle build

# SAHI — project specific wrapper use karega
./gradlew build   # Linux/Mac
gradlew.bat build # Windows
```

`gradlew` script project ke saath commit hoti hai — sab log guaranteed same version use karte hain. Ye npm mein `.nvmrc` jaisa hai.

**5. Plugin Names Confuse Kar Dete Hain**

Maven ka `spring-boot-maven-plugin` aur Gradle ka Spring Boot plugin alag cheezein hain — naming similar hai lekin configuration syntax bilkul different hai:

```xml
<!-- Maven -->
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <excludes>
            <exclude>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </exclude>
        </excludes>
    </configuration>
</plugin>
```

```kotlin
// Gradle
tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    // alag syntax, alag configuration options
    mainClass.set("com.zomato.Application")
}
```

**6. Multi-Module mein `-pl` vs `:module:task`**

```bash
# Maven: specific module build karo
mvn -pl order-service package

# Gradle: specific task specific module mein run karo
./gradlew :order-service:build

# Maven: module aur uske dependencies build karo
mvn -pl order-service -am package

# Gradle mein ye automatically handle hota hai (dependency graph se)
./gradlew :order-service:build
```

---

## Practical Decision Framework

Ek real scenario mein kaise decide karo:

**Scenario 1: Tu ek fresher hai, Spring Boot seekh raha hai**
→ **Maven**. Less moving parts. Stack Overflow pe zyada examples Maven ke hain. `pom.xml` errors zyada readable hain.

**Scenario 2: Tu CRED ya Paytm ke liye interview prep kar raha hai**
→ **Maven** jaano + **Gradle** ka overview — dono kuch level pe poochhe jaate hain.

**Scenario 3: Startup mein join kiya, existing codebase Gradle pe hai**
→ Gradle seekho — yahan tu choice nahi kar sakta.

**Scenario 4: New microservice banana hai large organization mein**
→ Team/company standard follow karo. Agar koi standard nahi hai — Maven, kyunki zyada log jaante hain.

**Scenario 5: Performance-critical CI/CD pipeline, large monorepo**
→ **Gradle** — remote build cache se significantly faster builds milenge.

---

## Key Takeaways

- **Maven** convention-based hai — XML mein declare karo kya chahiye, Maven standard lifecycle pe build karega. Predictable, boring, reliable.

- **Gradle** programmable hai — Kotlin/Groovy code mein likho exactly kya karna hai. Flexible, fast, lekin complex hone pe debug karna mushkil.

- **Performance mein Gradle wins** — incremental builds, daemon, build cache. Large projects mein clearly faster.

- **Simplicity mein Maven wins** — XML static hai, debug easy hai, "magic" kam hai. Sikhne ke liye better.

- **Spring Boot ke liye** — `start.spring.io` Maven default karta hai. Most tutorials Maven use karte hain. Beginners ke liye Maven start karo.

- **Node.js analogy** — Maven thoda `npm` + strict lifecycle jaisa hai. Gradle thoda `npm` + `Makefile` + actual programming language jaisa hai.

- **Dependency scopes mapping yaad rakhna** — Maven `compile` = Gradle `implementation`, Maven `test` = Gradle `testImplementation`, Maven `provided` = Gradle `compileOnly`. Ye common interview question bhi hai.

- **Wrapper use karo hamesha** — `./gradlew` ya `mvnw`, direct `gradle` ya `mvn` nahi. Team consistency ke liye critical hai.

- **Ek se dusre pe migrate karna costly hai** — especially Gradle → Maven. Pehle sochlo, phir decide karo.

---

## Related Notes

- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[04-Dependency-Management]]
- [[05-Multi-Module-Projects]]
- [[06-Common-Plugins]]

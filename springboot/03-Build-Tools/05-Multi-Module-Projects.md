# Multi-Module Projects

Socho ek second ke liye — Zomato ka codebase kaisa hoga? Ek hi massive folder mein sab kuch? Customer app, restaurant dashboard, delivery partner app, payments, notifications — sab ek hi jagah? Nahi yaar, that would be madness.

Real-world production projects mein hamesha aisa hota hai: **ek hi repository, lekin multiple deployable units**. Ek common library jo sab use karte hain, ek billing service, ek orders service, ek admin tool — aur yeh sab ek saath build hone chahiye, versions share karne chahiye, aur ek doosre ko directly import kar sakein bina npm publish / Maven Central pe push kiye.

Yahi kaam karta hai **Multi-Module Projects** ka concept.

> [!info] Node.js/TypeScript se aa rahe ho? Yeh lo comparison:
> Multi-module = pnpm/yarn workspaces ya Nx monorepo. Ek repo, multiple buildable artifacts, shared versions, internal cross-references. Maven inhe **modules** bolta hai, Gradle inhe **sub-projects** — layout aur intent exactly same hai.

---

## Kab Chahiye Multi-Module? (When to reach for it)

Kab socho ki "yaar, multi-module chahiye mujhe":

- **Ek repo, multiple deployables** — jaise `billing-api` alag deploy hoti hai, `orders-api` alag, lekin dono ek hi codebase se build hoti hain.
- **Shared libraries** — ek `common` ya `domain` module hai jo multiple services use karti hain. Zomato ka example: order entity dono `orders-api` aur `delivery-api` use karein, ek hi jagah define ho.
- **Architectural layers enforce karne hain** — tum chahte ho ki `web` layer seedha `infra` layer ko import na kare. Multi-module se yeh compile-time pe enforce hota hai — if someone tries, build fails.
- **Library + sample app + tests** — ek SDK banaa rahe ho jisme library alag artifact hai, sample app alag.

**Aur kab mat karo?**

Single Spring Boot service ke liye multi-module mat banao. Ek hi service hai toh single-module raho — simpler hai, aur baad mein refactor karna easy hai. Over-engineering se bachna, yaar.

---

## Project Structure Kaisi Dikhti Hai?

Imagine karo ek platform: `my-platform`. Uske andar:

```
my-platform/
├── pom.xml                        ← Parent (packaging=pom, koi JAR nahi banata)
├── common/
│   ├── pom.xml
│   └── src/main/java/com/acme/common/...
├── billing-domain/
│   ├── pom.xml
│   └── src/main/java/com/acme/billing/...
├── billing-api/                   ← Yeh Spring Boot app hai (deployable)
│   ├── pom.xml
│   └── src/main/java/com/acme/billing/api/...
└── orders-api/                    ← Yeh bhi Spring Boot app (alag deployable)
    ├── pom.xml
    └── src/main/java/com/acme/orders/...
```

**Parent `pom.xml`** — yeh sab modules ko aggregate karta hai aur shared config declare karta hai (Java version, Spring Boot version, etc.). Khud koi JAR nahi banata.

**Har child** ka apna `pom.xml` — jo parent se inherit karta hai lekin apni specific dependencies/plugins declare karta hai.

Zomato analogy: Parent POM = Zomato HQ jo policies banata hai (sab Java 21 use karenge, Spring Boot 3.3.x use karenge). Har city office (module) un policies follow karta hai, apna kaam alag karta hai.

---

## Maven: Parent POM Kaise Likhte Hain?

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <!-- Yeh poore platform ki identity hai -->
    <groupId>com.acme</groupId>
    <artifactId>my-platform</artifactId>
    <version>1.0.0-SNAPSHOT</version>

    <!-- IMPORTANT: packaging=pom matlab yeh koi JAR nahi banata -->
    <!-- Sirf aggregator hai — baaki sab modules ko build karta hai -->
    <packaging>pom</packaging>

    <!-- Yahan list karo saare modules -->
    <modules>
        <module>common</module>
        <module>billing-domain</module>
        <module>billing-api</module>
        <module>orders-api</module>
    </modules>

    <!-- Ek jagah pe sab versions define karo -->
    <properties>
        <java.version>21</java.version>
        <spring-boot.version>3.3.4</spring-boot.version>
    </properties>

    <!-- dependencyManagement = "yeh versions available hain, lekin impose nahi kar raha" -->
    <!-- Child modules jab use karenge tab automatically yeh version milega -->
    <dependencyManagement>
        <dependencies>
            <!-- Spring Boot ka BOM import karo — sab Spring deps ke versions ek saath aa jaate hain -->
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>

            <!-- Internal modules ko bhi pin karo — version mismatch avoid karo -->
            <dependency>
                <groupId>com.acme</groupId>
                <artifactId>common</artifactId>
                <version>${project.version}</version>
            </dependency>
            <dependency>
                <groupId>com.acme</groupId>
                <artifactId>billing-domain</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <!-- Plugin versions bhi centrally manage karo -->
    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring-boot.version}</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

Yahan key cheez: **`<dependencyManagement>`** aur **`<dependencies>`** mein fark hai.

- `<dependencyManagement>` — "yeh version available hai agar koi mange toh" (declaration, not enforcement)
- `<dependencies>` — "yeh har child module ko mil jaata hai, chaahe maange ya na maange"

Mostly `<dependencyManagement>` hi use karo parent mein. Warna har child ko woh dep mil jaayegi.

---

## Maven: Child POM Kaise Likhte Hain?

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <!-- Parent kaun hai — yahan batao -->
    <parent>
        <groupId>com.acme</groupId>
        <artifactId>my-platform</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <!-- Apna naam — groupId parent se inherit hota hai -->
    <artifactId>billing-api</artifactId>
    <packaging>jar</packaging>

    <dependencies>
        <!-- Internal dependency — sibling module ko use karo -->
        <!-- Version nahi likhna — parent ke dependencyManagement se aata hai -->
        <dependency>
            <groupId>com.acme</groupId>
            <artifactId>billing-domain</artifactId>
        </dependency>

        <!-- Spring Boot dep — version yahan nahi, BOM se aata hai -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Executable JAR banana hai? Plugin yahan activate karo -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <!-- Version parent ke pluginManagement se aata hai -->
            </plugin>
        </plugins>
    </build>
</project>
```

**Ek magical cheez**: `com.acme:billing-domain` dependency declare ki — Maven automatically samajh jaata hai ki yeh sibling module hai, Maven Central pe dhundta nahi! Yeh **reactor build** ka kamal hai. Build order bhi automatically decide hota hai — pehle `common`, phir `billing-domain`, phir `billing-api`.

---

## Maven Build Commands — Daily Use Wale

```bash
# Poora project build karo — sahi order mein sab kuch
mvn clean install

# Sirf billing-api build karo + jo jo usse depend karta hai (common, billing-domain)
# -pl = project list, -am = also make (dependencies)
mvn -pl billing-api -am install

# billing-api + uski dependencies + jo modules billing-api pe depend karte hain
mvn -pl billing-api -am -amd install

# 4 threads parallel mein build karo — CI pe time bachao
mvn -T 4 install

# Sirf billing-api build, tests skip karo
mvn -pl billing-api install -DskipTests
```

> [!tip] CI/CD Trick — Sirf Changed Modules Build Karo
> PR mein sirf `billing-api` change hua toh poora project rebuild kyon karo? Git se pata karo kya change hua, sirf wahi build karo:
>
> ```bash
> # Changed files nikalo
> CHANGED=$(git diff --name-only origin/main...HEAD)
>
> # Affected modules detect karo aur Maven ko do
> mvn -pl billing-api -am install
> ```
>
> Node.js mein yeh Turbo ya Nx karta tha. Maven mein `-pl` aur `-am` wahi kaam karte hain.

---

## Gradle Multi-Module Setup

Maven se migrate karne walo ya Gradle prefer karne walo ke liye — same concept, Kotlin/Groovy DSL mein.

### `settings.gradle.kts` — Root Level

```kotlin
// Poore project ka naam
rootProject.name = "my-platform"

// Saare sub-projects register karo
include("common")
include("billing-domain")
include("billing-api")
include("orders-api")
```

Yeh Maven ke `<modules>` block jaisa hai — Gradle ko batata hai ki kaunse folders sub-projects hain.

### Root `build.gradle.kts` — Shared Config

```kotlin
plugins {
    java
    // apply false = declare karo lekin root pe apply mat karo
    // Sirf woh child modules apply karenge jinhe actually chahiye
    id("io.spring.dependency-management") version "1.1.6" apply false
    id("org.springframework.boot") version "3.3.4" apply false
}

// Sab projects pe — group aur version same hoga
allprojects {
    group = "com.acme"
    version = "1.0.0-SNAPSHOT"
    repositories { mavenCentral() }
}

// Sirf child sub-projects pe — root project pe nahi
subprojects {
    apply(plugin = "java")
    apply(plugin = "io.spring.dependency-management")

    // Java 21 toolchain — sab consistent rahenge
    java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

    // Spring Boot BOM import — sab versions automatically set ho jaate hain
    dependencyManagement {
        imports {
            mavenBom("org.springframework.boot:spring-boot-dependencies:3.3.4")
        }
    }

    // JUnit Platform use karo tests ke liye
    tasks.withType<Test> { useJUnitPlatform() }
}
```

### Child Module `build.gradle.kts` — `billing-api`

```kotlin
plugins {
    // Yeh Spring Boot executable JAR banayega
    id("org.springframework.boot")
    id("io.spring.dependency-management")
}

dependencies {
    // Internal sibling modules — project(":module-name") syntax
    implementation(project(":billing-domain"))
    implementation(project(":common"))

    // External dependencies — version BOM se aayega
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

### Gradle Build Commands

```bash
# Poora project build karo
./gradlew build

# Sirf billing-api run karo
./gradlew :billing-api:bootRun

# Sirf billing-api build karo (dependencies automatically build hongi)
./gradlew :billing-api:build

# billing-api ki dependency tree dekho
./gradlew :billing-api:dependencies

# Sab tests run karo
./gradlew test
```

> [!info] Gradle vs Maven Build Speed
> Gradle by default parallel aur incremental build karta hai. Agar tumne kuch change nahi kiya, woh task dobara run nahi karta (build cache). Maven mein yeh `-T 4` se manually karna padta hai. Isliye bade projects mein Gradle faster feel hota hai.

---

## Library Module Mein `bootJar` Problem — Zaroori Samajhna!

`common` aur `billing-domain` library modules hain — inhe executable JAR nahi banana, sirf regular JAR banana hai jo doosre modules use kar sakein.

Problem: Agar Spring Boot plugin accidentally library module pe apply ho jaaye, woh ek fat executable JAR bana deta hai. Phir doosra module use module ko dependency mein le nahi sakta.

**Gradle mein fix:**

```kotlin
// common/build.gradle.kts
plugins {
    java // Spring Boot plugin nahi — sirf plain java
    id("io.spring.dependency-management")
}

// Explicitly bootJar off karo agar Spring Boot plugin inherited hai
tasks.bootJar { enabled = false }
tasks.jar { enabled = true }  // Regular JAR banana hai

dependencies {
    implementation("org.springframework.boot:spring-boot-starter")
    // Web starter mat do — yeh library hai, HTTP serve nahi karegi
}
```

**Maven mein fix:**

```xml
<!-- common/pom.xml -->
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <!-- classifier se regular JAR alag rahega, exec JAR alag -->
                <!-- Library module ke liye plugin hi mat use karo usually -->
                <skip>true</skip>
            </configuration>
        </plugin>
    </plugins>
</build>
```

---

## Layered Architecture — Physical Boundaries

Yeh multi-module ka sabse powerful use case hai. Socho IRCTC ka backend:

```
common      ← Koi dependency nahi, pure utilities
domain      ← common pe depend karta hai (business logic, entities)
infra       ← domain + common (database, external APIs)
api         ← domain + infra (HTTP controllers, request/response)
```

Agar `domain` module mein koi galti se `api` module ka kuch import karne ki koshish kare:

```java
// domain/src/main/java/.../BookingService.java
import com.acme.api.BookingController; // ← Yeh compile FAIL karega!
```

**Build fail!** Maven/Gradle dependency graph mein `domain → api` allowed nahi hai, toh import ka koi sawal hi nahi uthta. Code architecture documented nahi — **enforced** hai. Yeh Node.js mein karna mushkil tha (ESLint rules se hua tha, runtime checks se), Java mein compile-time enforcement milta hai free mein.

---

## Gradle Composite Builds — Next Level Feature

Gradle mein ek aur powerful feature hai jiska Maven mein koi equivalent nahi: **Composite Builds**.

Scenario: Tumhara `my-shared-lib` ek alag Git repository mein hai, aur tum simultaneously library aur app dono pe kaam kar rahe ho. Normally: library mein change karo → `./gradlew publishToMavenLocal` → app mein use karo. Bahut tedious.

Composite build se:

```kotlin
// billing-api/settings.gradle.kts
rootProject.name = "billing-api"

// Local checkout ko include karo — no publish needed!
includeBuild("../my-shared-lib")
```

Ab jab `billing-api` mein yeh dependency likhoge:

```kotlin
implementation("com.acme:shared-lib:1.0.0")
```

Gradle automatically `../my-shared-lib` se resolve karega, Maven Central se nahi. Local changes instantly reflect honge. Maven mein yeh karna ho toh `mvn install` karna padta hai library mein pehle.

---

## Maven vs Gradle vs pnpm — Side by Side

| Concept | pnpm/yarn workspaces | Maven multi-module | Gradle subprojects |
|---|---|---|---|
| Workspace root | `package.json` with `workspaces` | Parent `pom.xml` (packaging=pom) | `settings.gradle.kts` |
| Cross-package deps | `"foo": "workspace:*"` | Maven coordinate of sibling | `project(":foo")` |
| Shared version pinning | Manually ya `pnpm catalog` | `dependencyManagement` / BOM | `dependencyManagement` block |
| Filtered build | `pnpm --filter <pkg> build` | `mvn -pl <module> -am install` | `./gradlew :<module>:build` |
| Parallel build | turbo, nx | `mvn -T <n>` | Default parallel |
| Affected-only CI | turbo, nx affected | `-pl` + git diff | Gradle build cache |
| Library vs app | Same `package.json` structure | Plugin skip/classifier | `bootJar { enabled = false }` |

```bash
# Maven: billing-api aur uski sab dependencies build karo
mvn -pl billing-api -am clean install
# Build order: common → billing-domain → billing-api

# Gradle: Same kaam, caching + parallelism by default
./gradlew :billing-api:build
# Same order, Gradle figures out what's cached and skips
```

---

## Gotchas — Yeh Mistakes Mat Karna!

> [!warning] Multi-Module Traps — Bahut Log Faas Jaate Hain Inme

**1. Naya module parent ke `<modules>` mein add karna bhool gaye (Maven)**

Tumne `notifications` folder banaya, pom.xml likha, lekin parent ke `<modules>` mein add karna bhool gaye. Locally tum `mvn install` karke `.m2` mein install kar lete ho aur sab chalega. CI pe fresh build hogi — module nahi milega, build fail. Tab panic hoga.

```xml
<!-- Parent pom.xml mein — naya module add karna MAT BHULO -->
<modules>
    <module>common</module>
    <module>billing-domain</module>
    <module>billing-api</module>
    <module>orders-api</module>
    <module>notifications</module>  <!-- ← Yeh add karna tha! -->
</modules>
```

**2. Cyclic Dependencies**

`billing-api` → `common` → `billing-api` — yeh circular dependency hai. Maven aur Gradle dono refuse kar denge. Good! Design fix karo — common module mein billing-specific cheez kyun hai?

**3. Library Module pe `bootJar` enabled rehna**

Library module (`common`, `billing-domain`) pe Spring Boot plugin apply hua aur `bootJar` enabled raha toh fat JAR banega. Doosre modules use JAR ko dependency mein le nahi paayenge. Fix:

```kotlin
// Library module ke build.gradle.kts mein
tasks.bootJar { enabled = false }
tasks.jar { enabled = true }
```

Maven mein:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <classifier>exec</classifier>
    </configuration>
</plugin>
```

**4. `dependencyManagement` vs `dependencies` confusion**

Parent mein agar `<dependencies>` mein kuch daal diya toh har child module ko woh dependency automatically milegi — chahe woh use kare ya na kare. Classpath bloated ho jaata hai. Hamesha `<dependencyManagement>` use karo — declare karo, impose mat karo.

**5. Parallel Build mein Port Conflicts**

Multiple modules ke tests parallel run ho rahe hain, dono port 8080 pe server start karne ki koshish kar rahe hain. Collision! Fix:

```java
// Tests mein random port use karo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
```

Ya Maven Failsafe plugin configure karo module-specific ports se.

**6. Internal Dependency Versions Sync Nahi Hain**

Version bump karte waqt `${project.version}` sab jagah automatically update hota hai agar sahi se likha ho. Lekin agar tumne manually version hardcode kiya tha (`1.0.0-SNAPSHOT` instead of `${project.version}`), toh mismatch ho jaayega.

Maven ke liye:

```bash
# Sab modules ka version ek saath update karo
mvn versions:set -DnewVersion=2.0.0-SNAPSHOT
mvn versions:commit
```

---

## Key Takeaways

- **Multi-module = monorepo Java mein** — ek repo, multiple buildable/deployable artifacts, shared versions
- **Parent POM** sirf aggregator hai (`packaging=pom`) — khud koi JAR nahi banata, bas config centralize karta hai
- **`dependencyManagement`** versions declare karta hai, enforce nahi karta — children manually adopt karte hain
- **Sibling module dependencies** Maven Central se nahi, local reactor se resolve hoti hain — `project(":foo")` Gradle mein, coordinate Maven mein
- **Library modules pe `bootJar` disable karo** — otherwise fat JAR banega jo doosre import nahi kar sakte
- **Physical layer enforcement** multi-module ka killer feature hai — architecture compile-time pe enforce hoti hai
- **Build commands**: `mvn -pl <module> -am install` ya `./gradlew :<module>:build` — sirf wahi build karo jo chahiye
- **Gradle composite builds** alag repos ko ek saath develop karne ke liye powerful hain — Maven ka iska koi equivalent nahi
- **Shuru karo single-module se** — complex lagane par hi multi-module mein refactor karo, YAGNI principle follow karo

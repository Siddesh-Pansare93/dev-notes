# Common Build Plugins — Woh Tools Jo Real Projects Mein Actually Kaam Aate Hain

Socho Zomato ka backend. Order place hota hai, payment UPI se hoti hai, notification push hoti hai, aur sab kuch milliseconds mein. Agar woh team sirf `mvn package` chalaye aur sochein ki kaam ho gaya — toh woh bahut bade illusion mein hai. Real production projects mein build karna sirf compilation nahi hai. Testing hoti hai, coverage check hoti hai, formatting enforce hoti hai, DB migrations chalti hain, aur ek self-contained deployable artifact banta hai. Yeh sab kaam karte hain **plugins**.

Maven aur Gradle akele kuch nahi karte. Core tool bas lifecycle manage karta hai — `compile`, `test`, `package`, `verify`, `deploy`. Har actual kaam ek plugin karta hai. Spring Boot ka parent POM bahut saare plugins pre-configure karke deta hai sensible defaults ke saath, lekin production-ready project mein tumhe kuch plugins khud configure karne padte hain — coverage thresholds enforce karne ke liye, formatting CI mein gate karne ke liye, integration tests alag chalane ke liye.

Yeh note usi ke baare mein hai. Woh plugins jo tum actually touch karoge.

---

## Quick Reference — Plugins Ka Cheat Sheet

| Plugin | Kya karta hai | Maven / Gradle |
|---|---|---|
| `spring-boot-maven-plugin` / `org.springframework.boot` | Fat JAR banata hai, app run karta hai, Docker image banata hai | Dono |
| `maven-surefire-plugin` | Unit tests chalata hai (`*Test.java`) | Maven |
| `maven-failsafe-plugin` | Integration tests chalata hai (`*IT.java`) | Maven |
| `jacoco-maven-plugin` / `jacoco` | Code coverage measure karta hai | Dono |
| `spotless-maven-plugin` / `com.diffplug.spotless` | Code formatting enforce karta hai | Dono |
| `maven-compiler-plugin` | Compile karta hai, Java version set karta hai | Maven |
| `maven-shade-plugin` | Uber JAR banata hai (Spring Boot plugin se alag use case) | Maven |
| `versions-maven-plugin` | Dependency versions bump karta hai | Maven |
| `flyway-maven-plugin` / `org.flywaydb.flyway` | DB migrations chalata hai | Dono |

---

## `spring-boot-maven-plugin` — The Most Important Plugin

### Yeh Kyun Hai Sabse Zaroori?

Node.js mein jab tum `node dist/index.js` chalate ho, tumhare paas `node_modules` folder hota hai saath mein, ya tum `pkg` se ek standalone executable banate ho. Java mein by default `mvn package` ek bahut hi "thin" JAR banata hai — sirf tumhara compiled code, bina dependencies ke. Us JAR ko `java -jar` se directly run karo — crash. `ClassNotFoundException`.

`spring-boot-maven-plugin` yahi fix karta hai. Woh us thin JAR ko **fat JAR** (executable JAR) mein repackage karta hai — ek file mein tumhara code + saari dependencies + embedded Tomcat server. Ek hi file, kahin bhi deploy karo. Swiggy ka server AWS pe chale, OYO ka Kubernetes pe — dono ko sirf woh JAR chahiye.

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <!-- agar tumhare paas multiple main classes hain toh explicitly batao -->
                <mainClass>com.acme.Application</mainClass>
                <!-- Linux pe directly ./app.jar se run kar sakte ho (script mode) -->
                <executable>true</executable>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <!-- fat JAR banao -->
                        <goal>repackage</goal>
                        <!-- build metadata embed karo — Git commit, timestamp, version -->
                        <!-- /actuator/info endpoint pe dikhai deta hai -->
                        <goal>build-info</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### Saare Goals — Kya Karta Hai Kya

| Goal | Kya hota hai |
|---|---|
| `repackage` | `target/*.jar` ko fat JAR mein convert karta hai; original `*.jar.original` ban jaata hai |
| `run` | `mvn spring-boot:run` — sources se directly app start karta hai, JAR banaye bina |
| `build-image` | Cloud Native Buildpacks use karke Docker image banata hai — no Dockerfile needed |
| `build-info` | `META-INF/build-info.properties` mein Git hash, timestamp, version embed karta hai |
| `start` / `stop` | Integration test phases mein app ko background mein start/stop karna |

```bash
# Development mein sabse common — hot reload jaisa feel
mvn spring-boot:run

# CI/CD mein — fat JAR banao
mvn package

# Docker image banao bina Dockerfile likhe
mvn spring-boot:build-image -Dspring-boot.build-image.imageName=zomato/order-service:1.0
```

### Gradle Equivalent

```kotlin
plugins {
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
    java
}

// JAR ka naam customize karo
tasks.bootJar {
    archiveFileName.set("app.jar")
}

// Useful Gradle tasks:
// ./gradlew bootRun      — app run karo
// ./gradlew bootJar      — fat JAR banao
// ./gradlew bootBuildImage — Docker image banao
```

> [!tip] TS Dev Ke Liye
> `mvn spring-boot:run` === `ts-node src/index.ts` — sources se directly run, build step skip.
> `mvn package` === `tsc && node dist/index.js` — compile karke deployable artifact banao.
> `spring-boot:build-image` === `docker build .` — lekin bina Dockerfile likhe, buildpacks sab handle karta hai.

---

## Maven Surefire Plugin — Unit Tests Chalao

### Kya Problem Solve Karta Hai?

TypeScript mein `jest` ya `vitest` install karte ho aur `npm test` se tests chalte hain. Maven mein yahi kaam karta hai **Surefire plugin** — by default Spring Boot ka parent POM ise already configure karta hai, lekin real projects mein tumhe customize karna padta hai.

Surefire automatically uthata hai:
- `*Test.java` — e.g., `UserServiceTest.java`
- `*Tests.java` — e.g., `UserServiceTests.java`
- `Test*.java` — e.g., `TestUserService.java` (rare)

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <!-- Spring Boot parent se version inherit hoti hai, explicitly likhne ki zaroorat nahi -->
    <configuration>
        <!-- JVM ko extra memory do agar tests heavy hain -->
        <argLine>-Xmx1g</argLine>

        <!-- Tests parallel chalao — speed ke liye -->
        <!-- careful: stateful tests mein issues aa sakte hain -->
        <parallel>classes</parallel>
        <threadCount>4</threadCount>

        <!-- Integration tests yahan nahi chalane chahiye -->
        <!-- woh Failsafe ke kaam hain -->
        <excludes>
            <exclude>**/*IT.java</exclude>
            <exclude>**/*IntegrationTest.java</exclude>
        </excludes>
    </configuration>
</plugin>
```

### Common Commands

```bash
# Saare unit tests chalao
mvn test

# Specific class ke tests chalao
mvn test -Dtest=UserServiceTest

# Specific method chalao
mvn test -Dtest=UserServiceTest#findById_WhenUserExists_ReturnsUser

# Pattern se tests chalao
mvn test -Dtest='Order*Test'

# Tests skip karo (kabhi kabhi CI mein zaroorat padti hai — pakka reason chahiye)
mvn package -DskipTests
```

> [!warning] Surefire Ka Ek Bada Gotcha
> Agar tumne file ka naam `UserSpec.java` ya `UserIT.java` rakha — Surefire usse nahi chalayega by default. Sirf `*Test.java` aur `*Tests.java` pick hote hain. Yeh ek common beginner mistake hai — test likha, file galat naam rakha, tests chale hi nahi, CI green raha, production mein bug.

---

## Maven Failsafe Plugin — Integration Tests

### Surefire Se Kya Fark Hai?

Ek analogy: Surefire woh hai jo individual components test karta hai — jaise Zomato ka payment module akele test karo mock se. Failsafe woh hai jo poore system ko ek saath test karta hai — real DB se, real Kafka se, real HTTP calls se.

Failsafe ka sabse important feature: agar integration test fail ho jaata hai, woh immediately build nahi todata. Pehle saari cleanup goals chalti hain (app stop karo, DB clean karo), phir build fail hota hai `verify` phase mein. Isliye iska naam "Failsafe" hai.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-failsafe-plugin</artifactId>
    <executions>
        <execution>
            <goals>
                <!-- integration-test phase mein tests chalao -->
                <goal>integration-test</goal>
                <!-- verify phase mein results check karo aur fail karo agar needed -->
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <!-- Integration test files ka pattern -->
        <includes>
            <include>**/*IT.java</include>
            <include>**/*IntegrationTest.java</include>
        </includes>
    </configuration>
</plugin>
```

### Flow Samjho

```
mvn verify chalate ho toh:
1. compile
2. test (Surefire — unit tests)
3. package (fat JAR banao)
4. pre-integration-test (app start karo agar chahiye)
5. integration-test (Failsafe — *IT.java tests)
6. post-integration-test (app stop karo, cleanup)
7. verify (Failsafe results check karo — yahan fail hoga agar tests fail hue)
```

```bash
# Unit + Integration dono chalao
mvn verify

# Sirf integration tests (unit skip karo)
mvn verify -DskipUnitTests
```

> [!tip] Spring Boot Test Ke Saath Integration
> Spring Boot mein `@SpringBootTest` use karte ho integration tests mein. Typically `@Testcontainers` ke saath real PostgreSQL, Redis containers spin up karte hain. Yeh files `*IT.java` naam rakho — Failsafe chalayega, Surefire nahi.

---

## JaCoCo — Code Coverage Ka Watchman

### Kyun Chahiye Coverage?

Socho Paytm ke codebase mein koi ek critical payment processing function hai. Tests likhe hain, sab pass ho rahe hain — lekin woh function actually kabhi test nahi hua kyunki test ka code path wahan pahuncha hi nahi. JaCoCo precisely yahi track karta hai — kitni lines/branches tumhare tests ne actually execute kiye.

Node.js mein `c8` ya `istanbul/nyc` use karte the. Java mein **JaCoCo** hai.

### Maven Configuration

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <!-- Step 1: JaCoCo agent set karo before tests run karein -->
        <!-- Yeh agent bytecode instrument karta hai — track karta hai kya chala kya nahi -->
        <execution>
            <id>prepare-agent</id>
            <goals><goal>prepare-agent</goal></goals>
        </execution>

        <!-- Step 2: Tests ke baad HTML/XML report generate karo -->
        <execution>
            <id>report</id>
            <phase>verify</phase>
            <goals><goal>report</goal></goals>
        </execution>

        <!-- Step 3: Coverage threshold enforce karo (optional lekin recommended) -->
        <!-- 80% se kum coverage pe build fail kar do -->
        <execution>
            <id>check-coverage</id>
            <phase>verify</phase>
            <goals><goal>check</goal></goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <!-- Line coverage 80% se kum nahi honi chahiye -->
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
                <!-- Generated code exclude karo — Lombok, MapStruct, etc. -->
                <excludes>
                    <exclude>**/generated/**</exclude>
                    <exclude>**/*MapperImpl.class</exclude>
                    <exclude>**/Q*.class</exclude>
                </excludes>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Report Kahan Milti Hai?

```bash
mvn verify

# Ab yeh kholo browser mein:
# target/site/jacoco/index.html

# Green = covered, Red = not covered
# Ek glance mein pata chal jaata hai kaunsa code test nahi hua
```

### Gradle Equivalent

```kotlin
plugins {
    java
    jacoco
}

tasks.test {
    useJUnitPlatform()
    // Test ke baad automatically report generate karo
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        html.required.set(true)
        xml.required.set(true)  // SonarQube ke liye zaroorat padti hai
    }
    // Generated code exclude karo
    classDirectories.setFrom(
        files(classDirectories.files.map {
            fileTree(it) {
                exclude("**/generated/**", "**/*MapperImpl.class")
            }
        })
    )
}

// Coverage threshold enforce karo
tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}

// `check` task mein coverage verification include karo
tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}
```

> [!warning] JaCoCo + Lombok = Headache
> Lombok `@Data`, `@Builder`, `@Getter` se generated code ke liye JaCoCo coverage dikhata hai — jo actually tumhare kaam ka code nahi hai. Isse tumhara coverage percentage artificially kam dikhe. Solution: generated classes ko `<excludes>` mein daalo. Warna 80% threshold pe real code ka 60% cover ho sakta hai aur tumhe pata bhi nahi chalega.

> [!warning] JaCoCo + Parallel Tests
> Agar tests parallel chalate ho (`parallel=classes`), JaCoCo ka `.exec` file corrupt ho sakta hai. Fix: ya toh parallelism band karo, ya phir `destFile` per-fork set karo. Production projects mein yeh ek frustrating bug hota hai.

---

## Spotless — Java Ka Prettier

### Kya Problem Solve Karta Hai?

TypeScript mein Prettier use karte the — ek opinionated code formatter jo ensure karta tha ki team ke saare developers ka code ek jaisa dikhta hai. Git diffs sirf actual logic changes dikhate the, formatting changes nahi. Yahi kaam Java mein **Spotless** karta hai.

Spotless multiple formatters support karta hai:
- **Google Java Format** — Google ke internal standards (sabse popular)
- **Palantir Java Format** — thoda zyada lenient
- **Eclipse formatter** — purana school, customizable
- **Prettier** — haan, Prettier Java files bhi format kar sakta hai Spotless ke zariye

### Maven Configuration

```xml
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <version>2.43.0</version>
    <configuration>
        <java>
            <!-- Google Java Format use karo, AOSP style se -->
            <!-- AOSP = Android Open Source Project — 4 space indentation -->
            <!-- GOOGLE style = 2 space indentation -->
            <googleJavaFormat>
                <version>1.22.0</version>
                <style>AOSP</style>
            </googleJavaFormat>

            <!-- Unused imports auto-remove karo -->
            <removeUnusedImports/>

            <!-- Import order enforce karo — standard Java conventions -->
            <importOrder>
                <order>java,javax,jakarta,org,com,</order>
            </importOrder>

            <!-- Trailing whitespace hatao -->
            <trimTrailingWhitespace/>

            <!-- File newline se end ho -->
            <endWithNewline/>
        </java>

        <!-- pom.xml bhi sort karo -->
        <pom>
            <sortPom/>
        </pom>
    </configuration>

    <executions>
        <execution>
            <!-- verify phase mein check karo — CI fail karega agar format galat hai -->
            <phase>verify</phase>
            <goals><goal>check</goal></goals>
        </execution>
    </executions>
</plugin>
```

### Commands Jo Tum Regularly Use Karoge

```bash
# LOCAL DEVELOPMENT — files rewrite karo (Prettier --write jaisa)
mvn spotless:apply

# CI/CD — sirf check karo, fail karo agar formatting wrong hai (Prettier --check jaisa)
mvn spotless:check

# Naya project shuru kar rahe ho? Pehle apply karo, phir commit karo
mvn spotless:apply && git add -A && git commit -m "chore: apply spotless formatting"
```

### Gradle Equivalent

```kotlin
plugins {
    id("com.diffplug.spotless") version "6.25.0"
}

spotless {
    java {
        // Google Java Format ke saath AOSP style
        googleJavaFormat("1.22.0").aosp()

        // Unused imports hatao
        removeUnusedImports()

        // Import order
        importOrder("java", "javax", "jakarta", "org", "com", "")

        // Cleanup
        trimTrailingWhitespace()
        endWithNewline()
    }

    // Kotlin files bhi format karo (agar mixed project hai)
    kotlinGradle {
        ktlint()
    }
}

// check task mein spotless integrate karo
tasks.check { dependsOn("spotlessCheck") }
```

> [!tip] Team Onboarding
> Naya developer join kiya Flipkart ki team mein — pehle din code likha, push kiya, CI fail ho gaya "formatting wrong". Frustrating experience. Spotless ka `apply` goal IDE plugin se hook karo ya pre-commit hook mein daalo — har commit se pehle auto-format ho. Ek baar setup karo, sab relieved.

> [!warning] `apply` vs `check` — Bhoolna Nahi
> - `spotless:apply` — files rewrite karta hai. **Kabhi CI mein mat chalao.** Local use ke liye hai.
> - `spotless:check` — sirf check karta hai, fail karta hai agar format galat ho. **CI mein yahi chalao.**
> Agar CI mein `apply` chalate ho, it will "fix" the files, but the build artifact won't match what was committed — confusing behavior.

---

## Maven Compiler Plugin — Java Version Control

### Kab Explicitly Configure Karna Padta Hai?

Spring Boot ka parent POM already compiler plugin configure karta hai Java 17+ ke liye. Lekin tumhe explicitly configure karna padega jab:
1. Parent POM se alag Java version chahiye (Java 21 se Java 22 upgrade)
2. **Lombok** ya **MapStruct** jaise annotation processors add karne hain
3. `--enable-preview` flags chahiye (newer Java features ke liye)

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <!-- Version Spring Boot parent se inherit hoti hai -->
    <configuration>
        <!-- Java 21 ka release mode — toolchain se independent -->
        <release>21</release>

        <!-- BAHUT IMPORTANT: method parameter names preserve karo -->
        <!-- Spring ke @PathVariable, @RequestParam isko use karte hain -->
        <!-- Bina iske tumhe explicitly naam batana padega: @PathVariable("id") Long id -->
        <!-- Iske saath: @PathVariable Long id — Spring khud naam deduce kar leta hai -->
        <parameters>true</parameters>

        <!-- Annotation processors — Lombok, MapStruct, etc. -->
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>1.18.34</version>
            </path>
            <!-- MapStruct bhi use karte ho toh -->
            <path>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct-processor</artifactId>
                <version>1.5.5.Final</version>
            </path>
        </annotationProcessorPaths>

        <!-- Preview features enable karo (optional, experimental) -->
        <!-- <compilerArgs>
            <arg>--enable-preview</arg>
        </compilerArgs> -->
    </configuration>
</plugin>
```

> [!warning] `<parameters>true</parameters>` Mat Bhoolo
> Yeh ek silent killer hai. Bina iske `@PathVariable Long userId` kaam nahi karta — Spring ko explicitly `@PathVariable("userId")` chahiye. Spring Boot parent ise set karta hai, lekin agar custom compiler config likhte ho aur yeh bhool jaate ho, tumhe weird "Name for argument of type... not specified" errors aayenge.

---

## Ek Complete, Real-World Maven `<build>` Section

Yeh woh configuration hai jo ek production-ready project mein hogi — jaise Zomato ya BigBasket ka koi microservice:

```xml
<build>
    <plugins>

        <!-- 1. Fat JAR banao aur build metadata embed karo -->
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <executions>
                <execution>
                    <goals>
                        <goal>repackage</goal>
                        <goal>build-info</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>

        <!-- 2. Integration tests ke liye Failsafe -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-failsafe-plugin</artifactId>
            <executions>
                <execution>
                    <goals>
                        <goal>integration-test</goal>
                        <goal>verify</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>

        <!-- 3. Coverage measure karo aur enforce karo -->
        <plugin>
            <groupId>org.jacoco</groupId>
            <artifactId>jacoco-maven-plugin</artifactId>
            <version>0.8.12</version>
            <executions>
                <execution>
                    <id>prepare-agent</id>
                    <goals><goal>prepare-agent</goal></goals>
                </execution>
                <execution>
                    <id>report</id>
                    <phase>verify</phase>
                    <goals><goal>report</goal></goals>
                </execution>
                <execution>
                    <id>check-coverage</id>
                    <phase>verify</phase>
                    <goals><goal>check</goal></goals>
                    <configuration>
                        <rules>
                            <rule>
                                <element>BUNDLE</element>
                                <limits>
                                    <limit>
                                        <counter>LINE</counter>
                                        <value>COVEREDRATIO</value>
                                        <minimum>0.80</minimum>
                                    </limit>
                                </limits>
                            </rule>
                        </rules>
                        <excludes>
                            <exclude>**/generated/**</exclude>
                            <exclude>**/*MapperImpl.class</exclude>
                        </excludes>
                    </configuration>
                </execution>
            </executions>
        </plugin>

        <!-- 4. Formatting check — CI mein enforce karo -->
        <plugin>
            <groupId>com.diffplug.spotless</groupId>
            <artifactId>spotless-maven-plugin</artifactId>
            <version>2.43.0</version>
            <configuration>
                <java>
                    <googleJavaFormat>
                        <version>1.22.0</version>
                    </googleJavaFormat>
                    <removeUnusedImports/>
                </java>
            </configuration>
            <executions>
                <execution>
                    <phase>verify</phase>
                    <goals><goal>check</goal></goals>
                </execution>
            </executions>
        </plugin>

    </plugins>
</build>
```

---

## Equivalent Complete Gradle Build

```kotlin
plugins {
    java
    jacoco
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
    id("com.diffplug.spotless") version "6.25.0"
}

// Java version set karo
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    // Integration tests ke liye Testcontainers
    testImplementation("org.testcontainers:postgresql")
}

// Unit tests configuration
tasks.test {
    useJUnitPlatform()
    // Tests ke baad coverage report generate karo
    finalizedBy(tasks.jacocoTestReport)
}

// Coverage report
tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        html.required.set(true)
        xml.required.set(true)
    }
}

// Coverage threshold
tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}

// Formatting
spotless {
    java {
        googleJavaFormat("1.22.0").aosp()
        removeUnusedImports()
        importOrder("java", "javax", "jakarta", "org", "com", "")
        trimTrailingWhitespace()
        endWithNewline()
    }
}

// check task mein sab kuch tie karo
tasks.check {
    dependsOn("spotlessCheck", "jacocoTestCoverageVerification")
}

// Fat JAR ka naam set karo
tasks.bootJar {
    archiveFileName.set("app.jar")
}
```

---

## TypeScript ↔ Java Plugin Comparison

Jo tum pehle karte the Node.js mein, woh Java mein kuch aisa dikhta hai:

| Kaam | npm/TypeScript | Maven | Gradle |
|---|---|---|---|
| App run karo | `npx ts-node src/index.ts` | `mvn spring-boot:run` | `./gradlew bootRun` |
| Deployable artifact banao | `npm run build` → `node dist/index.js` | `mvn package` → fat JAR | `./gradlew bootJar` |
| Unit tests chalao | `jest` / `vitest` | `mvn test` (Surefire) | `./gradlew test` |
| Integration tests | `jest --config jest.integration.config.js` | `mvn verify` (Failsafe, `*IT.java`) | alag `integrationTest` source set |
| Code coverage | `c8` / `nyc` / `istanbul` | JaCoCo | JaCoCo (built-in Gradle plugin) |
| Formatting | `prettier --write .` | `mvn spotless:apply` | `./gradlew spotlessApply` |
| Format check CI | `prettier --check .` | `mvn spotless:check` | `./gradlew spotlessCheck` |
| Linting | ESLint | Checkstyle / ErrorProne | Checkstyle / ErrorProne |
| Docker image | `docker build .` | `mvn spring-boot:build-image` | `./gradlew bootBuildImage` |
| Dependency versions bump | `npx npm-check-updates` | `mvn versions:display-dependency-updates` | Gradle Versions Plugin |

---

## Common Gotchas — Jo Beginners Se Hamesha Hoti Hain Galtiyan

> [!warning] Surefire File Naming
> Sirf `*Test.java` aur `*Tests.java` automatically pick hote hain. Agar tumne `UserSpec.java` ya `UserIT.java` rakha — test exist karta hai, compile hota hai, but **kabhi run nahi hoga**. CI green rahega, coverage 0% rahegi us file ki. Always check karo test class naming.

> [!warning] `repackage` ke Baad Original JAR
> `spring-boot-maven-plugin` ke `repackage` goal ke baad `target/myapp-1.0.jar` fat JAR ban jaata hai. Original thin JAR ko `target/myapp-1.0.jar.original` rename kar diya jaata hai. Agar kisi script mein original JAR expect karte ho — surprise.

> [!warning] Library Modules Mein `bootJar` Disable Karo
> Multi-module project mein agar koi module sirf ek library hai (doosre modules use karte hain use), usmein `bootJar` task automatically fat JAR banayega — jise dusra module `implementation` mein use nahi kar sakta. Library modules mein explicitly disable karo:
> ```kotlin
> tasks.bootJar { enabled = false }
> tasks.jar { enabled = true }
> ```

> [!warning] JaCoCo + Lombok = False Low Coverage
> Lombok generated code (getters, setters, builders, equals/hashCode) ke liye JaCoCo coverage track karta hai — aur woh low dikhata hai kyunki tumhare tests woh getters/setters directly test nahi karte. Fix: `<excludes>` mein generated classes daalo. Warna 80% threshold pe false fail milenge.

> [!warning] Plugin Version Bina Parent Ke
> Spring Boot parent POM se bahar koi plugin use kar rahe ho (agar custom parent hai) — explicit version zaroor likho. Maven without version apne internal default use karta hai jo outdated ho sakta hai. Silent bugs milte hain.

> [!warning] `spotless:apply` CI Mein Mat Chalao
> `apply` files rewrite karta hai. CI mein chalaya toh files change honge, build pass ho jaayega — lekin woh changes committed code se alag honge. Confusing state. CI mein hamesha `check` use karo.

> [!warning] Compiler Plugin `<parameters>` Bhool Jana
> Agar custom compiler config likhte ho aur `<parameters>true</parameters>` miss karte ho, Spring ka `@PathVariable`, `@RequestParam` without explicit names kaam nahi karega. Ek chhoti si line miss ki, aur "Name for argument type [Long] not available" wala cryptic error milega.

---

## Key Takeaways

- **Maven/Gradle khud kuch nahi karte** — sab kuch plugins karta hai. Core tool sirf lifecycle define karta hai.
- **`spring-boot-maven-plugin`** sabse important hai — woh thin JAR ko deployable fat JAR banaata hai aur `java -jar app.jar` possible banata hai.
- **Surefire = unit tests** (`*Test.java`), **Failsafe = integration tests** (`*IT.java`) — naming convention strictly follow karo, nahi toh tests silently skip ho jaate hain.
- **JaCoCo** code coverage measure karta hai aur threshold enforce kar sakta hai — Lombok/generated code ko `<excludes>` mein daalna mat bhoolo.
- **Spotless** Java ka Prettier hai — `apply` locally, `check` CI mein. Kabhi bhi ulta mat karo.
- **`maven-compiler-plugin`** mein `<parameters>true</parameters>` hamesha rakho — Spring bahut jagah method parameter names rely karta hai.
- **Parallel tests + JaCoCo** mein sochkar karo — corrupted exec files mil sakti hain.
- **Library modules** mein `bootJar` disable karo — fat JAR as dependency consume nahi hoti.
- Spring Boot ka **parent POM bahut kuch pre-configure karta hai** — pehle check karo kya pehle se set hai, baar baar override mat karo without reason.

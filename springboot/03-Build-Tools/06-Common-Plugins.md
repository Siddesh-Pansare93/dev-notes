---
tags: [java, maven, gradle, plugins, surefire, jacoco, spotless, intermediate]
aliases: [Maven Plugins, Gradle Plugins, spring-boot-maven-plugin]
stage: intermediate
---

# Common Build Plugins

> [!info] For the Express/TS dev
> Maven and Gradle do almost nothing on their own — every step (compile, test, package, format, lint, coverage) is contributed by a plugin. The good news: Spring Boot's parent POM and Gradle plugin pre-configure most of them sensibly. This note covers the plugins you'll actually touch.

## The shortlist you need to know

| Plugin                              | Job                                          | Maven / Gradle |
| ----------------------------------- | -------------------------------------------- | -------------- |
| `spring-boot-maven-plugin` / `org.springframework.boot` | Repackage as fat JAR, run app | both           |
| `maven-surefire-plugin`             | Run unit tests (`*Test.java`)                | Maven          |
| `maven-failsafe-plugin`             | Run integration tests (`*IT.java`)           | Maven          |
| `jacoco-maven-plugin` / `jacoco`    | Code coverage                                | both           |
| `spotless-maven-plugin` / `com.diffplug.spotless` | Format + check formatting       | both           |
| `maven-compiler-plugin`             | Compile (configure Java version)             | Maven          |
| `maven-shade-plugin`                | Build a shaded ("uber") JAR                  | Maven          |
| `versions-maven-plugin`             | Bump dep versions                            | Maven          |
| `flyway-maven-plugin` / `org.flywaydb.flyway` | DB migrations                      | both           |

## `spring-boot-maven-plugin` — repackage into a fat JAR

This is what makes `java -jar app.jar` work for Spring Boot.

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <mainClass>com.acme.Application</mainClass>
                <executable>true</executable>     <!-- chmod +x app.jar; runs as a script -->
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>repackage</goal>
                        <goal>build-info</goal>   <!-- writes META-INF/build-info.properties -->
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

Common goals:

| Goal                | What                                                  |
| ------------------- | ----------------------------------------------------- |
| `repackage`         | Wraps `target/*.jar` into a fat JAR with all deps     |
| `run`               | `mvn spring-boot:run` — runs the app from sources     |
| `build-image`       | Builds an OCI container image via Cloud Native Buildpacks |
| `build-info`        | Embeds Git/build metadata for `/actuator/info`        |
| `start` / `stop`    | Used in integration test phases                       |

```bash
mvn spring-boot:run
mvn spring-boot:build-image -Dspring-boot.build-image.imageName=my/app:1.0
```

### Gradle equivalent

```kotlin
plugins {
    id("org.springframework.boot") version "3.3.4"
}

tasks.bootJar {
    archiveFileName.set("app.jar")
}

// gradlew bootRun, bootJar, bootBuildImage
```

## Surefire — unit tests (Maven)

Auto-runs every `*Test.java`, `*Tests.java`, or `Test*.java` in `src/test/java`.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <argLine>-Xmx1g</argLine>
        <parallel>classes</parallel>
        <threadCount>4</threadCount>
        <excludes>
            <exclude>**/*IT.java</exclude>
        </excludes>
    </configuration>
</plugin>
```

```bash
mvn test                                # all tests
mvn test -Dtest=UserServiceTest         # one class
mvn test -Dtest=UserServiceTest#findById  # one method
mvn test -Dtest='Order*Test'            # pattern
```

## Failsafe — integration tests (Maven)

Same as Surefire but for `*IT.java`. Runs in `verify` phase, *after* the app is packaged. Failures don't immediately abort — Failsafe lets cleanup goals run, then fails the build at `verify`.

```xml
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
```

```bash
mvn verify                              # runs unit + integration tests
```

## JaCoCo — code coverage

```xml
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
            </configuration>
        </execution>
    </executions>
</plugin>
```

After `mvn verify`, open `target/site/jacoco/index.html`.

```kotlin
// Gradle
plugins {
    jacoco
}

tasks.test { finalizedBy(tasks.jacocoTestReport) }
tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports { html.required.set(true) }
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule { limit { minimum = "0.80".toBigDecimal() } }
    }
}
tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }
```

## Spotless — formatter

Drop-in replacement for Prettier. Can use Google Java Format, Palantir, or Eclipse styles.

```xml
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <version>2.43.0</version>
    <configuration>
        <java>
            <googleJavaFormat>
                <version>1.22.0</version>
                <style>AOSP</style>
            </googleJavaFormat>
            <removeUnusedImports/>
            <importOrder>
                <order>java,javax,jakarta,org,com,</order>
            </importOrder>
            <trimTrailingWhitespace/>
            <endWithNewline/>
        </java>
        <pom>
            <sortPom/>
        </pom>
    </configuration>
    <executions>
        <execution>
            <phase>verify</phase>
            <goals><goal>check</goal></goals>
        </execution>
    </executions>
</plugin>
```

```bash
mvn spotless:apply        # rewrite files
mvn spotless:check        # CI gate
```

```kotlin
// Gradle
plugins {
    id("com.diffplug.spotless") version "6.25.0"
}

spotless {
    java {
        googleJavaFormat("1.22.0").aosp()
        removeUnusedImports()
        importOrder("java", "javax", "jakarta", "org", "com", "")
        trimTrailingWhitespace()
        endWithNewline()
    }
}

tasks.check { dependsOn("spotlessCheck") }
```

## Maven Compiler Plugin

Spring Boot's parent already configures it; explicit form:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <release>21</release>
        <parameters>true</parameters>          <!-- preserve method param names -->
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>1.18.34</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

## A complete realistic build section

```xml
<build>
    <plugins>
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

        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-failsafe-plugin</artifactId>
            <executions>
                <execution><goals><goal>integration-test</goal><goal>verify</goal></goals></execution>
            </executions>
        </plugin>

        <plugin>
            <groupId>org.jacoco</groupId>
            <artifactId>jacoco-maven-plugin</artifactId>
            <version>0.8.12</version>
            <executions>
                <execution><id>prep</id><goals><goal>prepare-agent</goal></goals></execution>
                <execution><id>rep</id><phase>verify</phase><goals><goal>report</goal></goals></execution>
            </executions>
        </plugin>

        <plugin>
            <groupId>com.diffplug.spotless</groupId>
            <artifactId>spotless-maven-plugin</artifactId>
            <version>2.43.0</version>
            <configuration>
                <java>
                    <googleJavaFormat><version>1.22.0</version></googleJavaFormat>
                </java>
            </configuration>
            <executions>
                <execution><phase>verify</phase><goals><goal>check</goal></goals></execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

## Equivalent Gradle build

```kotlin
plugins {
    java
    jacoco
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
    id("com.diffplug.spotless") version "6.25.0"
}

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.test {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports { html.required.set(true) }
}

spotless {
    java {
        googleJavaFormat("1.22.0").aosp()
        removeUnusedImports()
    }
}

tasks.check { dependsOn("spotlessCheck", "jacocoTestReport") }
```

## TypeScript ↔ Java plugin comparison

| Job              | npm/TS                          | Maven                              | Gradle                             |
| ---------------- | ------------------------------- | ---------------------------------- | ---------------------------------- |
| Run app          | `node dist/index.js`            | `spring-boot:run`                  | `bootRun`                          |
| Package          | `npm pack`, `pkg`               | `spring-boot-maven-plugin:repackage` | `bootJar`                        |
| Unit test        | jest                            | surefire                           | `test` task                        |
| Integration test | jest with config                | failsafe                           | separate `integrationTest` source set |
| Coverage         | `c8`, `nyc`                     | jacoco                             | `jacoco` plugin                    |
| Format           | prettier                        | spotless                           | spotless                           |
| Lint             | eslint                          | checkstyle / errorprone            | checkstyle / errorprone            |
| Container image  | `docker build`                  | `spring-boot:build-image`          | `bootBuildImage`                   |

## Gotchas

> [!warning] Plugin traps
> - **Surefire pattern**: only `*Test.java` (singular) and `*Tests.java` are picked up by default; `*Spec.java` is not.
> - **JaCoCo + Lombok / generated code** can show false low coverage. Configure `<excludes>` for generated classes.
> - **Spotless `apply` vs `check`**: `apply` rewrites files (use locally), `check` fails the build (use in CI).
> - **`spring-boot-maven-plugin` repackages in place** — your `target/*.jar` becomes a fat JAR. The original is renamed to `*.jar.original`.
> - **Plugin without explicit version** is dangerous outside of Spring Boot's parent — Maven uses whatever it finds first.
> - **`bootJar` on library modules**: build will produce a fat JAR that other modules can't consume. Disable on libraries.
> - **JaCoCo agent + parallel test runners** can produce corrupted exec files. Limit parallelism or set `destFile` per fork.

## Related

- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
- [[03-Maven-vs-Gradle]]
- [[04-Dependency-Management]]
- [[05-Multi-Module-Projects]]
- [[05-Tooling-Map]]
- [[Spring-Boot-Starters]]

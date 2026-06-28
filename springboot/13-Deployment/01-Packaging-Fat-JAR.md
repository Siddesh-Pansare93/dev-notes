---
tags: [deployment, packaging, jar, maven, gradle]
aliases: [Fat JAR, Uber JAR, Executable JAR]
stage: foundation
---

# Packaging: Fat JAR

> [!info] For the Express/TS dev
> A "fat JAR" is the Java equivalent of bundling your app + `node_modules` + a runtime entry point into a single file. `java -jar app.jar` is your `node dist/index.js` — except the JAR contains every dependency.

## What gets built

`mvn package` (or `./gradlew bootJar`) produces:

```
target/
  orders-api-1.0.0.jar          ← executable fat JAR (~30-60MB)
  orders-api-1.0.0.jar.original ← thin JAR (your code only)
```

Run it:

```bash
java -jar target/orders-api-1.0.0.jar
```

No app server needed — Tomcat (or Netty/Jetty) is embedded.

## Layout of a Spring Boot JAR

```
orders-api-1.0.0.jar
├── META-INF/
│   └── MANIFEST.MF          ← Main-Class: org.springframework.boot.loader.launch.JarLauncher
├── BOOT-INF/
│   ├── classes/             ← your compiled .class files + resources
│   ├── lib/                 ← all dependency JARs (uber-jar pieces)
│   └── classpath.idx
├── org/springframework/boot/loader/   ← the Spring Boot launcher
└── ...
```

The launcher is a tiny bootstrapper that knows how to load nested JARs from `BOOT-INF/lib/`.

## Maven configuration

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
    </plugins>
</build>
```

## Gradle

```kotlin
plugins {
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.6"
    java
}

tasks.bootJar {
    archiveFileName.set("orders-api.jar")
}
```

## Layered JARs (for Docker)

Spring Boot 2.3+ supports **layered** JARs that separate dependencies, snapshots, resources, and your classes — so Docker can cache the slow-changing layers.

`application.properties` of the build:

```yaml
# pom.xml plugin config
<configuration>
    <layers>
        <enabled>true</enabled>
    </layers>
</configuration>
```

Inspect:

```bash
java -Djarmode=layertools -jar app.jar list
# dependencies
# spring-boot-loader
# snapshot-dependencies
# application
```

Extract:

```bash
java -Djarmode=layertools -jar app.jar extract
```

This is the foundation for the [[02-Docker-for-Spring-Boot|Docker layered build]].

## Runtime args

```bash
# Profile + JVM tuning
java -XX:MaxRAMPercentage=75 \
     -Dspring.profiles.active=prod \
     -Dserver.port=8080 \
     -jar orders-api.jar

# Pass program args
java -jar orders-api.jar --server.port=9090 --my.flag=true
```

## Reproducible builds

```xml
<properties>
    <project.build.outputTimestamp>2024-01-01T00:00:00Z</project.build.outputTimestamp>
</properties>
```

Same source → byte-identical JAR. Useful for supply-chain attestations.

## Build info

The `build-info` goal creates `META-INF/build-info.properties` consumed by `/actuator/info`.

## Skinny JAR alternative

If your runtime env (e.g., a fixed `lib/` directory) provides dependencies, you can package without them — but rarely worth it. Fat JAR + Docker layering is the modern default.

## Related
- [[02-Docker-for-Spring-Boot]]
- [[03-GraalVM-Native-Image]]
- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]

---
tags:
  - spring-boot
  - build
  - packaging
  - jar
aliases:
  - Fat JAR
  - Executable JAR
  - mvn spring-boot:run
stage: intermediate
---

# Building and Running

> [!info] For the Express/TS dev
> Node ships a `package.json` and you `node dist/index.js`. Spring Boot ships an **executable fat JAR** — a single `.jar` file containing your code, all your dependencies, AND an embedded Tomcat. You `java -jar app.jar` and it's serving HTTP. No `node_modules`, no separate web server install. Smaller surface area at deploy time, larger artifact size.

## Three ways to run during development

### 1. Maven plugin

```bash
mvn spring-boot:run
```

Compiles, then launches with the embedded server. Picks up `src/main/resources/application.yml`. Best for "I want to run this once to try it."

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=9090"
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx512m"
```

### 2. Gradle plugin

```bash
./gradlew bootRun
./gradlew bootRun --args='--spring.profiles.active=dev'
```

### 3. From the IDE

Right-click your `@SpringBootApplication` class → Run. The IDE invokes `main()` directly. Fastest iteration with [[07-DevTools-and-Hot-Reload|DevTools]].

## Building the JAR

```bash
mvn clean package        # creates target/my-app-0.0.1.jar
java -jar target/my-app-0.0.1.jar
```

Or Gradle:

```bash
./gradlew bootJar        # creates build/libs/my-app-0.0.1.jar
```

> [!warning] `mvn package` without the Spring Boot plugin produces a *non-executable* JAR
> If `java -jar app.jar` says "no main manifest attribute," your `pom.xml` is missing:
> ```xml
> <build>
>     <plugins>
>         <plugin>
>             <groupId>org.springframework.boot</groupId>
>             <artifactId>spring-boot-maven-plugin</artifactId>
>         </plugin>
>     </plugins>
> </build>
> ```

## What's inside the fat JAR

```
my-app.jar
├── META-INF/
│   └── MANIFEST.MF                  ← Main-Class: org.springframework.boot.loader.JarLauncher
│                                       Start-Class: com.example.app.App
├── BOOT-INF/
│   ├── classes/                     ← your compiled .class + resources
│   │   └── com/example/app/App.class
│   ├── lib/                         ← every transitive dep as nested .jar
│   │   ├── spring-core-6.x.x.jar
│   │   ├── tomcat-embed-core-10.x.x.jar
│   │   └── ... (200+ jars)
│   └── classpath.idx
└── org/springframework/boot/loader/  ← Spring's custom JarLauncher
```

> [!note] Spring Boot's special JAR layout
> A JAR can't normally contain other JARs on its classpath. Spring Boot includes a custom `JarLauncher` (the `Main-Class`) that knows how to read the nested `BOOT-INF/lib` directory. That's why you can `java -jar app.jar` and it Just Works.

## Layered JARs (for Docker)

The naive Docker build copies the entire fat JAR into one layer — every code change re-pushes hundreds of MB. Layered JARs split it:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <layers>
            <enabled>true</enabled>
        </layers>
    </configuration>
</plugin>
```

```bash
java -Djarmode=layertools -jar app.jar list
# dependencies
# spring-boot-loader
# snapshot-dependencies
# application

java -Djarmode=layertools -jar app.jar extract
```

Dockerfile:

```dockerfile
FROM eclipse-temurin:21-jre AS extractor
WORKDIR /app
COPY target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=extractor /app/dependencies/        ./
COPY --from=extractor /app/spring-boot-loader/  ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/         ./   # changes most often
ENTRYPOINT ["java","org.springframework.boot.loader.launch.JarLauncher"]
```

Result: only the small `application/` layer rebuilds when you change code.

## Buildpacks (no Dockerfile)

```bash
mvn spring-boot:build-image
# or
./gradlew bootBuildImage
```

Produces an OCI image (using Paketo buildpacks) named `library/my-app:0.0.1`. Zero Dockerfile required.

## WAR vs JAR

You almost always want JAR. WAR is only for deploying into an external Tomcat/WebSphere — legacy enterprise pattern. If asked: stick with JAR.

## Running options

### Common JVM flags

```bash
java -Xmx512m -Xms128m -jar app.jar               # heap sizing
java -XX:+UseG1GC -jar app.jar                    # GC algorithm
java -XX:+HeapDumpOnOutOfMemoryError -jar app.jar
java -Dspring.profiles.active=prod -jar app.jar   # set property as system property
java -jar app.jar --spring.profiles.active=prod   # set property as program arg
```

### Spring-specific args

```bash
java -jar app.jar \
  --server.port=9090 \
  --spring.profiles.active=prod \
  --logging.level.com.example=DEBUG
```

CLI args (with `--`) **win over everything**, including `application.yml`. Useful for debugging in deployed environments.

### Environment variables

```bash
SERVER_PORT=9090 \
SPRING_PROFILES_ACTIVE=prod \
SPRING_DATASOURCE_URL=jdbc:postgresql://db/app \
java -jar app.jar
```

See [[05-Application-Properties#Environment variable binding]].

## Native images (GraalVM)

Spring Boot 3 supports compiling to a native binary via GraalVM:

```bash
mvn -Pnative native:compile
# or
./gradlew nativeCompile
```

Output: a single OS-native executable that starts in ~50ms with ~50MB RAM. Tradeoff: longer build (5–10 minutes) and reflection requires hints. Useful for serverless / scale-to-zero.

## Code example: typical Dockerfile (non-layered)

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline    # cache deps
COPY src/ src/
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

## Health and graceful shutdown

```yaml
server:
  shutdown: graceful           # let in-flight requests complete
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s

management:
  endpoints:
    web:
      exposure:
        include: health, info
  endpoint:
    health:
      probes:
        enabled: true          # adds /actuator/health/liveness and /readiness
```

Kubernetes can poll `/actuator/health/readiness` and `/actuator/health/liveness` directly.

## Skip tests during build

```bash
mvn package -DskipTests           # compile tests but don't run
mvn package -Dmaven.test.skip     # skip compile too (faster, more dangerous)
```

CI should always run tests. Local quick builds: skip.

## Gotchas

> [!warning] Common pitfalls
> - **`java -jar app.jar` from inside an IDE-built target** — sometimes IDE builds skip the Spring Boot repackage step. Always run `mvn package` first.
> - **Two `main` classes** in the project → plugin can't decide. Configure `<start-class>com.example.app.App</start-class>` in pom properties.
> - **Resources missing from JAR** — files outside `src/main/resources` aren't bundled. Move them in or extend the resources config.
> - **Native build fails on reflection** — add `@RegisterReflectionForBinding` or `@ImportRuntimeHints`.
> - **Out of memory on small containers** — JVM defaults to 25% of container RAM. Set `-Xmx` explicitly.
> - **Docker layer churn** — switch to layered JARs (above) for fast deploys.
> - **`mvn spring-boot:run` doesn't pick up `application-test.yml`** — it uses `application.yml` and the `dev` profile by convention. Set `--spring.profiles.active` if needed.

> [!example] My typical commands cheat-sheet
> ```bash
> mvn spring-boot:run                              # local dev (with DevTools)
> mvn package                                      # build fat JAR
> java -jar target/app.jar                         # run JAR
> mvn spring-boot:build-image                      # build OCI image
> ./gradlew nativeCompile                          # native binary
> ```

## Related
- [[01-What-is-Spring-Boot]]
- [[02-Project-Structure]]
- [[04-Starters]]
- [[05-Application-Properties]]
- [[06-SpringApplication-Bootstrap]]
- [[07-DevTools-and-Hot-Reload]]
- [[../03-Build-Tools/Maven-Basics]]
- [[../13-Deployment/Docker]]

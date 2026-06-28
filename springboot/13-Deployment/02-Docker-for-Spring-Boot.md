---
tags: [deployment, docker, containers, buildpacks, jib]
aliases: [Docker, Containerizing Spring Boot]
stage: intermediate
---

# Docker for Spring Boot

> [!info] For the Express/TS dev
> Same multi-stage pattern as Node. The wrinkle: JVM apps benefit hugely from **layered JARs** (cached deps) and from JVM-aware base images that respect cgroup limits. Spring Boot also gives you two zero-Dockerfile options: **Cloud Native Buildpacks** and **Jib**.

## Option 1: Hand-written Dockerfile (layered)

```dockerfile
# ---- Build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY src/ src/
RUN ./mvnw -DskipTests clean package

# ---- Extract layers ----
FROM eclipse-temurin:21-jdk AS layers
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract --destination extracted

# ---- Runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

# Copy from least- to most-frequently-changing for max cache reuse
COPY --from=layers /app/extracted/dependencies/         ./
COPY --from=layers /app/extracted/spring-boot-loader/   ./
COPY --from=layers /app/extracted/snapshot-dependencies/ ./
COPY --from=layers /app/extracted/application/          ./

EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

> [!tip] Why layered?
> Your `dependencies/` layer rarely changes. Your `application/` layer changes every commit. Without layering, every `git push` re-uploads 50MB of unchanged JARs.

## Option 2: Cloud Native Buildpacks (no Dockerfile)

```bash
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=ghcr.io/me/orders-api:1.0.0
```

This:
- Picks an OCI-compliant base
- Detects Java + Spring Boot
- Builds optimized layers automatically
- Adds CA certs, healthcheck, sane JVM defaults
- Produces a reproducible image

Configure in `pom.xml`:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <image>
            <name>ghcr.io/me/${project.artifactId}:${project.version}</name>
            <env>
                <BP_JVM_VERSION>21</BP_JVM_VERSION>
            </env>
        </image>
    </configuration>
</plugin>
```

## Option 3: Jib (Google)

```xml
<plugin>
    <groupId>com.google.cloud.tools</groupId>
    <artifactId>jib-maven-plugin</artifactId>
    <version>3.4.4</version>
    <configuration>
        <to>
            <image>ghcr.io/me/orders-api:${project.version}</image>
        </to>
        <container>
            <jvmFlags>
                <jvmFlag>-XX:MaxRAMPercentage=75</jvmFlag>
            </jvmFlags>
            <ports><port>8080</port></ports>
        </container>
    </configuration>
</plugin>
```

```bash
./mvnw jib:build              # push directly to registry, no Docker daemon needed
./mvnw jib:dockerBuild        # build to local Docker
```

Jib is fast because it skips the Dockerfile entirely and builds OCI layers directly.

## JVM tuning for containers

Modern OpenJDK (11+) is **container-aware** — it reads cgroup memory/CPU limits. Just set:

```bash
java -XX:MaxRAMPercentage=75 -jar app.jar
```

Don't set `-Xmx` directly in containers. Use percentage so it scales with the pod limit.

## .dockerignore

```
target/
.git/
.idea/
*.iml
node_modules/
.gradle/
build/
```

## Multi-arch builds

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t me/orders-api:1.0 --push .
```

## Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1
```

(Or rely on K8s probes — usually preferred.)

## Image size targets

| Variant | Approx size |
|---------|-------------|
| `eclipse-temurin:21-jre` (Ubuntu) | ~250 MB |
| `eclipse-temurin:21-jre-alpine` | ~180 MB |
| Distroless (`gcr.io/distroless/java21`) | ~210 MB |
| Buildpacks (Paketo tiny) | ~80 MB |
| **GraalVM native** ([[03-GraalVM-Native-Image]]) | ~70-100 MB |

## Related
- [[01-Packaging-Fat-JAR]]
- [[03-GraalVM-Native-Image]]
- [[04-Kubernetes-Basics]]
- [[05-CI-CD-Pipeline-Example]]

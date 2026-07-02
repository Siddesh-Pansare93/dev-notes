# Docker for Spring Boot

> [!info] Express/TS wale dev ke liye
> Pattern wahi multi-stage build hai jo tum Node mein use karte ho. Bas ek twist hai: JVM apps ko **layered JARs** (cached dependencies) aur JVM-aware base images (jo cgroup limits ko respect karte hain) se zabardast fayda milta hai. Aur Spring Boot tumhe do "zero-Dockerfile" options bhi deta hai — **Cloud Native Buildpacks** aur **Jib**. Matlab, chaho to Dockerfile likho bhi mat, phir bhi production-ready image ban jayegi.

## Option 1: Hand-written Dockerfile (layered)

Socho tum Zomato ka backend deploy kar rahe ho. Har commit pe agar tumhari poori JAR file (dependencies + tumhara code, sab kuch mila ke) dobara upload ho, to CI/CD slow ho jayega aur registry storage bhi bhar jayega. Isliye hum **layered Dockerfile** banate hain — jo cheez kam badalti hai (dependencies) usko alag layer mein rakho, jo cheez har commit pe badalti hai (tumhara application code) usko sabse upar rakho.

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

> [!tip] Layered kyun zaruri hai?
> Tumhara `dependencies/` layer bahut kam badalta hai — sirf tab jab tum koi naya library add/update karte ho. Lekin `application/` layer to har commit pe badalta hai. Agar layering nahi karoge, to har `git push` pe wahi 50MB ki unchanged JARs baar-baar upload/download hongi — bilkul waise hi jaise agar Node app mein `node_modules/` ko har baar dobara pack karna pade, jabki sirf tumhara `src/` code badla ho.

## Option 2: Cloud Native Buildpacks (Dockerfile ki zarurat hi nahi)

Kya hota hai? Yeh ek aisa tool hai jo tumhare liye Dockerfile khud generate kar deta hai — tumhe likhna hi nahi padta. Bas ek command chalao:

```bash
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=ghcr.io/me/orders-api:1.0.0
```

Yeh command peeche se yeh sab kar deti hai:
- OCI-compliant base image khud pick karta hai
- Java + Spring Boot ko detect karta hai
- Optimized layers automatically banata hai
- CA certs, healthcheck, aur sensible JVM defaults add karta hai
- Ek reproducible image produce karta hai (matlab, jaisa aaj banega waisa hi kal bhi banega)

Isko `pom.xml` mein configure karte hain:

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

Jaise Vercel ya Railway pe tum bina Dockerfile ke bhi deploy kar dete ho aur woh khud figure kar leta hai ki tumhara Node app hai — buildpacks bhi bilkul waisa hi karte hain, bas Java world ke liye.

## Option 3: Jib (Google ka tool)

Jib Google ka banaya hua ek plugin hai jo Docker daemon ki zarurat hi nahi padne deta. Yeh directly OCI image layers bana ke registry mein push kar deta hai.

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

Jib fast isliye hai kyunki woh Dockerfile likhne/parse karne ka jhanjhat hi skip kar deta hai aur seedha OCI layers bana deta hai. Jaise UPI mein tumhe bank ka poora process handle nahi karna padta, seedha payment ho jaata hai — waise hi Jib intermediate steps skip kar deta hai.

## Containers ke liye JVM tuning

Kyun zaruri hai? Purane JVMs container ke andar chalte hue confuse ho jaate the — woh host machine ka total RAM/CPU dekh lete the, container ki limit nahi. Isse OOM (Out of Memory) crashes hote the, bilkul waise jaise agar tum ek 512MB wale free-tier server pe Node app chalao aur woh socho ki poora 16GB RAM available hai.

Modern OpenJDK (11+) ab **container-aware** hai — matlab woh cgroup ki memory/CPU limits ko khud padh leta hai. Bas yeh set karo:

```bash
java -XX:MaxRAMPercentage=75 -jar app.jar
```

> [!warning] Gotcha
> Container ke andar `-Xmx` direct set mat karo (jaise `-Xmx512m`). Percentage use karo (`-XX:MaxRAMPercentage`) taaki jab tum pod/container ki memory limit badhao ya ghatao, JVM khud usi hisaab se scale ho jaaye. Fixed `-Xmx` set karoge to Kubernetes pe replica ki memory badhane pe bhi JVM purani limit pe hi atka rahega.

## .dockerignore

Node mein jaise `.dockerignore` ya `.gitignore` mein `node_modules/` daalte ho, waise hi yahan build artifacts aur IDE files ko ignore karna hota hai taaki image build fast ho aur unnecessary cheezein image mein na jaayein:

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

Agar tumhare users ARM machines (jaise M1/M2 Mac ya AWS Graviton) aur Intel/AMD dono use kar rahe hain, to ek hi image dono architectures ke liye banani padegi:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t me/orders-api:1.0 --push .
```

## Healthcheck

Docker ko batana hota hai ki tumhara container "healthy" hai ya nahi — jaise Swiggy delivery partner ka app periodically ping karta hai "main zinda hoon, order deliver kar sakta hoon":

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1
```

(Ya phir K8s probes pe rely karo — production mein generally yeh hi preferred approach hai, kyunki Kubernetes ka apna health-checking mechanism zyada powerful hota hai.)

## Image size targets

Chhoti image ka matlab hai — fast pull, fast deploy, kam attack surface. Yeh table dekh ke andaza lag jaayega ki kaunsa approach kitna lean image deta hai:

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

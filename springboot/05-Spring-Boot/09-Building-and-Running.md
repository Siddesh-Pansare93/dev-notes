# Building and Running — Spring Boot App Ko Duniya Ke Saamne Laana

Socho ek second ke liye — tumne ek Zomato jaisi food delivery app banai hai Spring Boot mein. Features ready hain, endpoints test ho gaye hain, ab kya? Ab us code ko ek **runnable artifact** mein convert karna hai jo kisi bhi server pe chal sake — chahe woh tumhara laptop ho, DigitalOcean ka VPS ho, ya AWS ka ECS cluster.

Node.js mein yeh simple tha: `npm run build` karo, `node dist/index.js` karo, khatam. Spring Boot mein thoda alag tarika hai — aur ek baar samajh gaye toh actually zyada powerful hai.

> [!info] Node.js Dev ke liye comparison
> Node.js mein tumhare paas hota tha `package.json` + `node_modules/` folder + compiled JS files. Spring Boot mein tumhe milta hai ek **executable fat JAR** — ek akela `.jar` file jisme tumhara code bhi hai, saare dependencies bhi hain, aur ek embedded Tomcat server bhi. Bas `java -jar app.jar` karo aur HTTP serve shuru. Koi alag web server install nahi, koi `node_modules` folder nahi. Deployment surface chhota, artifact size thoda bada.

---

## Development Mein App Kaise Chalate Hain?

Jab tum code likh rahe ho aur test kar rahe ho — daily wala development — tab teen tarike hain app chalane ke.

### 1. Maven Plugin se Chalao

```bash
mvn spring-boot:run
```

Yeh sabse common tarika hai. Maven pehle tumhara code compile karta hai, phir embedded Tomcat ke saath launch karta hai. `src/main/resources/application.yml` automatically pick up hota hai.

"Ek baar chalake dekho" wale scenarios ke liye perfect hai yeh.

Extra options bhi dene hote hain kabhi kabhi:

```bash
# Dev profile ke saath chalao (alag DB, alag configs)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Alag port pe chalao (agar 8080 busy ho)
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=9090"

# JVM ko limited RAM do (low-spec machine pe kaam aata hai)
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx512m"
```

### 2. Gradle Plugin se Chalao

Agar tumhara project Gradle use karta hai (Maven ki jagah), toh:

```bash
./gradlew bootRun

# Profile ke saath
./gradlew bootRun --args='--spring.profiles.active=dev'
```

> [!tip] Maven vs Gradle
> Dono build tools hain — `npm` ki tarah socho jo dependencies manage karta hai. Maven ka `pom.xml` hota hai (XML-based, verbose), Gradle ka `build.gradle` hota hai (Groovy/Kotlin DSL, concise). Naye projects mein Gradle zyada preferred hai, legacy mein Maven milega. Dono mein Spring Boot ka kaam same hai, syntax alag hai.

### 3. IDE Se Directly Chalao

IntelliJ IDEA ya Eclipse mein, apni `@SpringBootApplication` class dhundo, right-click karo → Run. IDE seedha `main()` method call karta hai.

Yeh **sabse fast iteration** deta hai development mein — especially jab DevTools hot-reload ke saath use karo.

---

## Production ke Liye JAR Banao — `mvn package`

Jab code production pe jaana ho — jaise Zomato ka new feature deploy hona ho raat ko — tab tumhe ek **self-contained JAR file** banani hoti hai.

```bash
# Fat JAR banao
mvn clean package

# Jo file bani woh chalao
java -jar target/my-app-0.0.1-SNAPSHOT.jar
```

`clean` isliye ki pehle ka compiled output saaf ho jaye. `package` run karne ke baad `target/` folder mein tumhari JAR file aa jaati hai.

Gradle ke liye:

```bash
./gradlew bootJar
# File milegi: build/libs/my-app-0.0.1-SNAPSHOT.jar
```

> [!warning] Sabse Common Galti — "no main manifest attribute"
> Agar `java -jar app.jar` run karo aur yeh error aaye:
> ```
> no main manifest attribute, in app.jar
> ```
> Iska matlab tumhara `pom.xml` mein Spring Boot Maven plugin nahi hai. Bina plugin ke plain Maven JAR banata hai jo executable nahi hota. Yeh add karo:
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
> Spring Initializr se project banao toh yeh automatically aata hai. Manually banaya toh check karo.

---

## Fat JAR ke Andar Kya Hota Hai?

Yeh ek interesting cheez hai samajhne wali. Normally Java mein ek JAR ke andar doosra JAR nahi hota — lekin Spring Boot ka JAR alag hota hai. Iske andar jhank ke dekho:

```
my-app.jar
├── META-INF/
│   └── MANIFEST.MF
│       # Main-Class: org.springframework.boot.loader.JarLauncher
│       # Start-Class: com.example.app.Application
│
├── BOOT-INF/
│   ├── classes/                     ← tumhara compiled code
│   │   └── com/example/app/
│   │       ├── Application.class
│   │       ├── controller/
│   │       └── service/
│   │
│   ├── lib/                         ← har ek dependency as nested JAR
│   │   ├── spring-core-6.x.x.jar
│   │   ├── spring-web-6.x.x.jar
│   │   ├── tomcat-embed-core-10.x.x.jar
│   │   ├── jackson-databind-2.x.x.jar
│   │   └── ... (200+ jars easily)
│   │
│   └── classpath.idx
│
└── org/springframework/boot/loader/
    └── JarLauncher.class            ← Spring ka custom launcher
```

> [!info] JarLauncher ka Kaam
> Java normally nested JARs nahi read kar sakta. Spring Boot ne apna custom `JarLauncher` banaya hai jo `BOOT-INF/lib/` ke andar ke JARs ko classpath pe dalta hai. Isliye `java -jar app.jar` karne pe sab kuch kaam karta hai bina kisi extra setup ke.
>
> Node.js analogy: Socho jaise agar tumne ek single `app.exe` banaya jisme `node_modules/` ka poora content zip ho aur ek custom runner ho jo unhe extract karke run kare. Exactly wohi Spring Boot ka fat JAR karta hai.

---

## App Run Karte Waqt Options — JVM Flags Aur Spring Args

Production mein app chalate waqt tumhe bahut saare options milte hain configure karne ke.

### JVM Flags (Java Virtual Machine ko configure karna)

```bash
# Heap memory set karo (OOM errors bachane ke liye — AWS Lambda pe zaroori)
java -Xmx512m -Xms128m -jar app.jar

# Garbage Collector algorithm choose karo (G1 modern apps ke liye better hai)
java -XX:+UseG1GC -jar app.jar

# OOM pe heap dump lo (debugging ke liye gold mine)
java -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heap.hprof -jar app.jar

# Spring profile as system property
java -Dspring.profiles.active=prod -jar app.jar
```

### Spring-Specific Arguments

```bash
# Multiple configs ek saath
java -jar app.jar \
  --server.port=9090 \
  --spring.profiles.active=prod \
  --logging.level.com.example=DEBUG
```

> [!tip] CLI Args Sab Pe Heavy Hote Hain
> `--` se shuru hone wale arguments `application.yml` se bhi zyada priority rakhte hain — environment variables se bhi. Production debugging ke time kaam aata hai: `java -jar app.jar --logging.level.root=DEBUG` karo aur poora logging verbose ho jaata hai bina file change kiye.

### Environment Variables Se Configure Karo

```bash
# Docker ya Kubernetes pe yeh style zyada common hai
SERVER_PORT=9090 \
SPRING_PROFILES_ACTIVE=prod \
SPRING_DATASOURCE_URL=jdbc:postgresql://prod-db:5432/myapp \
SPRING_DATASOURCE_USERNAME=appuser \
SPRING_DATASOURCE_PASSWORD=secretpassword \
java -jar app.jar
```

Spring Boot automatically environment variables ko properties mein convert karta hai — `SPRING_DATASOURCE_URL` ban jaata hai `spring.datasource.url`. Underscores dots mein convert hote hain, case insensitive.

Yeh Docker aur Kubernetes mein bahut useful hai kyunki secrets environment variables mein inject kiye jaate hain.

---

## Docker ke Saath Deploy Karna

Real production mein aajkal sab kuch Docker containers mein jaata hai — chahe Swiggy ho, CRED ho, ya koi bhi modern startup. Docker seekhna Spring Boot ke saath essential hai.

### Basic Dockerfile (Simple, Seedha)

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

# Pehle dependency files copy karo (caching ke liye)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Dependencies download karo (yeh layer cache hogi agar pom.xml nahi badi)
RUN ./mvnw dependency:go-offline

# Apna source code copy karo
COPY src/ src/

# Build karo (tests skip karo — CI/CD mein alag stage hoti hai tests ke liye)
RUN ./mvnw clean package -DskipTests

# Stage 2: Run
# JDK nahi chahiye runtime pe — sirf JRE (chhota image)
FROM eclipse-temurin:21-jre
WORKDIR /app

# Sirf JAR copy karo build stage se
COPY --from=build /src/target/*.jar app.jar

# Andar port expose karo (documentation ke liye — actual binding docker run pe hoti hai)
EXPOSE 8080

# App start karo
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Yeh multi-stage build hai — pehle stage mein build hota hai (JDK chahiye), doosre mein sirf run hota hai (JRE enough). Final image chhoti hoti hai.

Build aur run karo:

```bash
docker build -t my-zomato-app:1.0 .
docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=prod my-zomato-app:1.0
```

### Layered JAR — Docker Deploys Fast Karo

Problem yeh hai ki basic Dockerfile mein poori fat JAR ek layer mein jaati hai — ~100-200MB. Code ka ek line bhi change karo, poori layer phir se upload. Slow aur expensive.

Solution: **Layered JAR**. Spring Boot JAR ko multiple layers mein tod do:

```xml
<!-- pom.xml mein plugin config -->
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

Build karne ke baad layers dekho:

```bash
java -Djarmode=layertools -jar app.jar list
# Output:
# dependencies          ← Spring, Hibernate, etc. — kabhi nahi badlte
# spring-boot-loader    ← Spring ka loader — kabhi nahi badlta
# snapshot-dependencies ← SNAPSHOT versions — kabhi kabhi badlte hain
# application           ← tumhara code — har commit pe badlta hai
```

Ab optimized Dockerfile:

```dockerfile
# Stage 1: JAR extract karo layers mein
FROM eclipse-temurin:21-jre AS extractor
WORKDIR /app
COPY target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# Stage 2: Layered image banao
FROM eclipse-temurin:21-jre
WORKDIR /app

# Pehle stable layers copy karo (yeh Docker cache mein rehti hain)
COPY --from=extractor /app/dependencies/           ./
COPY --from=extractor /app/spring-boot-loader/     ./
COPY --from=extractor /app/snapshot-dependencies/  ./

# Sabse aakhir mein application layer (yeh aksar badlti hai)
COPY --from=extractor /app/application/            ./

# Custom launcher use karo (java -jar nahi)
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Result: Code change karo, sirf chhoti si `application/` layer (~1-5MB) rebuild aur re-push hoti hai. Baaki sab cached rehta hai. Deploys dramatically fast ho jaate hain.

> [!tip] Real-World Impact
> Ek typical Spring Boot app ki fat JAR hoti hai ~150MB. Layered approach mein tumhara `application/` layer hoga ~2-3MB. Iska matlab CI/CD pipeline mein Docker push 5 minutes se 30 seconds aa jaata hai. Zomato ya Swiggy jaise companies daily 50+ deploys karte hain — yeh optimization unke liye massive hai.

---

## Buildpacks — Dockerfile Bhi Nahi Chahiye

Agar Docker likhna bhi nahi aata ya likhna nahi hai, Spring Boot ek shortcut deta hai:

```bash
mvn spring-boot:build-image

# Ya Gradle ke saath
./gradlew bootBuildImage
```

Yeh **Paketo Buildpacks** use karke automatically ek OCI-compatible Docker image banata hai. Koi Dockerfile nahi, koi configuration nahi.

```bash
# Image banegi kuch aise:
# docker.io/library/my-app:0.0.1-SNAPSHOT

# Chalao seedha
docker run -p 8080:8080 my-app:0.0.1-SNAPSHOT
```

Chhote projects aur proofs-of-concept ke liye zabardast hai. Production mein zyada control chahiye toh custom Dockerfile better hai.

---

## GraalVM Native Image — Blazing Fast Startup

Spring Boot 3 mein ek nayi cheez aayi — native compilation. Normally Java code JVM pe run hota hai (JIT compilation). GraalVM native image se tumhara code ek OS-native binary mein compile ho jaata hai.

```bash
# Maven ke saath
mvn -Pnative native:compile

# Gradle ke saath
./gradlew nativeCompile
```

Result:

| Feature | Regular JAR | Native Binary |
|---------|-------------|---------------|
| Startup time | 2-5 seconds | ~50ms |
| Memory | 200-500MB | 50-100MB |
| Build time | 30 seconds | 5-10 minutes |
| Docker image size | 200MB+ | 50MB |

Serverless functions (AWS Lambda) aur Kubernetes scale-to-zero ke liye game-changer hai. Lekin:

> [!warning] Native Image ke Tradeoffs
> - Build bahut slow hai (5-10 minutes)
> - Reflection use karne wale libraries (jaise kuch older Java code) ko "hints" dene padte hain
> - `@RegisterReflectionForBinding` ya `@ImportRuntimeHints` use karna pad sakta hai
> - Kuch features JVM pe easily kaam karte hain jo native mein tricky hain
>
> Production mein adopt karo sirf tab jab startup time ya cold-start latency genuinely problem hai.

---

## JAR vs WAR — Kya Lagana Chahiye?

```
JAR ← Hamesha yahi chahiye modern projects mein
WAR ← Sirf tab jab external Tomcat/WebSphere/JBoss server pe deploy karna ho
```

**JAR (Java ARchive):** Self-contained. Andar embedded Tomcat hota hai. `java -jar` se seedha chalta hai. Modern microservices, Docker, cloud — sab ke liye yahi.

**WAR (Web ARchive):** External application server mein drop karo. Legacy enterprise companies (banks, government) use karti hain jo pehle se Tomcat ya WebSphere pe invest kar chuki hain.

Agar koi legacy project nahi hai, hamesha JAR use karo. Period.

---

## Health Checks Aur Graceful Shutdown

Production mein sirf app start ho jaana kaafi nahi. Kubernetes aur load balancers ko batana padta hai — "mera app ready hai requests lene ke liye" aur "mujhe band karo toh gracefully karo, beech mein kisi ka request mat toro."

```yaml
# application.yml
server:
  shutdown: graceful           # In-flight requests complete hone do, phir band ho

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s  # Zyada se zyada 30 seconds wait karo

management:
  endpoints:
    web:
      exposure:
        include: health, info
  endpoint:
    health:
      probes:
        enabled: true          # /actuator/health/liveness aur /readiness enable ho jaate hain
```

Kubernetes ke liye:

```yaml
# kubernetes deployment.yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 20
  periodSeconds: 5
```

> [!info] Liveness vs Readiness
> - **Liveness:** App zinda hai ya crash ho gaya? (`/actuator/health/liveness`) — Fail hone pe Kubernetes pod restart karta hai
> - **Readiness:** App ready hai traffic lene ke liye? (`/actuator/health/readiness`) — Fail hone pe Kubernetes us pod pe traffic bhejta nahin. Startup ya DB connection drop pe useful.

---

## Tests Skip Karna — Kabhi Kab Theek Hai?

```bash
# Tests compile karo lekin run mat karo (CI mein kabhi mat karo)
mvn package -DskipTests

# Tests compile bhi mat karo (aur bhi fast, but risky)
mvn package -Dmaven.test.skip=true
```

**Local development mein:** `DskipTests` theek hai jab tum sirf JAR banake check karna chahte ho deployment kaisa lagta hai.

**CI/CD pipeline mein:** Tests HAMESHA run hone chahiye. Production pe jaane se pehle tests fail hone chahiye CI mein, na users ke paas jaane ke baad.

---

## Common Gotchas — Beginners Ki Galtiyan

> [!warning] Yeh Galtiyan Sabse Zyada Hoti Hain

**1. IDE se build ki JAR seedha chalana:**
Kabhi kabhi IDE builds Spring Boot repackage step skip kar deta hai. Hamesha `mvn package` run karo properly. IDE mein run karo development ke liye, packaging ke liye Maven/Gradle use karo.

**2. Do `main` classes project mein:**
```
Error: Unable to find main class
```
Agar tumne test mein ya kisi aur jagah bhi ek aur class banayi jo `main()` method rakhti hai, Spring Boot plugin confuse ho jaata hai. Fix:
```xml
<!-- pom.xml mein specify karo -->
<properties>
    <start-class>com.example.myapp.Application</start-class>
</properties>
```

**3. Resources JAR mein nahi hain:**
Agar `src/main/resources/` ke bahar koi file rakhi (jaise root directory mein `config.json`) toh woh JAR mein bundled nahi hogi. Sab kuch `src/main/resources/` ke andar rakhna.

**4. Native image mein reflection fail:**
```
ClassNotFoundException at runtime
```
Koi library ya code reflection use kar raha hai jo native build pe nahi chalta. Fix:
```java
@ImportRuntimeHints(MyHints.class)
public class Application { ... }

class MyHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection().registerType(MyClass.class, MemberCategory.INVOKE_ALL_METHODS);
    }
}
```

**5. Docker container mein Out of Memory:**
JVM by default container ki poori RAM ka 25% use karta hai. Chhote containers pe problem hoti hai. Explicitly set karo:
```bash
java -Xmx256m -Xms64m -jar app.jar
# Ya modern JVM ke saath:
java -XX:MaxRAMPercentage=75.0 -jar app.jar
```

**6. Docker layer churn (slow deploys):**
Fat JAR ko ek layer mein daala toh har code change pe ~150MB push hota hai. Layered JAR use karo (upar dekho).

**7. `mvn spring-boot:run` mein galat profile load:**
```bash
# Koi profile set nahi ki toh default load hoga
mvn spring-boot:run

# Explicitly set karo
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**8. Port 8080 already in use:**
```
Web server failed to start. Port 8080 was already in use.
```
```bash
# Kaun use kar raha hai check karo (Windows)
netstat -ano | findstr :8080

# Ya seedha alag port de do
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=9090"
```

---

## Quick Reference — Sab Commands Ek Jagah

```bash
# ===== DEVELOPMENT =====

# App chalao (basic)
mvn spring-boot:run

# App chalao dev profile ke saath
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# App chalao alag port pe
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=9090"

# ===== BUILD =====

# Fat JAR banao
mvn clean package

# Fat JAR banao (tests skip)
mvn clean package -DskipTests

# Gradle equivalent
./gradlew bootJar

# ===== RUN JAR =====

# Basic run
java -jar target/my-app-0.0.1-SNAPSHOT.jar

# Production ke saath configs
java -Xmx512m -XX:+UseG1GC \
  -Dspring.profiles.active=prod \
  -jar target/my-app-0.0.1-SNAPSHOT.jar

# ===== DOCKER =====

# Docker image banao (Buildpacks — no Dockerfile)
mvn spring-boot:build-image

# Layers dekhna
java -Djarmode=layertools -jar app.jar list

# Layers extract karna (Dockerfile mein use hoti hai)
java -Djarmode=layertools -jar app.jar extract

# ===== NATIVE =====

# GraalVM native binary banao
mvn -Pnative native:compile

# Gradle ke saath
./gradlew nativeCompile
```

---

## Key Takeaways

- **Fat JAR** ek self-contained artifact hai — tumhara code + saari dependencies + embedded Tomcat, sab ek `.jar` mein. `java -jar app.jar` — bas itna kaafi hai.
- **Development ke liye** `mvn spring-boot:run` best hai, IDE run second best. Production ke liye hamesha `mvn clean package` se proper JAR banao.
- **`spring-boot-maven-plugin`** `pom.xml` mein zaroori hai — iske bina plain JAR banta hai jo executable nahi hota.
- **CLI args** (`--server.port=9090`) aur system properties (`-Dspring.profiles.active=prod`) `application.yml` se zyada priority rakhte hain — production debugging ke time yaad rakhna.
- **Environment variables** (`SERVER_PORT`, `SPRING_PROFILES_ACTIVE`) Docker aur Kubernetes ke liye standard hai.
- **Layered JARs** Docker deployments dramatically fast karte hain — code change pe sirf ~2MB layer re-push hoti hai, ~150MB nahi.
- **GraalVM native** blazing fast startup deta hai (50ms) lekin build slow hai aur reflection tricky. Serverless ke liye consider karo.
- **WAR nahi, JAR** — jab tak legacy external application server nahi hai.
- **Graceful shutdown** aur **health probes** production-grade deployment ke liye zaruri hain — Kubernetes inhe actively use karta hai.
- Container mein **JVM memory** explicitly set karo (`-Xmx` ya `-XX:MaxRAMPercentage`) — default 25% RAM kaafi nahi hota chhote containers pe.

# Maven Basics

> [!info] Node.js developer ke liye ek line mein samajhna ho toh —
> Maven = npm + tsc + jest + npm pack + npm publish, sab kuch ek XML file (`pom.xml`) se chalata hai. Verbose hai, thoda frustrating bhi lagta hai pehle pehle, lekin ek baar samajh gaye toh har machine pe, har team member ke paas, exact same output milega. Guaranteed. Always.

---

## Maven Kyun Aaya? Kya Problem Solve Karta Hai?

Socho 2003 ke Java developer ki life kaisi thi. Tumhara ek colleague Bengaluru mein hai, ek Mumbai mein. Dono ek hi project pe kaam kar rahe hain. Mumbai wale ne library ka version 1.2 download kiya, Bengaluru wale ne 1.5. Ab build different behave karta hai dono machines pe. Tests pass hain ek machine pe, fail hain doosri pe. "Works on my machine" — ye problem Java world mein bahut badi thi.

Maven aaya aur bola: **"Bhai, dependency mat manually download kar. Main karunga. Sab kuch `pom.xml` mein likho, main ensure karunga ki tumhare aur tumhare team ke builds identical honge."**

Node.js mein tumne ye already experience kiya hai — `package.json` aur `package-lock.json` ki wajah se `npm install` karo toh exact same `node_modules` milta hai. Maven ne Java mein yahi revolution kiya, aur wo Node.js se kaafi pehle.

### Maven Teen Kaam Karta Hai:

1. **Dependency Manager** — JARs (Java ke npm packages) ko Maven Central (Java ka npmjs.com) se download karta hai aur `~/.m2/repository/` mein cache karta hai
2. **Build Orchestrator** — compile, test, package, deploy — sab ek sequence mein karta hai
3. **Convention Enforcer** — ek standard project structure follow karna padta hai; deviation pe Maven naraaz hota hai (aur ho bhi sakta hai tumhara pipeline toot jaye)

---

## Standard Project Layout — Convention Over Configuration

Node.js mein tum kuch bhi kahin bhi rakh sakte ho. `src/`, `lib/`, `dist/` — tumhari marzi. Maven mein aisa nahi hai. **Ek fixed structure hai, aur usi mein rehna hai.**

```
my-app/
├── pom.xml                        ← yahan sab kuch define hota hai (package.json jaisa)
├── src/
│   ├── main/
│   │   ├── java/                  ← tumhara actual source code (src/ jaisa)
│   │   │   └── com/
│   │   │       └── acme/
│   │   │           └── App.java
│   │   └── resources/             ← config files: application.yml, logback.xml, templates
│   └── test/
│       ├── java/                  ← test files (__tests__/ jaisa)
│       └── resources/             ← test ke liye alag config
└── target/                        ← build output (dist/ jaisa — gitignore karo isse!)
    ├── classes/                   ← compiled .class files
    ├── test-classes/
    └── my-app-1.0.0.jar           ← final packaged artifact
```

> [!tip] Golden Rule
> `target/` folder ko kabhi commit mat karna. Ye `.gitignore` mein hona chahiye. Ye exactly `node_modules/` jaisa hai — regenerate ho sakta hai, commit mein nahi chahiye.

Node.js se aane wale ek common mistake karte hain — apni classes `src/` mein directly rakh dete hain `src/main/java/` ke bajaye. Maven tab build karne se mana kar deta hai. Structure follow karo, zindagi aasaan ho jaayegi.

---

## `pom.xml` — Tumhara Project ka DNA

`pom.xml` = Project Object Model. Ye file tumhare project ka sara kuch define karti hai. Samajho ye IRCTC ka reservation form hai — har field ka ek specific purpose hai, kuch bhi chhoot gaya toh booking nahi hogi.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <!-- =====================================================
         SECTION 1: IDENTITY (GAV Coordinates)
         Har artifact ka unique address hota hai Maven world mein
         GroupId + ArtifactId + Version = "GAV" kehte hain ise
         ===================================================== -->
    <groupId>com.acme</groupId>           <!-- company/org domain reverse mein -->
    <artifactId>my-app</artifactId>       <!-- project ka naam (kebab-case) -->
    <version>1.0.0-SNAPSHOT</version>     <!-- SNAPSHOT = dev mein hai abhi -->
    <packaging>jar</packaging>            <!-- jar | war | pom -->

    <!-- =====================================================
         SECTION 2: PARENT (Inheritance)
         Spring Boot ka parent use karo toh sab versions pre-set milte hain
         Node.js mein iska equivalent nahi hai exactly
         ===================================================== -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>   <!-- Maven Central se dhundho, local nahi -->
    </parent>

    <!-- =====================================================
         SECTION 3: PROPERTIES (Variables)
         Reusable values define karo yahan, ${property.name} se use karo
         ===================================================== -->
    <properties>
        <java.version>21</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <!-- =====================================================
         SECTION 4: DEPENDENCIES
         Ye tumhara package.json ka "dependencies" section hai
         ===================================================== -->
    <dependencies>
        <!-- Web server + REST APIs ke liye -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <!-- version nahi likha — parent se inherit hoga automatically -->
        </dependency>

        <!-- PostgreSQL driver — runtime pe chahiye, compile time pe nahi -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>   <!-- devDependencies jaisa, lekin JAR mein jaata hai -->
        </dependency>

        <!-- Testing ke liye — final JAR mein nahi jaata -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>   <!-- devDependencies jaisa exactly -->
        </dependency>
    </dependencies>

    <!-- =====================================================
         SECTION 5: BUILD PLUGINS
         Extra build kaam ke liye — npm scripts jaisa
         Spring Boot plugin fat JAR banata hai (sab dependencies include)
         ===================================================== -->
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <!-- ye plugin runnable JAR banata hai — sab kuch inside ek file -->
            </plugin>
        </plugins>
    </build>
</project>
```

### Node.js se Comparison — Kya Match Karta Hai?

| Maven Concept | `pom.xml` mein | Node.js equivalent |
|---|---|---|
| Project identity | `groupId` + `artifactId` + `version` | `name` + `version` in `package.json` |
| Parent/inheritance | `<parent>` | koi direct equivalent nahi |
| Variables | `<properties>` | `.env` ya `package.json` fields |
| Runtime libraries | `<scope>compile</scope>` (default) | `dependencies` |
| Test-only libraries | `<scope>test</scope>` | `devDependencies` |
| Build tools | `<build><plugins>` | `scripts` + webpack/esbuild config |
| Registry | Maven Central | npmjs.com |
| Local cache | `~/.m2/repository/` | `~/.npm/` ya `node_modules/` |

---

## GAV Coordinates — Har Dependency ka Unique Address

Maven mein kisi bhi library ko identify karne ke liye teen cheezein chahiye — `groupId`, `artifactId`, `version`. Isko **GAV coordinates** kehte hain. Socho ye Zomato ka exact address hai — city + area + ghar number — teen teeno chahiye delivery ke liye.

```
groupId:artifactId:version
com.fasterxml.jackson.core:jackson-databind:2.17.2
```

Maven Central pe jaake search kar sakte ho: [search.maven.org](https://search.maven.org)

---

## Maven Lifecycle — Kaam Kaise Hota Hai Step by Step

Ye Maven ka sabse important concept hai. **Lifecycle ek fixed sequence of phases hai.** Jab tum koi phase run karte ho, usse pehle ke saare phases bhi automatically run hote hain.

```
validate → compile → test → package → verify → install → deploy
```

Socho ye Swiggy ke order ka flow hai:
- Order placed (validate)
- Restaurant ne accept kiya (compile)
- Food bana (test — sab sahi hai na?)
- Packaging ho gayi (package)
- Quality check (verify)
- Delivery boy ke paas (install — local repo mein)
- Tumhare ghar pe (deploy — remote server pe)

Tum beech mein jump nahi kar sakte. Agar `mvn package` chalaate ho, toh `validate`, `compile`, `test` pehle chalenge — tab `package` chalega.

### Phases ki Details

| Phase | Kya Karta Hai | npm equivalent |
|---|---|---|
| `validate` | `pom.xml` sahi hai na? Basic sanity check | (no equivalent) |
| `compile` | `src/main/java` → `target/classes` mein `.class` files | `tsc` |
| `test` | Unit tests run karta hai (JUnit via Surefire plugin) | `npm test` |
| `package` | Sab compile output ko ek `.jar` mein band karta hai | `tsc && npm pack` |
| `verify` | Integration tests run karta hai (Failsafe plugin) | `npm run test:e2e` |
| `install` | JAR ko `~/.m2/repository/` mein copy karta hai | `npm link` |
| `deploy` | Remote repository (Nexus, GitHub Packages) pe publish | `npm publish` |

Plus do alag lifecycles hain:
- **`clean`** — `target/` folder wipe kar deta hai (fresh start)
- **`site`** — HTML documentation generate karta hai

### Goals vs Phases — Ek Subtle Difference

Har phase ke andar **goals** hote hain jo actually kaam karte hain. Plugin goals kisi phase se "bind" hote hain. Jab `mvn package` chalate ho, Maven:
1. Har phase ke liye bound goals dhundta hai
2. Sequence mein run karta hai

Tum directly goal bhi run kar sakte ho without lifecycle:
```bash
mvn dependency:tree    # dependency plugin ka "tree" goal directly run karo
mvn spring-boot:run    # Spring Boot plugin ka "run" goal
```

---

## Common Commands — Roz Kaam Aane Wale

```bash
# Sabse pehle ye yaad karo
mvn clean package          # fresh build karo, JAR banao (tests bhi chalenge)
mvn clean package -DskipTests  # build karo, tests skip karo (jaldi chahiye toh)
mvn spring-boot:run        # local development pe app run karo

# Debugging ke liye
mvn dependency:tree        # kaunsi library kaun si library laa rahi hai? poora tree dekho
mvn dependency:tree -Dincludes=org.springframework   # filter karo specific group ke liye
mvn help:effective-pom     # parent se inherit karke final pom kya bana? dekho
mvn versions:display-dependency-updates  # kaunse updates available hain?

# Useful flags
mvn clean package -DskipTests          # tests skip (compile hoge, run nahi)
mvn -Dmaven.test.skip=true package     # tests compile bhi nahi honge
mvn -o package                         # offline mode — internet nahi chahiye
mvn -v                                 # Maven version check karo

# Multi-module projects ke liye
mvn -pl billing-service -am install    # sirf billing-service aur uske dependencies build karo
```

---

## Dependency Declarations — Full Detail

```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.2</version>
    <scope>compile</scope>     <!-- default scope — explicitly likhna zaruri nahi -->
    <optional>false</optional> <!-- true karo toh downstream projects ko ye nahi milega -->

    <!-- Koi transitive dependency nahi chahiye? Exclude karo -->
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

### Dependency Scopes — Bahut Important Concept

Scope define karta hai ki dependency kab available hogi aur final JAR mein jaayegi ya nahi:

| Scope | Compile pe? | Test pe? | Final JAR mein? | Kab Use Karo |
|---|---|---|---|---|
| `compile` | Haan | Haan | Haan | Default — most libraries |
| `provided` | Haan | Haan | **Nahi** | Servlet API — server provide karta hai already |
| `runtime` | **Nahi** | Haan | Haan | JDBC drivers, logging implementations |
| `test` | Nahi | Haan | Nahi | JUnit, Mockito — sirf testing ke liye |
| `system` | Haan | Haan | Nahi | Avoid karo — local file system path specify karna padta hai |

#### Real Example — JDBC Driver `runtime` Kyun Hota Hai?

```xml
<!-- PostgreSQL driver — runtime scope -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

Tumhara Java code kabhi directly `import org.postgresql.*` nahi karta. Tum JDBC API use karte ho (`java.sql.Connection`, etc.) jo JDK mein already hai. PostgreSQL driver runtime pe load hota hai under the hood. Isliye compile time pe chahiye nahi, lekin final JAR mein jaana chahiye — `runtime` scope perfect hai.

#### Node.js se Comparison

```
compile  ≈  dependencies (runtime mein chahiye)
test     ≈  devDependencies (sirf development/testing)
provided ≈  peerDependencies (host environment provide karega)
runtime  ≈  dependencies lekin code mein directly import nahi karte
```

---

## Properties — DRY Principle Maven Mein

Version numbers ek jagah define karo, poore `pom.xml` mein reuse karo:

```xml
<properties>
    <java.version>21</java.version>
    <jackson.version>2.17.2</jackson.version>
    <mapstruct.version>1.5.5.Final</mapstruct.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>

<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>${jackson.version}</version>   <!-- property reference -->
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-core</artifactId>
        <version>${jackson.version}</version>   <!-- same version, ek jagah se manage -->
    </dependency>
</dependencies>
```

Built-in properties jo always available hain:
- `${project.version}` — tumhare project ka version
- `${project.basedir}` — project root directory ka path
- `${project.build.directory}` — `target/` folder ka path
- `${env.HOME}` — system environment variable

---

## Profiles — Environment Switching

Socho tumhe dev aur prod mein alag configuration chahiye. Maven profiles isi ke liye hain:

```xml
<profiles>
    <!-- Development profile — default active -->
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <log.level>DEBUG</log.level>
            <db.url>jdbc:postgresql://localhost:5432/mydb_dev</db.url>
        </properties>
    </profile>

    <!-- Production profile -->
    <profile>
        <id>prod</id>
        <properties>
            <log.level>INFO</log.level>
            <db.url>jdbc:postgresql://prod-server:5432/mydb_prod</db.url>
        </properties>
        <dependencies>
            <!-- Prod mein extra monitoring library -->
            <dependency>
                <groupId>io.micrometer</groupId>
                <artifactId>micrometer-registry-datadog</artifactId>
            </dependency>
        </dependencies>
    </profile>

    <!-- CI/CD pipeline ke liye -->
    <profile>
        <id>ci</id>
        <properties>
            <maven.test.failure.ignore>false</maven.test.failure.ignore>
        </properties>
    </profile>
</profiles>
```

```bash
mvn package -Pprod        # prod profile activate karo
mvn package -Pdev,ci      # multiple profiles ek saath
mvn package -P!dev        # specific profile ko exclude karo
```

---

## `settings.xml` vs `pom.xml` — Dono Alag Cheezein Hain

| | `pom.xml` | `~/.m2/settings.xml` |
|---|---|---|
| Location | Project root mein | User ke home directory mein |
| Git mein jaata hai? | **Haan** | **Nahi — kabhi nahi!** |
| Kya hota hai? | Project configuration | Personal/machine-specific settings |
| Use case | Dependencies, plugins, build config | Credentials, mirror URLs, proxy settings |

`settings.xml` mein tumhara Nexus/Artifactory ka password hoga — ye obviously Git mein nahi jaana chahiye. `pom.xml` team ke saath share hoti hai — isme sensitive data nahi hona chahiye kabhi.

```xml
<!-- ~/.m2/settings.xml example -->
<settings>
    <servers>
        <server>
            <id>company-nexus</id>
            <username>siddesh</username>
            <password>secret-password</password>  <!-- .env jaisa treat karo isse -->
        </server>
    </servers>
    <mirrors>
        <mirror>
            <id>company-mirror</id>
            <mirrorOf>central</mirrorOf>
            <url>https://nexus.acme.com/repository/maven-public/</url>
        </mirror>
    </mirrors>
</settings>
```

---

## SNAPSHOT vs Release Versions — Kya Fark Hai?

```xml
<version>1.0.0-SNAPSHOT</version>   <!-- development mein -->
<version>1.0.0</version>             <!-- production release -->
```

**SNAPSHOT** ka matlab hai "abhi bhi develop ho raha hai." Maven SNAPSHOT versions ko daily re-fetch karta hai (ya force karo `-U` flag se). Iska matlab hai:
- Tumhara teammate kuch update push kare SNAPSHOT version mein
- Tumhare paas automatically nayi version aa jaayegi next build pe
- **Good for development, bad for production**

Release versions immutable hote hain — ek baar publish hua, forever wahi rahega Maven Central pe.

> [!warning] Production mein SNAPSHOT kabhi nahi
> CI/CD pipeline mein ya production deployment mein SNAPSHOT version dependency kabhi mat rakhna. Build reproducibility khatam ho jaayegi. `1.0.0-SNAPSHOT` ko `1.0.0` mein convert karo release ke time pe.

---

## Complete Example — Ek Real Spring Boot App ka `pom.xml`

Ye ek billing service ka realistic example hai — jaise Zomato ka payment processing service:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Spring Boot parent — iska fayda ye hai ki versions manage nahi karne padte -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <!-- Is service ki identity -->
    <groupId>com.zomato</groupId>
    <artifactId>billing-service</artifactId>
    <version>2.1.0-SNAPSHOT</version>
    <name>Billing Service</name>
    <description>Payment processing aur invoice generation service</description>

    <properties>
        <java.version>21</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <!-- Custom version management -->
        <mapstruct.version>1.5.5.Final</mapstruct.version>
    </properties>

    <dependencies>
        <!-- REST API endpoints ke liye -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Database ke saath kaam ke liye (JPA/Hibernate) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- Input validation (@Valid, @NotNull, etc.) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Security ke liye (JWT, authentication) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- PostgreSQL JDBC driver — runtime pe load hoga -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok — boilerplate code hatata hai (getters, setters, constructors) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>   <!-- downstream projects ko nahi milega -->
        </dependency>

        <!-- DTO ↔ Entity mapping ke liye -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${mapstruct.version}</version>
        </dependency>

        <!-- Testing stack -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Runnable fat JAR banata hai — sab dependencies iske andar -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <!-- Lombok compile-time tool hai, final JAR mein nahi chahiye -->
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>

            <!-- MapStruct code generation ke liye annotation processor -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${mapstruct.version}</version>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## TypeScript Developer ke liye Full Comparison Table

| Concept | npm/Node.js | Maven |
|---|---|---|
| Manifest file | `package.json` | `pom.xml` |
| Dependency declaration | `dependencies` field | `<dependencies>` element |
| Lock file | `package-lock.json` | (pom.xml mein version pin hota hai; Maven Central immutable hai) |
| Build run karo | `npm run build` | `mvn package` |
| Test run karo | `npm test` | `mvn test` |
| Local cache | `~/.npm/` | `~/.m2/repository/` |
| Monorepo/workspace | `workspaces` | Multi-module project (parent `pom`) |
| Binary run karo | `npx some-tool` | `mvn plugin:goal` |
| Publish | `npm publish` | `mvn deploy` |
| Dev dependencies | `devDependencies` | `<scope>test</scope>` |
| Peer dependencies | `peerDependencies` | `<scope>provided</scope>` |
| Node version lock | `engines` field | `<maven.compiler.release>` property |
| Arbitrary scripts | `scripts` mein kuch bhi | Nahi — sirf lifecycle phases ya plugin goals |
| Version ranges | `^1.2.3` ya `~1.2` | `[1.2,2.0)` — possible hai lekin avoid karo |

**Sabse badi difference:** npm mein tum `scripts` mein kuch bhi likh sakte ho. Maven mein arbitrary commands nahi chalaate — sirf lifecycle phases ya plugin goals. Agar kuch extra karna hai, plugin likhna padta hai ya existing plugin configure karna padta hai. Constraint lagta hai pehle, but consistency deta hai baad mein.

---

## Common Gotchas — Beginners Ye Mistakes Karte Hain

> [!warning] Ye traps yaad rakho

**1. `mvn install` vs `mvn package` — Bahut Important Difference**

```bash
mvn package   # target/ mein JAR banata hai — bas
mvn install   # target/ mein JAR banata hai + ~/.m2/repository/ mein bhi copy karta hai
```

Agar tumhara project A, project B pe depend karta hai (dono local hain), toh B ko `mvn install` karna padega. Sirf `mvn package` kiya toh A ko B nahi milega resolve hone ke liye.

**2. SNAPSHOT Versions Daily Fetch Hote Hain**

SNAPSHOT dependency hai? Har roz Maven re-fetch karne ki koshish karta hai. Slow internet pe frustrating ho sakta hai. Force update karo ya skip karo:
```bash
mvn package -U    # force update all SNAPSHOTs
mvn package -o    # offline mode — network mat touch karo
```

**3. Transitive Dependencies — Dependency ki Dependency**

Tum Jackson add karte ho, Jackson automatically 3-4 aur libraries le aata hai. Kabhi kabhi conflict hota hai — ek library ka version dusre se clash karta hai.

```bash
mvn dependency:tree   # poora tree dekho — kaun kya laa raha hai
mvn dependency:tree -Dverbose   # conflict bhi dikhao
```

Conflict resolve karna ho toh explicitly version declare karo ya exclude karo:
```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.2</version>
    <exclusions>
        <exclusion>
            <!-- Ye old version koi aur library laa raha tha, hum nahi chahte -->
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

**4. Parent ke bina Plugin Version — Risky**

Spring Boot parent use karo toh plugin versions auto-managed hain. Agar standalone project ho aur parent nahi hai:
```xml
<!-- Version specify karo warna Maven jo milega wo use karega — unpredictable -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.13.0</version>   <!-- explicitly specify karo -->
</plugin>
```

**5. `target/` Delete Karna Bhool Jaana**

Kabhi kabhi stale `.class` files issues create karte hain. Fresh build ke liye:
```bash
mvn clean package   # clean pehle, phir package
```
`clean` `target/` folder completely wipe karta hai.

**6. Profiles Activate Hue Ya Nahi — Check Karo**

```bash
mvn help:active-profiles   # kaunse profiles currently active hain?
mvn package -Pprod -X      # debug mode mein run karo — verbose output
```

**7. `settings.xml` Git Mein Push Karna**

Production credentials, API keys, registry passwords — ye `~/.m2/settings.xml` mein hote hain. Ye file kabhi repository mein commit mat karna. Team ke liye `settings.xml.template` bana ke commit karo (credentials blank rakhke), aur README mein explain karo.

---

## Maven Wrapper — Team Consistency ke liye

Ek common problem: tumhare paas Maven 3.8 hai, teammate ke paas 3.6. Minor differences mein issues aa sakte hain. Solution hai **Maven Wrapper**:

```bash
# Project mein wrapper add karo (ek baar)
mvn wrapper:wrapper

# Ab mvn ki jagah ./mvnw use karo
./mvnw clean package      # Linux/Mac
.\mvnw.cmd clean package  # Windows
```

Wrapper automatically sahi Maven version download karta hai. Tumhe globally Maven install karne ki zarurat bhi nahi hai — sirf Java chahiye. CI/CD pipelines mein ye bahut kaam aata hai.

---

## Key Takeaways

- **Maven = npm + tsc + jest + npm publish**, sab `pom.xml` se driven. XML verbose lagti hai lekin predictable hai — har machine pe same output.

- **GAV coordinates** (`groupId:artifactId:version`) har dependency ka unique address hai Maven world mein. Version ke bina dependency exist nahi kar sakti.

- **Standard project structure follow karo** — `src/main/java/`, `src/test/java/`, `target/` — isse deviate karna problems laata hai.

- **Lifecycle phases sequential hain** — `mvn package` matlab validate + compile + test + package sab chalega. Beech mein skip nahi hota.

- **Dependency scopes samjho** — `compile` (default), `runtime` (JDBC drivers), `test` (JUnit/Mockito), `provided` (Servlet API). Galat scope production issues create karta hai.

- **`mvn install` vs `mvn package`** — multi-module ya local dependencies ke saath `install` use karo; sirf JAR build karna hai toh `package`.

- **SNAPSHOT = mutable, Release = immutable** — production mein kabhi SNAPSHOT mat use karo.

- **`pom.xml` commit karo, `settings.xml` kabhi nahi** — credentials aur personal settings `~/.m2/settings.xml` mein, project config `pom.xml` mein.

- **`mvn dependency:tree`** tumhara best friend hai jab koi mysterious library conflict aaye.

- **Maven Wrapper (`./mvnw`)** use karo team projects mein — Java ke alawa kuch install nahi karna padega.

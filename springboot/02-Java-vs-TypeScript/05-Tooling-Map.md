---
tags: [java, typescript, tooling, comparison, devtools, foundation]
aliases: [Tooling Map, Dev Tools, JS to Java tools]
stage: foundation
---

# Tooling Map: Node Dev Tools → Java Equivalents

> [!info] For the Express/TS dev
> Every tool you reach for in a Node project has a Java twin — sometimes one-to-one, sometimes "the JVM ecosystem just does this differently." This note is a lookup table you can keep open while you set up your first Spring Boot project.

## At-a-glance master table

| Purpose             | Node / TS                       | Java / Spring Boot                                       |
| ------------------- | ------------------------------- | -------------------------------------------------------- |
| Hot reload          | `nodemon`, `tsx watch`          | `spring-boot-devtools`                                   |
| Test runner         | `jest`, `vitest`                | `JUnit 5` (Jupiter)                                      |
| Mocking             | `jest.mock`                     | `Mockito`                                                |
| Assertions          | `expect`                        | `AssertJ`                                                |
| Snapshot tests      | `toMatchSnapshot`               | `JsonAssert`, `approvaltests-java`                       |
| API/contract test   | `supertest`                     | Spring `MockMvc`, `WebTestClient`, `RestAssured`         |
| Linter              | `eslint`                        | `Checkstyle`, `PMD`, `SpotBugs`, `ErrorProne`            |
| Formatter           | `prettier`                      | `Spotless` (with `google-java-format` or Palantir)       |
| Type-check (CI)     | `tsc --noEmit`                  | `javac` — always part of compile                         |
| REPL                | `node`, `ts-node`               | `jshell`                                                 |
| Env config          | `dotenv` + `process.env`        | `application.yml` + Spring Profiles                      |
| Logger              | `pino`, `winston`               | `SLF4J` + `Logback`                                      |
| Debugger            | Node `--inspect`                | JDWP (`-agentlib:jdwp=…`); IDEs handle this for you      |
| Process manager     | `pm2`                           | systemd / Docker (`java -jar`)                           |
| Bundler             | `esbuild`, `webpack`            | None — Maven/Gradle build a fat JAR                      |
| Package manager     | `npm`, `pnpm`, `yarn`           | `Maven`, `Gradle`                                        |
| Monorepo tool       | `turborepo`, `nx`               | Maven multi-module / Gradle composite                    |
| Migration runner    | `prisma migrate`, `knex`        | `Flyway`, `Liquibase`                                    |
| API docs            | `swagger-jsdoc`, `tsoa`         | `springdoc-openapi`                                      |
| HTTP client (test)  | `undici`, `nock`                | `WireMock`, `MockServer`                                 |
| Container hot reload| Docker volumes + nodemon        | Docker + `Spring Boot DevTools` + remote debug          |
| Docs generator      | TypeDoc                         | Javadoc                                                  |
| Coverage            | `c8`, `nyc`                     | `JaCoCo`                                                 |
| Mutation testing    | `stryker`                       | `Pitest`                                                 |
| Property tests      | `fast-check`                    | `jqwik`                                                  |
| BDD                 | `cucumber-js`                   | `Cucumber-JVM`                                           |
| Static analysis     | `sonarqube` (via TS plugin)     | `SonarQube` (Java is its native turf)                    |
| Dependency scanner  | `npm audit`, `snyk`             | `dependency-check` (OWASP), `snyk`                       |
| Live reload (browser)| HMR                            | `LiveReload` server in `spring-boot-devtools`            |

## Hot reload: `nodemon` ↔ `spring-boot-devtools`

Add to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

DevTools watches the classpath; when a `.class` file changes (your IDE auto-builds on save, or you run `mvn compile`), it restarts the application context — much faster than a cold JVM start because classloaders for libraries are reused.

> [!tip] In IntelliJ enable: Settings → Build, Execution, Deployment → Compiler → "Build project automatically". Then `Ctrl+Shift+F9` (or auto on save).

## Testing: `jest` ↔ `JUnit 5 + Mockito + AssertJ`

```ts
// Jest
describe('UserService', () => {
    it('returns user by id', async () => {
        const repo = { findById: jest.fn().mockResolvedValue({ id: 1, name: 'Ada' }) };
        const svc = new UserService(repo);
        await expect(svc.find(1)).resolves.toEqual({ id: 1, name: 'Ada' });
    });
});
```

```java
// JUnit 5 + Mockito + AssertJ
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repo;
    @InjectMocks UserService svc;

    @Test
    void returnsUserById() {
        when(repo.findById(1L)).thenReturn(Optional.of(new User(1L, "Ada")));
        assertThat(svc.find(1L)).isEqualTo(new User(1L, "Ada"));
    }
}
```

For HTTP-level tests, `MockMvc` is the supertest equivalent:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UserService svc;

    @Test
    void getsUser() throws Exception {
        when(svc.find(1L)).thenReturn(new User(1L, "Ada"));
        mvc.perform(get("/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Ada"));
    }
}
```

## Linting & formatting: `eslint` + `prettier` ↔ `checkstyle` + `spotless`

`Spotless` is the closest to Prettier — it formats and can auto-fix.

```xml
<!-- pom.xml -->
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
            <importOrder/>
        </java>
    </configuration>
</plugin>
```

Run `mvn spotless:apply` to format, `mvn spotless:check` in CI.

For lint-style rules, `Checkstyle` enforces style and `ErrorProne` (a `javac` plugin from Google) catches semantic bugs at compile time.

## Env config: `dotenv` ↔ `application.yml` + profiles

```ts
// .env
DATABASE_URL=postgres://localhost:5432/dev
LOG_LEVEL=debug

// usage
const url = process.env.DATABASE_URL;
```

```yaml
# src/main/resources/application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/dev
logging:
  level:
    root: ${LOG_LEVEL:info}
```

Profile-specific overrides via `application-{profile}.yml`:

```yaml
# application-prod.yml
spring:
  datasource:
    url: ${DATABASE_URL}
  jpa:
    hibernate:
      ddl-auto: validate
```

Activate with `--spring.profiles.active=prod` or `SPRING_PROFILES_ACTIVE=prod`. Spring resolves `${VAR:default}` from env vars, system properties, and yml — in priority order.

> [!tip] Use `@ConfigurationProperties` to bind YAML straight into a typed record.
> ```java
> @ConfigurationProperties("acme.payments")
> public record PaymentConfig(String apiKey, Duration timeout) {}
> ```

## Logging: `pino` ↔ `SLF4J + Logback`

```java
private static final Logger log = LoggerFactory.getLogger(MyClass.class);

log.info("Processing user id={}, name={}", id, name);
log.error("Failed", ex);
```

The `{}` placeholders are deferred — no string concat unless the level is enabled. Configure via `logback-spring.xml`:

```xml
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder><pattern>%d %-5level [%thread] %logger{36} - %msg%n</pattern></encoder>
    </appender>
    <root level="info"><appender-ref ref="STDOUT"/></root>
    <logger name="com.acme" level="debug"/>
</configuration>
```

For JSON logs, swap the encoder to `logstash-logback-encoder`.

## REPL: `ts-node` ↔ `jshell`

```bash
$ jshell
jshell> int x = 21 * 2
x ==> 42
jshell> import java.time.*
jshell> LocalDate.now()
$3 ==> 2026-05-10
jshell> /exit
```

You can `/open MyFile.java` to load source. Useful for one-off experiments — but in practice most exploration happens in test methods (`Ctrl+Shift+F10` in IntelliJ runs the cursor's test).

## Coverage: `c8` ↔ `JaCoCo`

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution><goals><goal>prepare-agent</goal></goals></execution>
        <execution>
            <id>report</id><phase>verify</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
</plugin>
```

After `mvn verify`, open `target/site/jacoco/index.html`.

## API docs: `swagger-jsdoc` ↔ `springdoc-openapi`

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

Visit `/swagger-ui.html` once the app starts. Annotations like `@Operation`, `@ApiResponse` enrich the spec.

## TypeScript ↔ Java tooling at-a-glance

| Stage     | TS workflow                           | Java workflow                           |
| --------- | ------------------------------------- | --------------------------------------- |
| Init      | `npm init`, `tsc --init`              | `start.spring.io` or `mvn archetype:generate` |
| Install   | `npm install`                         | Edit `pom.xml`, IDE auto-fetches        |
| Run dev   | `nodemon src/index.ts`                | `mvn spring-boot:run` (devtools active) |
| Test      | `jest`                                | `mvn test`                              |
| Lint      | `eslint .`                            | `mvn checkstyle:check spotless:check`   |
| Format    | `prettier --write .`                  | `mvn spotless:apply`                    |
| Build     | `tsc && esbuild`                      | `mvn package` → `target/app.jar`        |
| Run prod  | `node dist/index.js`                  | `java -jar target/app.jar`              |

## Code example — minimal `pom.xml` with the essentials

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.acme</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope><optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

## Gotchas

> [!warning] Tooling traps
> - **DevTools doesn't reload non-Java resources** unless they're on the classpath; place templates in `src/main/resources`, not `webapp/`.
> - **`mvn spring-boot:run` ignores your IDE's auto-build**; either run from the IDE *or* keep `mvn` running.
> - **JaCoCo + Lombok**: generated methods may show as uncovered; configure exclusions.
> - **Spring profiles vs env vars**: a property in `application.yml` is *not* automatically reloaded — restart needed.
> - **`logback-spring.xml` vs `logback.xml`**: only the `-spring.xml` variant supports Spring property substitution.
> - **`jshell` and Spring**: `jshell` doesn't load your Spring beans; use a `@SpringBootTest` for that.

## Related

- [[01-Mental-Model-Map]]
- [[01-Maven-Basics]]
- [[06-Common-Plugins]]
- [[Spring-Boot-DevTools]]
- [[JUnit-and-Mockito]]

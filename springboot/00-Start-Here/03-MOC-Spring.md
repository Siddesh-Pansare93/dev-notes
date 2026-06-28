---
tags: [moc, spring, spring-boot]
aliases: [MOC Spring, Spring MOC]
stage: foundation
---

# MOC: Spring (Core, Boot, Web, Data, Security)

> [!info] Map of Content
> Spring is huge. This MOC is the curated entry point. The 4 big areas: **Core** (the IoC container), **Boot** (auto-configuration on top), **Web** (HTTP layer), **Data** (persistence). Security is a major fifth pillar.

> [!tip] Reading order
> Core → Boot → Web → Data → Security. Don't skip Core just because Boot hides it — when something breaks, you'll be debugging beans.

## Spring Core — the IoC container

- [[01-IoC-DI-Concepts]] — inversion of control, dependency injection
- [[02-Bean-Lifecycle]] — instantiation → DI → init → destroy
- [[03-Component-Scanning]] — `@Component`, `@Service`, `@Repository`, `@Controller`
- [[04-Configuration-Classes]] — `@Configuration` and `@Bean`
- [[05-Bean-Scopes]] — singleton vs prototype vs request
- [[06-Profiles]]
- [[07-AOP-and-Proxies]] — what `@Transactional` is *actually* doing
- [[08-ApplicationContext-and-Events]]

## Spring Boot — convention over configuration

- [[01-Spring-Boot-Project-Layout]]
- [[02-Spring-Boot-Auto-Configuration]] — the magic, demystified
- [[03-Application-Properties-and-YAML]]
- [[04-Configuration-Properties]] — typed config with `@ConfigurationProperties`
- [[05-Starters-Explained]] — what's in `spring-boot-starter-web`
- [[06-Profiles-Per-Environment]]
- [[07-DevTools-and-Live-Reload]]
- [[08-Conditional-Auto-Configuration]] — `@ConditionalOnClass`, `@ConditionalOnProperty`

## Web layer — REST APIs

- [[01-REST-Controllers]] — `@RestController`, `@RequestMapping`
- [[02-Request-Mapping-and-Path-Variables]] — `@PathVariable`, `@RequestParam`, `@RequestBody`
- [[03-DTOs-and-Serialization]]
- [[04-Bean-Validation]] — `@Valid`, `@NotBlank`, `@Size`, custom validators
- [[05-Exception-Handlers-and-ProblemDetail]] — RFC 7807 error responses
- [[06-Content-Negotiation]]
- [[07-File-Uploads]]
- [[08-CORS-Configuration]]
- [[09-OpenAPI-Swagger]]
- [[10-WebClient-and-RestClient]] — calling other APIs

> [!tip] WebFlux?
> Spring offers a reactive web stack (`spring-boot-starter-webflux`). With virtual threads (JDK 21+), most apps don't need it. See [[05-Virtual-Threads]] before adopting reactive.

## Persistence — Spring Data JPA

- [[01-JPA-Hibernate-Basics]] — JPA the spec, Hibernate the impl
- [[02-Entity-Basics]] — `@Entity`, `@Id`, `@GeneratedValue`, `@Column`
- [[03-Spring-Data-Repositories]] — `JpaRepository`, derived queries
- [[04-Query-Methods-and-JPQL]] — `@Query`, named queries, native SQL
- [[05-Transactions]] — `@Transactional`, propagation, isolation
- [[06-Relationships-and-Lazy-Loading]] — `@OneToMany`, `@ManyToOne`, fetch types
- [[07-N-Plus-1-and-Fetch-Strategies]] — the #1 JPA performance trap
- [[08-Migrations-Flyway-Liquibase]]
- [[09-Auditing]] — `@CreatedDate`, `@LastModifiedDate`
- [[10-Specifications-and-Criteria-API]] — dynamic queries
- [[11-Projections-and-DTOs]]

## Security

- [[01-Spring-Security-Basics]] — filter chain, `SecurityFilterChain` bean
- [[02-Authentication-vs-Authorization]]
- [[03-Password-Encoding]] — BCrypt, Argon2, never plain
- [[04-JWT-with-Spring-Security]]
- [[05-OAuth2-OIDC-with-Spring]] — resource server + client
- [[06-Method-Level-Security]] — `@PreAuthorize`, `@PostAuthorize`, SpEL
- [[07-CSRF-Sessions-and-Stateless-APIs]]
- [[08-CORS-and-Security]]

## Testing (cross-cutting)

- [[01-Testing-Strategy]] — pyramid, where Spring slices fit
- [[02-JUnit-5-Basics]]
- [[03-Mockito-and-AssertJ]]
- [[04-Spring-Boot-Test-Slices]] — `@WebMvcTest`, `@DataJpaTest`, `@JsonTest`
- [[05-Testcontainers]]
- [[06-Integration-Tests]] — `@SpringBootTest`, `MockMvc`, `RestAssured`

## Configuration & operations

- [[03-Application-Properties-and-YAML]]
- [[04-Configuration-Properties]]
- [[01-Spring-Boot-Actuator]]
- [[02-Micrometer-Metrics]]
- [[05-Health-Checks-and-Readiness]]

## Cross-references

For the surrounding ecosystem and deployment story, see:

- [[04-MOC-Microservices]] — when one Spring Boot app becomes many
- [[01-Library-Cheatsheet]] — Lombok, MapStruct, Jackson, Caffeine, Resilience4j
- [[06-FAQ-for-Express-Devs]] — quick orientation Q&A

## Suggested study path

> [!tip] If you only do five things from this MOC
> 1. [[01-IoC-DI-Concepts]] — without this, Spring stays magic forever
> 2. [[02-Spring-Boot-Auto-Configuration]] — to demystify the magic
> 3. [[01-REST-Controllers]] + [[05-Exception-Handlers-and-ProblemDetail]]
> 4. [[02-Entity-Basics]] + [[07-N-Plus-1-and-Fetch-Strategies]]
> 5. [[01-Spring-Security-Basics]] + [[04-JWT-with-Spring-Security]]

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[02-MOC-Java-Fundamentals]]
- [[04-MOC-Microservices]]
- [[05-Glossary]]

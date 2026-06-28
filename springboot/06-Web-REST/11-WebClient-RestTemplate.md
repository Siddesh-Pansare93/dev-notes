---
tags: [web-rest, http-client, webclient, resttemplate]
aliases: [WebClient, RestTemplate, RestClient, HTTP Client]
stage: intermediate
---

# WebClient & RestTemplate

> [!info] For the Express/TS dev
> Spring's HTTP clients are like `axios` / `fetch`:
> - **`RestTemplate`** — old, blocking, in maintenance mode (still supported, not removed). Roughly `axios` style.
> - **`WebClient`** — modern, reactive (`Mono`/`Flux`), works for blocking too via `.block()`.
> - **`RestClient`** (Spring 6.1+) — synchronous fluent API on top of `WebClient`'s machinery. **Use this for new blocking code.**
> - **HTTP Interface (`@HttpExchange`)** — Spring 6+, declarative interface clients (Retrofit/Feign style).

## Concept / How it works

| Client | Style | Status |
| --- | --- | --- |
| `RestTemplate` | Blocking, imperative | Maintenance mode |
| `RestClient` | Blocking, fluent (Spring 6.1+) | **Recommended for sync** |
| `WebClient` | Reactive non-blocking, can `.block()` | **Recommended for reactive** |
| HTTP Interface (`@HttpExchange`) | Declarative interface | Recommended for typed clients |

## Code example

### `RestClient` (Spring 6.1 / Boot 3.2+) — the new default

```java
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient githubClient(RestClient.Builder builder) {
        return builder
                .baseUrl("https://api.github.com")
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .requestInterceptor((req, body, exec) -> {
                    req.getHeaders().setBearerAuth(System.getenv("GH_TOKEN"));
                    return exec.execute(req, body);
                })
                .build();
    }
}

@Service
public class GithubService {
    private final RestClient github;

    public GithubService(RestClient githubClient) { this.github = githubClient; }

    public List<RepoDto> listRepos(String user) {
        return github.get()
                .uri("/users/{user}/repos", user)
                .retrieve()
                .body(new ParameterizedTypeReference<List<RepoDto>>() {});
    }

    public RepoDto getRepo(String owner, String repo) {
        return github.get()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError,
                          (req, res) -> { throw new ResourceNotFoundException("repo", repo); })
                .body(RepoDto.class);
    }

    public RepoDto createIssue(String owner, String repo, IssueRequest req) {
        return github.post()
                .uri("/repos/{owner}/{repo}/issues", owner, repo)
                .contentType(MediaType.APPLICATION_JSON)
                .body(req)
                .retrieve()
                .body(RepoDto.class);
    }
}
```

### `WebClient` — reactive

`pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

```java
@Configuration
public class WebClientConfig {
    @Bean
    public WebClient githubWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl("https://api.github.com")
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .build();
    }
}

@Service
public class GithubReactiveService {
    private final WebClient client;
    public GithubReactiveService(WebClient githubWebClient) { this.client = githubWebClient; }

    public Mono<RepoDto> getRepo(String owner, String repo) {
        return client.get()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError,
                          res -> res.bodyToMono(String.class)
                                    .map(b -> new ResourceNotFoundException("repo", repo)))
                .bodyToMono(RepoDto.class);
    }

    public Flux<RepoDto> streamRepos(String user) {
        return client.get()
                .uri("/users/{user}/repos", user)
                .retrieve()
                .bodyToFlux(RepoDto.class);
    }
}
```

### Declarative HTTP Interface (Retrofit-style)

```java
public interface GithubApi {

    @GetExchange("/users/{user}/repos")
    List<RepoDto> listRepos(@PathVariable String user);

    @GetExchange("/repos/{owner}/{repo}")
    RepoDto getRepo(@PathVariable String owner, @PathVariable String repo);

    @PostExchange("/repos/{owner}/{repo}/issues")
    IssueDto createIssue(@PathVariable String owner,
                         @PathVariable String repo,
                         @RequestBody IssueRequest req);
}

@Configuration
public class GithubApiConfig {
    @Bean
    public GithubApi githubApi(RestClient githubClient) {
        RestClientAdapter adapter = RestClientAdapter.create(githubClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(adapter).build();
        return factory.createClient(GithubApi.class);
    }
}
```

Now inject `GithubApi` like any service.

### `RestTemplate` (legacy, but you'll encounter it)

```java
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
            .rootUri("https://api.github.com")
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();
}

RepoDto repo = restTemplate.getForObject("/repos/{o}/{r}", RepoDto.class, owner, repo);
ResponseEntity<RepoDto> resp = restTemplate.exchange(
        "/repos/{o}/{r}", HttpMethod.GET, null, RepoDto.class, owner, repo);
```

## Express/TS comparison

```ts
// axios
const github = axios.create({
  baseURL: 'https://api.github.com',
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await github.get<Repo>(`/repos/${owner}/${repo}`);

// fetch
const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
const repo = await r.json();
```

| axios / fetch | Spring |
| --- | --- |
| `axios.create({ baseURL })` | `RestClient.Builder#baseUrl` |
| Interceptors | `requestInterceptor` |
| `axios.get<T>` | `.retrieve().body(T.class)` |
| `r.status` non-2xx → throws | `.onStatus(...)` |
| Async/await | Sync (`RestClient`) or `Mono`/`Flux` (`WebClient`) |
| `axios-retry` | `Retryable`, [[Resilience4j]] |
| Retrofit (mobile) | HTTP Interface (`@HttpExchange`) |

## Gotchas

> [!warning] `RestTemplate` and `WebClient.Builder` are auto-configured beans
> Boot exposes `RestTemplateBuilder`, `RestClient.Builder`, `WebClient.Builder`. Don't `new` them; inject the builder so you get auto-configured timeouts, observation, tracing.

> [!warning] Don't share a hand-built `WebClient` without timeouts
> Defaults can hang forever. Configure connect/read timeouts on the underlying connector (`ReactorClientHttpConnector` with `HttpClient.responseTimeout(...)`).

> [!warning] `WebClient.block()` from the same reactive thread = deadlock
> Fine inside a `@RestController` method (servlet thread). Inside reactive code, NEVER `.block()`.

> [!warning] `RestTemplate` is not deprecated
> "In maintenance mode" — no new features but bug-fixed. Existing apps don't need to migrate. New code should pick `RestClient` (sync) or `WebClient` (reactive).

> [!tip] Use Resilience4j for retries / circuit breaker
> Don't bake retry into your client. Wrap calls with `@Retry`, `@CircuitBreaker`, `@Bulkhead` from Resilience4j. See [[Resilience4j]].

> [!tip] Observation/tracing
> If you have Micrometer + Sleuth/OpenTelemetry, all three clients propagate trace headers automatically.

## Related

- [[01-RestController-Basics]]
- [[06-Exception-Handling]]
- [[Resilience4j]]
- [[Observability-Basics]]

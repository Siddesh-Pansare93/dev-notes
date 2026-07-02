# WebClient, RestClient & RestTemplate — Doosri APIs ko Call Karna

Socho ek second ke liye — tumhara Zomato backend sirf orders manage nahi karta. Woh payment ke liye Razorpay ko call karta hai, address verify karne ke liye Google Maps API ko hit karta hai, SMS bhejne ke liye Twilio ko ping karta hai. Real-world mein **koi bhi production app isolated nahi hoti** — doosri services se baat karni hi padti hai.

Node.js mein yeh kaam `axios` ya `fetch` karta hai. Spring Boot mein iske equivalents hain — **`RestTemplate`**, **`RestClient`**, aur **`WebClient`**. Teen options hain, aur teeno ka alag purpose hai. Yeh samajhna ki kab kaunsa use karo — yahi iss chapter ka core point hai.

> [!info] Node.js/TypeScript Developer ke liye — pehle yeh padhlo
> Tu `axios` jaanta hai? Toh Spring ke HTTP clients samajhna easy hoga:
> - **`RestTemplate`** — purana style, blocking, `axios` ki tarah. Maintenance mode mein hai — naya code mat likho isme, lekin legacy projects mein milega.
> - **`RestClient`** (Spring 6.1 / Boot 3.2+) — `axios` ka modern Spring equivalent. Fluent API, synchronous, **naye blocking code ke liye yahi use karo**.
> - **`WebClient`** — reactive, non-blocking, `RxJS` style. `Mono`/`Flux` return karta hai. Jab full reactive pipeline chahiye tab use karo.
> - **HTTP Interface (`@HttpExchange`)** — Spring ka `Retrofit` equivalent. Declarative interface define karo, implementation Spring generate kar deta hai.

---

## Kya Problem Solve Karta Hai Yeh?

Maan lo tu Swiggy ka order service bana raha hai. Order place hone ke baad:

1. **Payment service** ko call karna hai — "Rs. 450 deduct karo is user se"
2. **Restaurant service** ko notify karna hai — "Biryani taiyaar karo"
3. **Delivery service** ko call karna hai — "Rider assign karo"
4. **Notification service** ko ping karna hai — "User ko SMS/push bhejo"

Yeh saari calls **HTTP requests** hain — doosri microservices ya external APIs ko. Agar tum khud `HttpURLConnection` ya `java.net.http.HttpClient` se yeh sab handle karo, toh boilerplate itna zyada ho jaayega ki actual business logic dikhega hi nahi. Isiliye Spring in teeno abstraction layers ko provide karta hai — connection pooling, serialization, error handling, timeouts sab already handled hote hain, tumhe sirf "kya call karna hai" bolna hota hai.

---

## Teeno Clients Ka Comparison

| Client | Style | Kab Use Karo |
|---|---|---|
| `RestTemplate` | Blocking, imperative | Legacy code mein milega — naya mat likho |
| `RestClient` | Blocking, fluent (Spring 6.1+) | **Naye synchronous code ke liye — yahi best hai** |
| `WebClient` | Reactive, non-blocking (`Mono`/`Flux`) | Jab reactive pipeline ho ya heavy concurrency chahiye |
| HTTP Interface (`@HttpExchange`) | Declarative interface | Jab typed, clean client chahiye — team projects ke liye perfect |

> [!tip] Confuse mat ho — yeh teeno "competing" options nahi hain
> `RestClient`/`WebClient` woh engine hain jo actual HTTP call karta hai. HTTP Interface ek **layer hai unke upar** — tum HTTP Interface ko `RestClient` ke saath bhi use kar sakte ho aur `WebClient` ke saath bhi. Toh real choice do jagah hoti hai: (1) blocking chahiye ya reactive, aur (2) fluent API se call karna hai ya declarative interface se.

---

## RestClient — Naya Default (Spring 6.1 / Boot 3.2+)

### Yeh Kya Hai?

`RestClient` Spring ka modern synchronous HTTP client hai. Tumhara Node.js wala `axios.create({ baseURL, headers })` yaad hai? Bilkul wahi concept hai — ek configured client banao, aur use karo baar baar.

Pom.xml mein alag se dependency nahi chahiye — `spring-boot-starter-web` ke saath already aata hai.

### Configuration — Client Setup Karo

```java
@Configuration
public class RestClientConfig {

    // Yeh bean ek "configured axios instance" ki tarah hai
    // Ek baar banao, har jagah inject karo
    @Bean
    public RestClient githubClient(RestClient.Builder builder) {
        return builder
                // Base URL set karo — har request isme prefix ho jaati hai
                .baseUrl("https://api.github.com")
                // Default headers — har request ke saath jaayenge
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                // Interceptor — axios ka request interceptor hi hai yeh
                // Yahan Bearer token inject kar rahe hain har request pe
                .requestInterceptor((req, body, exec) -> {
                    req.getHeaders().setBearerAuth(System.getenv("GH_TOKEN"));
                    return exec.execute(req, body);
                })
                .build();
    }
}
```

> [!warning] `new RestClient()` mat karo — Builder inject karo
> Boot automatically `RestClient.Builder` ko configure karta hai — timeouts, tracing, metrics sab set hote hain. Agar `RestClient.builder()` static method se banate ho toh yeh saari cheezein miss ho jaati hain. Hamesha `RestClient.Builder` inject karo.

### Service — Actual HTTP Calls

```java
@Service
public class GithubService {

    private final RestClient github;

    // Constructor injection — RestClient ko inject karo
    public GithubService(RestClient githubClient) {
        this.github = githubClient;
    }

    // GET request — list fetch karna
    // Node.js mein: const { data } = await github.get('/users/{user}/repos')
    public List<RepoDto> listRepos(String user) {
        return github.get()
                .uri("/users/{user}/repos", user)  // Path variable automatically substitute hoga
                .retrieve()                         // "Ab response lo" — execute karo request
                .body(new ParameterizedTypeReference<List<RepoDto>>() {});
                // ParameterizedTypeReference kyun? Kyunki List<RepoDto> generic type hai
                // Java mein runtime pe generic type erase ho jaati hai — yeh workaround hai
    }

    // GET single resource + error handling
    public RepoDto getRepo(String owner, String repo) {
        return github.get()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                // 4xx response aaya? Custom exception throw karo
                // Node.js mein: axios interceptor ya try-catch
                .onStatus(HttpStatusCode::is4xxClientError,
                          (req, res) -> {
                              throw new ResourceNotFoundException("repo", repo);
                          })
                .body(RepoDto.class);
    }

    // POST request — data bhejna
    // Node.js mein: await github.post('/repos/.../issues', { title, body })
    public IssueDto createIssue(String owner, String repo, IssueRequest issueReq) {
        return github.post()
                .uri("/repos/{owner}/{repo}/issues", owner, repo)
                .contentType(MediaType.APPLICATION_JSON)  // Content-Type header
                .body(issueReq)                           // Request body — auto JSON serialize hoga
                .retrieve()
                .body(IssueDto.class);
    }

    // PUT request — update karna
    public RepoDto updateRepo(String owner, String repo, UpdateRepoRequest updateReq) {
        return github.patch()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .contentType(MediaType.APPLICATION_JSON)
                .body(updateReq)
                .retrieve()
                .body(RepoDto.class);
    }

    // DELETE request
    public void deleteRepo(String owner, String repo) {
        github.delete()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                .toBodilessEntity(); // Response body nahi chahiye, sirf status
    }
}
```

> [!info] `.retrieve()` ke peeche kya ho raha hai?
> `.uri(...)` sirf request *define* karta hai — abhi tak koi network call nahi hui. `.retrieve()` call karte hi Spring actual HTTP request bhejta hai aur response wapas aane ka wait karta hai (blocking). Yeh Node.js ke `await axios.get(...)` jaisa hi hai — bas syntax fluent-builder style mein hai instead of ek single function call ke.

---

## WebClient — Reactive HTTP Client

### Kab Use Karo?

Agar tumhara app fully reactive hai — yaani `WebFlux` use kar raha hai, `R2DBC` se database access kar raha hai — tab `WebClient` use karo. Yeh **non-blocking** hai — thread hold nahi karta response aane tak.

Think karo Swiggy ka real-time tracking — ek saath hazaaron connections open hain, lekin threads zyada nahi chahiye. Yahan reactive ka fayda hai. Traditional blocking model mein har request ke liye ek thread busy rehta hai jab tak response na aaye — 10,000 concurrent requests matlab 10,000 threads (aur har thread ~1MB stack memory leta hai). Reactive model mein ek chhoti si thread pool hi kaafi requests handle kar leti hai kyunki koi thread "wait" nahi karta — jab I/O complete hota hai tabhi thread us kaam ko resume karta hai.

### Dependency Add Karo

```xml
<!-- pom.xml mein add karo -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

### WebClient Configuration

```java
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient githubWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl("https://api.github.com")
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                // Timeout configure karna ZARURI hai — default mein hang kar sakta hai!
                .clientConnector(new ReactorClientHttpConnector(
                    HttpClient.create()
                        .responseTimeout(Duration.ofSeconds(10))
                        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                ))
                .build();
    }
}
```

### WebClient Usage — Reactive Style

```java
@Service
public class GithubReactiveService {

    private final WebClient client;

    public GithubReactiveService(WebClient githubWebClient) {
        this.client = githubWebClient;
    }

    // Mono — 0 ya 1 value return karta hai (Promise ki tarah)
    // Node.js mein: Promise<RepoDto>
    public Mono<RepoDto> getRepo(String owner, String repo) {
        return client.get()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError,
                          res -> res.bodyToMono(String.class)
                                    .map(body -> new ResourceNotFoundException("repo", repo)))
                .bodyToMono(RepoDto.class);
        // Yahan pe koi blocking nahi — yeh sirf "pipeline" define kar raha hai
        // Actual execution tab hogi jab koi subscribe karega
    }

    // Flux — 0 ya N values ka stream (Observable ki tarah)
    // Node.js mein: AsyncIterable<RepoDto> ya Observable
    public Flux<RepoDto> streamRepos(String user) {
        return client.get()
                .uri("/users/{user}/repos", user)
                .retrieve()
                .bodyToFlux(RepoDto.class);
        // Har repo ek ek karke stream hoga — pura list download nahi karna padega
    }

    // Multiple calls parallel mein — yahan WebClient shine karta hai!
    // Swiggy ki tarah — restaurant details + menu + reviews ek saath fetch karo
    public Mono<RestaurantDetailsDto> getRestaurantWithMenu(String restaurantId) {
        Mono<RestaurantDto> restaurantMono = client.get()
                .uri("/restaurants/{id}", restaurantId)
                .retrieve()
                .bodyToMono(RestaurantDto.class);

        Mono<List<MenuItem>> menuMono = client.get()
                .uri("/restaurants/{id}/menu", restaurantId)
                .retrieve()
                .bodyToFlux(MenuItem.class)
                .collectList();

        // Zip karo — dono complete hone ke baad combine karo
        // Node.js mein: Promise.all([restaurantFetch, menuFetch])
        return Mono.zip(restaurantMono, menuMono)
                .map(tuple -> new RestaurantDetailsDto(tuple.getT1(), tuple.getT2()));
    }
}
```

> [!info] "Kaun subscribe karega?" — reactive ka sabse important sawaal
> `Mono`/`Flux` **lazy** hote hain — jab tak koi inhe subscribe nahi karta, koi HTTP call hoti hi nahi. `@RestController` mein jab tum `Mono<RepoDto>` return karte ho, Spring WebFlux khud subscribe karta hai response bhejne ke liye. Agar tum kahin manually `.subscribe()` ya `.block()` nahi karte, aur controller se bhi return nahi karte — call kabhi hogi hi nahi, silently. Yeh sabse common reactive bug hai beginners ke liye.

> [!warning] Servlet thread pe `.block()` theek hai — Reactive thread pe DEADLOCK!
> Agar `@RestController` ke andar `.block()` call karo — chalega. Servlet thread hai, block kar sakta hai.
> Lekin agar reactive chain ke andar `.block()` karo (kisi `Mono.flatMap` ke andar) — **deadlock ho jaayega**. Thread khud apna wait kar raha hoga.
> Simple rule: **Reactive code mein `.block()` kabhi mat use karo.**

---

## HTTP Interface — Declarative Client (Retrofit Style)

### Yeh Concept Kya Hai?

Tu Retrofit jaanta hai (Android developers ka favorite)? Ya OpenFeign? Iska idea yahi hai — **sirf interface likho, implementation Spring generate kar deta hai**.

Zomato ka payment service call karna hai? Poora HTTP boilerplate likhne ki zarurat nahi — sirf bolo "yeh method GET /payments/{id} call karega" — aur ho gaya.

### Interface Define Karo

```java
// Sirf interface — koi implementation nahi
// Spring khud proxy generate karega runtime pe
public interface GithubApi {

    // GET /users/{user}/repos
    // Node.js Retrofit equivalent: @GET('/users/{user}/repos')
    @GetExchange("/users/{user}/repos")
    List<RepoDto> listRepos(@PathVariable String user);

    // GET /repos/{owner}/{repo}
    @GetExchange("/repos/{owner}/{repo}")
    RepoDto getRepo(@PathVariable String owner, @PathVariable String repo);

    // POST /repos/{owner}/{repo}/issues
    @PostExchange("/repos/{owner}/{repo}/issues")
    IssueDto createIssue(
        @PathVariable String owner,
        @PathVariable String repo,
        @RequestBody IssueRequest req
    );

    // PUT request
    @PutExchange("/repos/{owner}/{repo}")
    RepoDto updateRepo(
        @PathVariable String owner,
        @PathVariable String repo,
        @RequestBody UpdateRepoRequest req
    );

    // DELETE request
    @DeleteExchange("/repos/{owner}/{repo}")
    void deleteRepo(@PathVariable String owner, @PathVariable String repo);

    // Query parameters ke saath
    @GetExchange("/search/repositories")
    SearchResult searchRepos(
        @RequestParam String q,
        @RequestParam(defaultValue = "stars") String sort,
        @RequestParam(defaultValue = "10") int perPage
    );
}
```

### Configuration — Proxy Bean Banao

```java
@Configuration
public class GithubApiConfig {

    @Bean
    public GithubApi githubApi(RestClient githubClient) {
        // RestClient ko adapter mein wrap karo
        RestClientAdapter adapter = RestClientAdapter.create(githubClient);

        // Factory se proxy object banao
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(adapter)
                .build();

        // Interface ka proxy return karo
        // Ab yeh bean inject kar sakte ho kisi bhi service mein
        return factory.createClient(GithubApi.class);
    }
}
```

### Ab Use Karo — Ekdum Clean!

```java
@Service
public class RepositoryService {

    private final GithubApi githubApi;  // Interface inject karo — koi implementation nahi

    public RepositoryService(GithubApi githubApi) {
        this.githubApi = githubApi;
    }

    public RepoDto findPopularRepo(String owner, String repoName) {
        // Seedha method call — HTTP ka koi boilerplate nahi!
        return githubApi.getRepo(owner, repoName);
    }

    public List<RepoDto> getUserRepos(String user) {
        return githubApi.listRepos(user);
    }
}
```

> [!tip] Team projects mein HTTP Interface ka fayda
> Jab team mein kaam karo — ek developer interface define karo, dusra implement kare. Testing ke liye mock banaana aasaan hai. Aur code padhne mein clearly dikh jaata hai ki kaunsa endpoint call ho raha hai — HTTP boilerplate ke beech dhundna nahi padta.

> [!info] Same interface — reactive ya blocking, tumhari choice
> Agar `RestClientAdapter` ki jagah `WebClientAdapter.create(webClient)` use karo, toh methods `Mono<RepoDto>`/`Flux<RepoDto>` return kar sakte hain instead of plain objects. Interface ka shape same rehta hai, sirf adapter badalta hai — yeh flexibility hi iski sabse badi taaqat hai.

---

## RestTemplate — Legacy Client (Tumhe Milega Purane Code Mein)

### Kab Milega Yeh?

Production mein kaafi purani Spring Boot apps hain jo `RestTemplate` use karti hain. Tumhe yeh code maintain karna pad sakta hai. Isliye samajhna zaroori hai — use karna nahi chahiye, lekin padhna aana chahiye.

> [!info] RestTemplate deprecated nahi hai
> Log galat samajhte hain — `RestTemplate` "maintenance mode" mein hai, matlab **naye features nahi aayenge**, lekin bug fixes hoti rahegi. Purani apps migrate karne ki urgency nahi hai. **Naya code RestClient mein likho.**

### RestTemplate Setup

```java
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
            .rootUri("https://api.github.com")
            // Timeout set karo — warna hang kar sakta hai
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            // Default headers
            .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
            .build();
}
```

### RestTemplate Usage

```java
@Service
public class LegacyGithubService {

    private final RestTemplate restTemplate;

    public LegacyGithubService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // GET — simple object fetch
    // Seedha object return karta hai
    public RepoDto getRepo(String owner, String repo) {
        return restTemplate.getForObject(
            "/repos/{o}/{r}",    // URI template
            RepoDto.class,       // Return type
            owner, repo          // Path variables
        );
    }

    // GET — full ResponseEntity chahiye (status, headers bhi)
    public RepoDto getRepoWithStatus(String owner, String repo) {
        ResponseEntity<RepoDto> response = restTemplate.exchange(
            "/repos/{o}/{r}",
            HttpMethod.GET,
            null,            // Request entity (headers/body) — GET mein null
            RepoDto.class,
            owner, repo
        );

        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();
        }
        throw new RuntimeException("API call failed: " + response.getStatusCode());
    }

    // POST — data bhejna
    public IssueDto createIssue(String owner, String repo, IssueRequest req) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<IssueRequest> entity = new HttpEntity<>(req, headers);

        return restTemplate.postForObject(
            "/repos/{o}/{r}/issues",
            entity,
            IssueDto.class,
            owner, repo
        );
    }

    // List fetch karna — ParameterizedTypeReference zaruri
    public List<RepoDto> listRepos(String user) {
        ResponseEntity<List<RepoDto>> response = restTemplate.exchange(
            "/users/{user}/repos",
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<List<RepoDto>>() {},
            user
        );
        return response.getBody();
    }
}
```

Dekho kitna verbose hai `RestTemplate` — har call mein `HttpEntity`, `HttpMethod`, `ParameterizedTypeReference` — yahi reason hai ki `RestClient` aaya. Same kaam, zyada clean code.

---

## Node.js/TypeScript se Comparison

```typescript
// TypeScript mein — familiar way
const github = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `Bearer ${process.env.GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
  },
  timeout: 10000,
});

// GET request
const { data: repo } = await github.get<Repo>(`/repos/${owner}/${repo}`);

// POST request
const { data: issue } = await github.post<Issue>(
  `/repos/${owner}/${repo}/issues`,
  { title: 'Bug report', body: 'Something is broken' }
);

// Error handling
try {
  const { data } = await github.get<Repo>(`/repos/${owner}/${repo}`);
} catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    throw new NotFoundException('Repo not found');
  }
}

// Parallel calls — Promise.all
const [restaurant, menu] = await Promise.all([
  github.get(`/restaurant/${id}`),
  github.get(`/restaurant/${id}/menu`),
]);
```

| TypeScript / axios | Spring Equivalent |
|---|---|
| `axios.create({ baseURL, headers })` | `RestClient.Builder#baseUrl()` + `defaultHeader()` |
| Interceptors (`axios.interceptors`) | `requestInterceptor(...)` on builder |
| `axios.get<T>(url)` | `.retrieve().body(T.class)` |
| Non-2xx response → AxiosError | `.onStatus(...)` handler |
| `async/await` | Synchronous (`RestClient`) ya `Mono`/`Flux` (`WebClient`) |
| `Promise.all([...])` | `Mono.zip(mono1, mono2)` (WebClient) |
| `axios-retry` | `@Retry` from Resilience4j |
| Retrofit (type-safe client) | HTTP Interface (`@HttpExchange`) |
| `fetch` (native) | `RestClient` (Spring native alternative) |

---

## Gotchas — Beginners Jo Galtiyan Karte Hain

> [!warning] `new RestClient()` mat banao — Builder inject karo
> ```java
> // GALAT — Spring ka auto-configuration bypass ho jaata hai
> RestClient client = RestClient.builder().baseUrl("...").build();
>
> // SAHI — Boot-configured builder inject karo
> @Bean
> public RestClient myClient(RestClient.Builder builder) { // <-- inject!
>     return builder.baseUrl("...").build();
> }
> ```
> Boot `RestClient.Builder` mein automatically tracing, metrics, aur custom message converters configure karta hai. Manual banane se yeh sab miss ho jaata hai.

> [!warning] Timeout set karna mat bhoolo
> Default mein `WebClient` indefinitely hang kar sakta hai. Production mein ek slow external API puri tumhari app ko choke kar sakti hai.
> ```java
> // ReactorClientHttpConnector ke saath timeout set karo
> HttpClient httpClient = HttpClient.create()
>     .responseTimeout(Duration.ofSeconds(10))
>     .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000);
>
> WebClient client = WebClient.builder()
>     .clientConnector(new ReactorClientHttpConnector(httpClient))
>     .build();
> ```

> [!warning] `WebClient.block()` + Reactive Thread = Deadlock
> ```java
> // GALAT — Reactive chain ke andar .block() mat karo!
> public Mono<String> badCode() {
>     return someFlux.flatMap(item -> {
>         String result = webClient.get()
>             .uri("/api/" + item)
>             .retrieve()
>             .bodyToMono(String.class)
>             .block(); // DEADLOCK! Reactive thread khud apna wait karega
>         return Mono.just(result);
>     });
> }
>
> // SAHI — flatMap use karo
> public Mono<String> goodCode() {
>     return someFlux.flatMap(item ->
>         webClient.get()
>             .uri("/api/" + item)
>             .retrieve()
>             .bodyToMono(String.class) // Mono return karo, block mat karo
>     ).next();
> }
> ```

> [!warning] `List<SomeDto>` ke liye `ParameterizedTypeReference` zaruri hai
> ```java
> // GALAT — Runtime pe ClassCastException aa sakta hai
> List<RepoDto> repos = restClient.get()
>     .uri("/users/{user}/repos", user)
>     .retrieve()
>     .body(List.class); // Generic type info lost!
>
> // SAHI — ParameterizedTypeReference use karo
> List<RepoDto> repos = restClient.get()
>     .uri("/users/{user}/repos", user)
>     .retrieve()
>     .body(new ParameterizedTypeReference<List<RepoDto>>() {});
> ```
> Java mein type erasure ki wajah se `List<RepoDto>` ka runtime type `List` ho jaata hai — `ParameterizedTypeReference` is information ko preserve karta hai. TypeScript mein yeh dikkat nahi hoti kyunki types sirf compile-time pe exist karte hain aur `axios.get<Repo[]>()` mein tumhe manually cast karne ki zarurat hi nahi padti — lekin Java mein generics runtime pe erase ho jaate hain, isliye yeh extra step chahiye.

> [!warning] Error response body manually handle karo
> By default, 4xx/5xx responses exception throw karte hain **lekin response body discard ho jaati hai**. Agar API ne error message diya hai, woh padhne ke liye explicitly handle karo:
> ```java
> restClient.get()
>     .uri("/users/{user}", user)
>     .retrieve()
>     .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
>         // Response body padhke meaningful error throw karo
>         String errorBody = new String(res.getBody().readAllBytes());
>         throw new UserNotFoundException("User not found: " + errorBody);
>     })
>     .body(UserDto.class);
> ```

> [!tip] Retry aur Circuit Breaker ke liye Resilience4j use karo
> HTTP call fail ho sakti hai — network blip, server overload. Retry logic client mein mat likho. Resilience4j use karo:
> ```java
> @Retry(name = "githubApi", fallbackMethod = "defaultRepo")
> @CircuitBreaker(name = "githubApi")
> public RepoDto getRepo(String owner, String repo) {
>     return githubApi.getRepo(owner, repo);
> }
>
> // Fallback — jab circuit open ho
> public RepoDto defaultRepo(String owner, String repo, Exception e) {
>     return new RepoDto("unknown", "Service temporarily unavailable");
> }
> ```
> Socho CRED ka backend — agar ek downstream service slow ho jaaye, toh circuit breaker use "trip" kar deta hai aur turant fallback response de deta hai, instead of har request ko timeout tak wait karwane ka. Isse cascading failure (ek service down hone se poora system down) rukta hai.

> [!tip] Tracing Automatic Milta Hai
> Agar tumhare project mein Micrometer + OpenTelemetry hai, toh `RestClient`, `WebClient`, aur `RestTemplate` automatically trace headers (`traceparent`, `X-B3-TraceId`) propagate karte hain. Zomato ka order track karo — request har service se guzarti hai, trace ID se sab link hota hai. Alag se kuch configure nahi karna.

---

## Real World Scenario — Swiggy Style Integration

Ek complete example — Order Service jo multiple downstream services call karta hai:

```java
public interface PaymentServiceApi {

    @PostExchange("/payments/charge")
    PaymentResponse charge(@RequestBody ChargeRequest request);

    @GetExchange("/payments/{transactionId}/status")
    PaymentStatus getStatus(@PathVariable String transactionId);
}

public interface RestaurantServiceApi {

    @PostExchange("/restaurants/{restaurantId}/orders")
    RestaurantOrder notifyRestaurant(
        @PathVariable String restaurantId,
        @RequestBody OrderNotification notification
    );
}

@Configuration
public class ServiceClientsConfig {

    @Bean
    public PaymentServiceApi paymentServiceApi(RestClient.Builder builder) {
        RestClient client = builder
                .baseUrl("http://payment-service:8081")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(PaymentServiceApi.class);
    }

    @Bean
    public RestaurantServiceApi restaurantServiceApi(RestClient.Builder builder) {
        RestClient client = builder
                .baseUrl("http://restaurant-service:8082")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(client))
                .build()
                .createClient(RestaurantServiceApi.class);
    }
}

@Service
public class OrderService {

    private final PaymentServiceApi paymentApi;
    private final RestaurantServiceApi restaurantApi;

    public OrderService(PaymentServiceApi paymentApi,
                        RestaurantServiceApi restaurantApi) {
        this.paymentApi = paymentApi;
        this.restaurantApi = restaurantApi;
    }

    @Transactional
    public OrderConfirmation placeOrder(OrderRequest request) {
        // Step 1: Payment charge karo
        PaymentResponse payment = paymentApi.charge(
            new ChargeRequest(request.getUserId(), request.getTotalAmount())
        );

        if (!payment.isSuccess()) {
            throw new PaymentFailedException("Payment failed: " + payment.getErrorMessage());
        }

        // Step 2: Restaurant notify karo
        RestaurantOrder restaurantOrder = restaurantApi.notifyRestaurant(
            request.getRestaurantId(),
            new OrderNotification(request.getItems(), payment.getTransactionId())
        );

        return new OrderConfirmation(restaurantOrder.getOrderId(), payment.getTransactionId());
    }
}
```

Dekho kitna clean hai — `OrderService` ko pata nahi ki HTTP call ho rahi hai. Interface inject hai, method call karo, kaam ho gaya. Base URLs (`http://payment-service:8081`) hardcoded dikh rahe hain example ke liye, lekin real production mein yeh service discovery (Eureka, Kubernetes DNS) ya `application.yml` properties se aana chahiye — kabhi bhi hardcode mat karo.

---

## Kaunsa Client Kab Use Karo — Decision Guide

```
Naya code likh raha ho?
├── Synchronous (blocking) app hai?
│   ├── Simple HTTP calls? → RestClient
│   └── Typed, clean interface chahiye? → HTTP Interface (@HttpExchange) with RestClient
└── Reactive (WebFlux) app hai?
    ├── Simple calls? → WebClient
    └── Typed interface chahiye? → HTTP Interface (@HttpExchange) with WebClient

Legacy code maintain kar raha ho?
└── RestTemplate milega — samajhna zaroori hai, lekin migrate karne ki rush nahi
```

---

## Key Takeaways

- **`RestTemplate`** purana hai, maintenance mode mein — naya code isme mat likho, lekin legacy projects mein milega, samajhna zaroori hai
- **`RestClient`** (Spring 6.1+) naya default synchronous client hai — Node.js ka `axios.create()` equivalent, fluent API ke saath
- **`WebClient`** reactive non-blocking client hai — `Mono`/`Flux` return karta hai, parallel calls ke liye powerful, lekin reactive thread pe `.block()` kabhi nahi
- **HTTP Interface (`@HttpExchange`)** declarative style hai — sirf interface likho, Spring implementation generate karta hai; `RestClientAdapter` ya `WebClientAdapter` dono ke saath kaam karta hai; team projects mein sabse clean
- **`RestClient.Builder` inject karo** — `new RestClient()` ya static `RestClient.builder()` se mat banao, Boot ka auto-configuration miss ho jaata hai
- **Timeouts hamesha set karo** — especially `WebClient` mein, warna slow downstream service puri app choke kar sakti hai
- **`List<T>` ke liye `ParameterizedTypeReference`** — Java type erasure ki wajah se zaruri hai
- **Error handling** `.onStatus()` se karo — response body padhke meaningful exceptions throw karo
- **Retry aur Circuit Breaker** ke liye Resilience4j use karo — client ke andar retry logic mat likho
- **Tracing automatic** milta hai — Micrometer ke saath trace headers automatically propagate hote hain

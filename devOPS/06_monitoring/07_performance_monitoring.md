# Performance Monitoring & Optimization

Socho tumhara Zomato jaisa app hai — lunch time pe (1 PM - 2 PM) traffic 10x badh jaata hai. Suddenly checkout API 200ms se 3 second ho jaata hai, log log app close karke Swiggy pe chale jaate hain. Ab agar tumhe pata hi na chale ki *kya* slow hai — database query, external payment gateway, ya khud ka server CPU — toh tum andhere mein teer chalaoge. Isi problem ko solve karta hai **Performance Monitoring**. Yeh tumhe batata hai exactly kahaan time lag raha hai, aur **Optimization** us gyaan ka use karke system ko fix karta hai.

Is note mein hum dekhenge APM (Application Performance Monitoring), profiling, metrics, benchmarking, common bottlenecks, aur continuous performance testing — matlab poora ecosystem jo production app ko fast aur reliable rakhta hai.

## Application Performance Monitoring (APM)

**Kya hota hai?** APM ek tool/system hai jo tumhare application ke andar ghus ke dekhta hai — har request kahaan se aayi, kitna time laga, kaunsa function call hua, database query mein kitna waqt gaya — sab kuch trace karta hai end-to-end.

**Kyun zaruri hai?** Socho IRCTC ki tatkal booking. User "Book Now" dabata hai, request server pe aati hai, phir seat availability check hoti hai, phir payment gateway call hota hai, phir confirmation email jaata hai. Agar booking slow hai, toh sirf "response time 3 second hai" bolna kaafi nahi — tumhe pata hona chahiye ki **kaunsa step** slow hai. Kya seat-check query slow hai? Ya payment gateway ka network call latency zyada hai? APM tools (jaise Elastic APM, New Relic, Datadog) exactly yeh breakdown deta hai — jaise ek doctor ka X-ray report jo bata deta hai body ke kaunse part mein problem hai, sirf "pain ho raha hai" nahi.

APM ka core concept hai **transactions** aur **spans**:
- **Transaction** = ek complete request/operation (jaise "checkout")
- **Spans** = us transaction ke andar chhote-chhote steps (jaise "validate-cart", "process-payment")

Yeh bilkul waise hai jaise ek Swiggy order tracking — "Order Placed" → "Restaurant Confirmed" → "Food Prepared" → "Picked Up" → "Delivered". Har stage ek span hai, aur poora order lifecycle ek transaction hai.

```javascript
// APM with OpenTelemetry
const apm = require('elastic-apm-node');

apm.start({
  serviceName: 'my-app',
  serverUrl: 'http://apm-server:8200'
});

// Automatic tracing
app.use((req, res, next) => {
  apm.captureRequest(req, () => {
    next();
  });
});

// Custom transactions
const transaction = apm.startTransaction('checkout', 'request');

const span1 = transaction.startSpan('validate-cart', 'commerce');
// Validate cart
span1.end();

const span2 = transaction.startSpan('process-payment', 'commerce');
// Process payment
span2.end();

transaction.end();
```

Yahaan `apm.start()` sabse pehle initialize karta hai APM agent ko, jo background mein automatically HTTP requests, database queries, aur external API calls track karta hai — bina tumhe manually har jagah code likhne ke. Lekin business-critical flows (jaise checkout) ke liye tum manually custom transaction aur spans bana sakte ho, taaki tumhe pata chale exactly "validate-cart" mein 50ms laga aur "process-payment" mein 2 second — matlab payment gateway hi bottleneck hai, cart validation nahi.

> [!tip]
> Production mein sirf top-level APM lagana kaafi nahi. Critical business flows (checkout, login, search) ke liye hamesha custom spans banao — generic metrics tumhe "kya slow hai" nahi batayenge, "kahaan slow hai" batayenge.

## Profiling

**Kya hota hai?** Profiling ka matlab hai apne application ke andar deep-dive karna — CPU cycles kahaan spend ho rahe hain, memory kahaan allocate ho rahi hai — line-by-line, function-by-function level tak. APM tumhe bata deta hai "checkout API slow hai", lekin profiling tumhe batata hai "checkout function ke andar `calculateDiscount()` function 80% CPU khaa raha hai kyunki uske andar ek nested loop hai jo O(n²) complexity ka hai".

Socho CRED app ka reward-calculation feature slow chal raha hai. APM bolega "yeh API 4 second leta hai". Lekin profiler bolega "is API ke andar `calculateCashback` function 3.5 second le raha hai kyunki wo ek array ko bar-bar sort kar raha hai loop ke andar" — ab tumhe exact fix pata chal gaya.

### CPU Profiling — clinic.js

```javascript
// CPU profiling with clinic.js
// npm install -g clinic
// clinic doctor -- node app.js
// clinic flame -- node app.js
```

- `clinic doctor` — tumhare Node.js app ko run karke overall health report deta hai (Event Loop delay, CPU usage, memory) aur bata deta hai kis type ka problem hai (jaise "I/O bound" ya "CPU bound").
- `clinic flame` — ek **flame graph** banata hai, jisme tum visually dekh sakte ho kaunsa function sabse zyada CPU time consume kar raha hai. Jo bar sabse chaudi hoti hai, wahi tumhara culprit function hota hai.

### Memory Profiling — heapdump

```javascript
// Memory profiling
const heapdump = require('heapdump');

app.get('/debug/heapdump', (req, res) => {
  heapdump.writeSnapshot((filename) => {
    res.download(filename);
  });
});
```

Yeh route hit karne pe ek **heap snapshot** file (`.heapsnapshot`) generate hoti hai jise tum Chrome DevTools mein load karke dekh sakte ho — kaunse objects memory mein zyada jagah le rahe hain, aur kya koi object jo delete ho jaana chahiye tha wo abhi bhi reference ki wajah se stuck hai (yeh hi hota hai **memory leak**).

> [!warning]
> Production mein `/debug/heapdump` jaisa endpoint bina authentication ke kabhi expose mat karo — koi bhi request bhejke tumhare server ka heap dump download kar sakta hai jisme sensitive data (tokens, user data) ho sakta hai. Isko admin-only route banao ya sirf internal network se accessible rakho.

## Key Metrics to Track

**Kya track karna zaruri hai?** Yeh teen level pe socho — jaise ek hospital mein patient monitoring hoti hai: vitals (BP, pulse), symptoms (pain, fever), aur overall recovery (discharge rate). Waise hi apps mein bhi metrics ke teen level hain:

```
System Metrics:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- GC pauses (for Node.js, Java)

Application Metrics:
- Request throughput
- Response time (p50, p95, p99)
- Error rate
- Database query time
- Cache hit ratio

Business Metrics:
- Conversion rate
- User engagement
- Revenue
- Transaction volume
```

**System Metrics** — yeh machine-level health hai. Jaise ek Ola driver ki car ka fuel, engine temperature — agar CPU 100% pe chal raha hai ya memory full hai, toh app crash hone wala hai chahe code kitna bhi accha ho.

**Application Metrics** — yeh app-level performance hai. Sabse important concept hai **percentiles** — p50, p95, p99:
- **p50 (median)** — 50% requests isse fast complete hue
- **p95** — 95% requests isse fast, matlab sirf 5% slow the
- **p99** — 99% requests isse fast, sirf 1% sabse slow

> [!info]
> Average response time pe kabhi bharosa mat karo — yeh misleading hota hai. Socho Flipkart ke 1000 requests mein se 990 requests 100ms mein complete hue aur 10 requests 10 second lagi (kisi slow query ki wajah se). Average nikaalo toh ~200ms aayega jo "theek-thaak" lagega. Lekin p99 dekhoge toh pata chalega ki 1% users (jo shayad tumhare biggest customers hain) 10 second wait kar rahe hain. **Isliye hamesha p95/p99 track karo, average nahi.**

**Business Metrics** — yeh sabse important hai kyunki yeh dikhata hai ki performance ka business pe kya asar pad raha hai. Amazon ne ek baar research mein paaya tha ki **100ms ki extra latency se 1% sales drop hoti hai**. Isliye jab tum performance improve karte ho, sirf "response time kam hua" mat bolo — bolo "checkout conversion rate 2% badha" — business ko yehi samajh aata hai.

## Performance Optimization

**Kyun zaruri hai?** Metrics collect karna sirf pehla step hai. Asli kaam hai un slow operations ko **identify** karke fix karna. Sabse simple aur effective technique hai — har request ka time measure karo aur agar threshold cross ho jaaye toh log/alert karo.

```javascript
// Identify slow operations
const slowQueryThreshold = 1000; // 1 second

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > slowQueryThreshold) {
      logger.warn('Slow request', {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    }
  });

  next();
});
```

Yahaan middleware request ke start mein timer shuru karta hai, aur `res.on('finish')` event pe (jab response client ko bhej diya gaya) duration calculate karta hai. Agar 1 second se zyada laga, toh warning log ho jaati hai saare context ke saath — method, path, duration, status code. Yeh basically ek **automated alarm system** hai jo apne aap batata rehta hai "bhai yeh request slow thi, dekh lo".

Isko production mein aur smart banane ke liye tum:
- Alag-alag routes ke liye alag threshold rakh sakte ho (search API 500ms threshold, report-generation API 5s threshold)
- Slow request count ko ek metric (Prometheus counter) mein bhi bhej sakte ho, taaki dashboard pe trend dikhe
- Sirf log na karke Slack/PagerDuty alert bhi trigger kar sakte ho agar slow requests ka rate spike ho jaaye

## Benchmarking

**Kya hota hai?** Benchmarking ka matlab hai apne system ko artificially heavy load dena aur dekhna wo kitna handle kar paata hai — bilkul waise jaise Big Billion Day sale se pehle Flipkart apne servers ko fake traffic se test karta hai taaki pata chale real sale ke din server girega ya nahi.

```bash
# Apache Bench
ab -n 10000 -c 100 http://localhost:3000/api/health

# Results
# Requests per second: 500
# Time per request: 200ms
# Failed requests: 0

# Wrk (modern benchmarking)
wrk -t4 -c100 -d30s http://localhost:3000/api/health
```

- `ab -n 10000 -c 100` — matlab total 10,000 requests bhejo, lekin ek time pe sirf 100 concurrent requests (jaise 100 users same time pe app use kar rahe hain). Result batata hai: server 500 requests/second handle kar paaya, aur average response time 200ms tha.
- `wrk -t4 -c100 -d30s` — `wrk` zyada modern aur fast tool hai jo multi-threaded hai. Yahaan `-t4` matlab 4 threads use karo, `-c100` matlab 100 connections banao, `-d30s` matlab 30 second tak test chalao.

**Kyun zaruri hai?** Benchmarking se tumhe pata chalta hai:
1. Tumhara system kitna load handle kar sakta hai before breaking (**capacity planning**)
2. Naya code deploy karne ke baad performance improve hua ya degrade hua (**regression testing**)
3. Kaunsi API sabse pehle girti hai jab traffic badhta hai (**bottleneck identification**)

> [!tip]
> Benchmarking hamesha staging/test environment mein karo, production mein nahi — warna real users ke saath tumhara load test mix ho jaayega aur galat results milenge (ya worse, production hi crash ho jaayega!).

## Common Bottlenecks

Ab baat karte hain un common jagahon ki jahaan performance problems chhupi hoti hain — jaise ek detective ko pata hota hai ki crime scene mein kahaan-kahaan dekhna hai.

```
1. Database Queries
   - N+1 queries
   - Missing indexes
   - Slow joins
   Solution: Add indexes, use query optimization

2. External API Calls
   - High latency
   - Rate limits
   Solution: Caching, retries, circuit breaker

3. Memory Leaks
   - Growing memory over time
   Solution: Profiling, fix references

4. CPU Intensive Operations
   - Long-running tasks
   Solution: Offload to workers, optimize algorithms

5. Network I/O
   - Slow responses from downstream
   Solution: Caching, compression, CDN
```

**1. Database Queries** — yeh sabse common culprit hai 90% cases mein. **N+1 queries** ka matlab hai — socho tumne Swiggy ke 20 orders fetch kiye, aur har order ke liye alag se restaurant details fetch karne ke liye alag query maari (1 query orders ke liye + 20 queries restaurant details ke liye = 21 queries). Isse better hai ek hi JOIN query se sab fetch karna. **Missing indexes** matlab agar tum `WHERE user_id = 123` jaisi query baar-baar chala rahe ho aur `user_id` column pe index nahi hai, toh database har baar poori table scan karega — jaise kisi phone book mein bina alphabetical order ke naam dhundhna.

**2. External API Calls** — jab tumhara app payment gateway (Razorpay, PayU) ya SMS gateway jaise third-party services pe depend karta hai, aur wo slow ho jaayein ya rate-limit laga dein. Solution hai **caching** (jo cheez baar-baar nahi badalti usse cache karo), **retries** (temporary failure pe dobara try karo), aur **circuit breaker** (agar external service baar-baar fail ho raha hai, toh kuch der ke liye call karna hi band kar do, taaki tumhara system bhi na latke — jaise Ola agar payment gateway down hai toh turant "try again later" bol de, poore app ko hang na hone de).

**3. Memory Leaks** — jab objects create hote hain lekin kabhi garbage collect nahi hote kyunki koi reference unhe pakde rakhta hai. Time ke saath memory usage badhta jaata hai jab tak app crash na ho jaaye (`OutOfMemory` error). Isko fix karne ke liye heap snapshots compare karo (jaisa upar dekha) aur dhundo kaunsa object grow ho raha hai.

**4. CPU Intensive Operations** — jaise image resizing, PDF generation, ya complex calculations jo synchronously main thread pe chal rahe hain. Node.js single-threaded hai, toh agar ek heavy computation chal rahi hai, poora event loop block ho jaata hai aur baaki saare requests wait karte hain. Solution: **worker threads** ya separate microservice mein offload karo.

**5. Network I/O** — jab downstream services (dusre microservices, third-party APIs) slow respond karte hain. Solution: caching (Redis), response compression (gzip), aur CDN (static assets ke liye — jaise images, CSS, JS files ko user ke nearest edge server se serve karna).

## Continuous Performance Testing

**Kyun zaruri hai?** Manual benchmarking accha hai, lekin agar koi developer galti se ek inefficient query daal de aur usse pehle kisi ko pata na chale jab tak production users complain na karein — toh bahut der ho chuki hoti hai. Isliye performance testing ko **CI/CD pipeline** mein hi automate kar dena chahiye, taaki har deployment se pehle pata chal jaaye ki performance degrade toh nahi hua.

Yeh bilkul waise hai jaise IRCTC apne naye release ko production mein daalne se pehle automatically load-test kare — agar naya code purane se slow nikla, toh deployment hi block ho jaaye.

```yaml
# CI/CD pipeline performance test
performance-test:
  script:
    - npm run build
    - npm run start &
    - sleep 5
    - wrk -t4 -c100 -d10s http://localhost:3000/ > results.json
    - python analyze-performance.py results.json

  artifacts:
    paths:
      - results.json
```

Is pipeline mein:
1. App build hota hai
2. Background mein start hota hai (`&` se background process banaya)
3. 5 second sleep — server ko boot hone ka time diya
4. `wrk` se load test chalaya — 10 second tak, 100 connections ke saath
5. Results ek Python script se analyze hote hain — jo probably check karta hai ki p95/p99 kisi threshold se zyada toh nahi hua, agar hua toh build **fail** kar deta hai
6. `results.json` ko artifact ke roop mein save kiya jaata hai, taaki baad mein trend dekh sako (last 10 deployments mein performance kaisi rahi)

> [!tip]
> Is tarah ke performance gates ko CI mein daalna ek **safety net** hai — jaise Zomato ke QA team ka automated bouncer jo har naye code ko production mein jaane se pehle check karta hai "bhai tu slow toh nahi hai?"

## Key Takeaways

- **APM** (Application Performance Monitoring) tumhe end-to-end visibility deta hai — transactions aur spans ke through pata chalta hai exactly kahaan time lag raha hai.
- **Profiling** (CPU aur memory dono) code-level granularity deta hai — kaunsa function, kaunsi line culprit hai.
- Metrics ko teen level pe track karo — **System** (CPU/memory), **Application** (response time, error rate), aur **Business** (conversion, revenue).
- Average response time pe bharosa mat karo — hamesha **p95/p99** dekho, kyunki wahi tumhare "worst experience" users ko represent karta hai.
- **Benchmarking** tools (Apache Bench, wrk) se pata chalta hai system kitna load handle kar sakta hai — real traffic spike se pehle hi test kar lo.
- Common bottlenecks — database queries (N+1, missing indexes), slow external APIs, memory leaks, CPU-heavy operations, aur network I/O — inko systematically identify aur fix karo.
- **Continuous performance testing** ko CI/CD pipeline mein daalo taaki performance regressions production tak pahunchne se pehle hi pakde jaayein.
- Optimization ek one-time kaam nahi hai — yeh ek continuous cycle hai: **Monitor → Identify → Fix → Benchmark → Repeat**.

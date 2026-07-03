# Prometheus & Grafana

> Open-source monitoring aur visualization stack — aaj ke almost har production system (Kubernetes ho ya plain VMs) mein yeh combo default choice hai.

Socho tum Swiggy ke backend engineer ho. Raat ke 9 baje, peak dinner order time hai, aur suddenly checkout API slow ho raha hai. Ab tumhe pata kaise chalega ki kya ho raha hai — kitne requests aa rahe hain, kitne fail ho rahe hain, latency kitni badh gayi, kaunsa service culprit hai? Yeh sab **metrics** ka kaam hai, aur unhe collect karne wala tool hai **Prometheus**, unhe dekhne/samjhne wala tool hai **Grafana**.

Dono milke ek complete monitoring stack banate hain:
- **Prometheus** = data collector + storage + query engine (yeh backend hai)
- **Grafana** = dashboard + visualization layer (yeh frontend hai)

Zomato, Swiggy, Flipkart jaise saare bade systems is pattern ko follow karte hain — chahe underlying tool Prometheus ho ya kuch aur, concept same hi rehta hai: metrics collect karo, store karo, graph banao, alert lagao.

## Prometheus

### Kya hota hai Prometheus?

Prometheus ek **time-series database** hai — matlab yeh data ko "is time pe yeh value thi" format mein store karta hai. Jaise:

```
http_requests_total{method="GET", status="200"}  1523   @ 10:00:00
http_requests_total{method="GET", status="200"}  1541   @ 10:00:15
http_requests_total{method="GET", status="200"}  1568   @ 10:00:30
```

Har 15 seconds (ya jitna interval set karo) pe Prometheus khud jaake tumhare application se metrics **"pull"** karta hai — yeh important concept hai. Zyada tar monitoring tools mein app khud data "push" karta hai server ko, lekin Prometheus ulta kaam karta hai: woh khud jaake tumhare app ke `/metrics` endpoint pe visit karta hai aur data utha ke le aata hai. Isse **scraping** kehte hain.

> [!info]
> **Pull vs Push model** — Socho Prometheus ek delivery boy hai jo khud restaurant (tumhare app) jaake order (metrics) utha ke laata hai, na ki restaurant khud dauड़ke Prometheus ke ghar deliver karta hai. Isse fayda yeh hai ki Prometheus control karta hai scrape frequency, aur agar koi app down hai to Prometheus turant detect kar leta hai (scrape fail hoga).

### Kyun zaruri hai?

Bina metrics ke tumhe pata hi nahi chalega:
- Kitna traffic aa raha hai (requests per second)
- Kitne requests fail ho rahe hain (error rate)
- Response kitni der mein aa raha hai (latency)
- Database connections kitne active hain
- Server ka CPU/Memory kitna use ho raha hai

Yeh saara data na ho to production issues sirf tab pata chalenge jab customer complain karega — jo ki bahut late hota hai. Monitoring proactive approach hai.

### Configuration — prometheus.yml

Prometheus ko batana padta hai ki **kahan se** aur **kitni baar** data scrape karna hai. Yeh sab ek config file mein likha jata hai:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'app'
    static_configs:
      - targets: ['localhost:3000']
```

Yahan teen alag-alag "targets" define kiye hain:
- **prometheus** — khud apne aap ko bhi monitor karta hai (meta but useful)
- **node** — yeh `node_exporter` hai, jo machine-level metrics deta hai (CPU, RAM, disk)
- **app** — tumhara khud ka application, jo `/metrics` endpoint expose karta hai

`scrape_interval: 15s` matlab har 15 second mein Prometheus in sab targets ko ping karke latest metrics utha lega.

> [!tip]
> Production mein `static_configs` ki jagah **service discovery** use hota hai (Kubernetes, Consul, EC2 tags waghera), kyunki containers/pods ke IP addresses baar-baar change hote hain. Static config sirf local/small setups ke liye theek hai.

## Instrumentation

### Kya hota hai Instrumentation?

Instrumentation ka matlab hai — tumhare khud ke application code mein metrics collect karne wala code likhna. Prometheus khud kuch nahi janta tumhare business logic ke baare mein — usse tumhe batana padega "yeh cheez count karo", "yeh cheez measure karo".

Node.js mein iske liye official library hai `prom-client`. Isme teen main metric types hote hain:

1. **Counter** — sirf badhta hai, kabhi kam nahi hota. Jaise "total requests" — yeh kabhi negative nahi ho sakta, sirf increment hota hai.
2. **Gauge** — upar-neeche dono ho sakta hai. Jaise "active database connections" — abhi 5 hain, ab 3 ho gaye, ab 8 ho gaye.
3. **Histogram** — values ko buckets mein distribute karta hai, jaise request duration — kitne requests 0-100ms mein complete hue, kitne 100-500ms mein, waghera. Isse percentiles (p50, p95, p99) nikalna aasaan hota hai.

Socho Zomato ke order tracking system se analogy le lo:
- **Counter** = "total orders placed aaj" (sirf badhta jayega)
- **Gauge** = "abhi kitne delivery boys online hain" (ghat-badh sakta hai)
- **Histogram** = "delivery time distribution" — kitne orders 15 min mein deliver hue, kitne 30 min mein, kitne 45+ min mein

```javascript
// Node.js with Prometheus client
const prometheus = require('prom-client');

// Counter
const httpRequests = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status']
});

// Gauge
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Active database connections'
});

// Histogram
const requestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path']
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequests.labels(req.method, res.statusCode).inc();
    requestDuration.labels(req.method, req.path).observe(duration);
  });

  next();
});

// Expose metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

Yahan dhyan do — `labelNames: ['method', 'status']` — yeh **labels** hote hain, jo har metric ko slice-and-dice karne dete hain. Matlab tum baad mein query kar sakte ho "sirf POST requests dikhao" ya "sirf 500 status wale requests dikhao". Yeh bilkul database ke columns jaisa hai — jitne zyada relevant labels utna better filtering.

`app.use((req, res, next) => {...})` ek middleware hai jo har request ke start pe timer chalu karta hai aur response finish hone pe duration measure karke record karta hai. Yeh pattern tum apne kisi bhi Express app mein copy-paste kar sakte ho.

Aakhir mein `/metrics` route Prometheus ko expose karta hai — yahi woh endpoint hai jise Prometheus har 15 second mein scrape karega (jaisa humne `prometheus.yml` mein `targets: ['localhost:3000']` set kiya tha).

> [!warning]
> Labels ka overuse mat karo — agar tum `user_id` jaisa high-cardinality label daal doge (matlab lakhon unique values), Prometheus ka memory usage explode ho jayega. Labels hamesha low-cardinality values ke liye use karo (method, status code, route path — inn sabki limited fixed values hoti hain).

## Grafana

### Kya hota hai Grafana?

Prometheus raw numbers store karta hai, lekin insaan ko raw numbers dekhna pasand nahi — humein graphs, charts, aur dashboards chahiye jisse ek nazar mein pata chal jaye system health kaisi hai. Yahi kaam Grafana karta hai.

Socho Prometheus ek Excel sheet hai jisme sara data hai, aur Grafana woh sheet leke usse beautiful pie-charts aur line-graphs bana deta hai — bilkul waise jaise tumhare company ke monthly sales report mein dashboards hote hain, sirf yahan yeh real-time hota hai aur system metrics ke liye.

Dono ko saath mein chalane ka sabse aasan tarika hai Docker Compose:

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

Iska matlab — ek command (`docker-compose up`) chala ke tumhare paas dono services ready ho jayengi. `prometheus.yml` ko volume mount kiya hai taaki container ko pata chale kya scrape karna hai.

Setup hone ke baad:

```bash
# Access
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)

# Add Prometheus as data source in Grafana UI
# Create dashboard with queries like:
# rate(http_requests_total[5m])
# histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

Yahan do important queries hain, jo **PromQL** (Prometheus Query Language) mein likhi jati hain:

- `rate(http_requests_total[5m])` — pichle 5 minute mein per-second average request rate. Counter values direct dekhne se kaam nahi chalta kyunki woh sirf badhta jata hai — `rate()` function use karke hum "kitni tezi se badh raha hai" nikalte hain, jo actual meaningful metric hai (requests per second).

- `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` — yeh **p99 latency** nikalta hai, matlab 99% requests is value se kam time mein complete ho rahe hain. Yeh average se zyada useful hai kyunki average mein outliers chhup jate hain — agar 1% requests bahut slow hain (jaise timeout ke kagaar pe), average unhe hide kar dega lekin p99 unhe expose kar dega.

> [!tip]
> Interview mein bhi yeh common question aata hai — "average latency kyun kaafi nahi hai?" Jawab: kyunki agar 99 requests 50ms mein complete ho rahe hain aur 1 request 10 second le raha hai, average dikhayega ~150ms — jo misleading hai. p99/p95 percentiles real user experience better capture karte hain.

Grafana UI mein setup steps simple hain:
1. Data source add karo — Prometheus ka URL do (`http://prometheus:9090` agar docker-compose network mein hai)
2. Dashboard banao ya import karo (Grafana.com pe hazaron pre-built dashboards free milte hain, jaise Node Exporter Full dashboard)
3. Panel mein PromQL query likho, graph type choose karo (line, bar, gauge, heatmap)

## Alerts

### Kyun zaruri hai alerting?

Dashboard dekhna tabhi kaam ka hai jab koi 24x7 baithke usse ghoor raha ho — jo practical nahi hai. Isliye **Alerting** zaruri hai: jab koi metric threshold cross kare, system khud-ba-khud tumhe (ya on-call engineer ko) Slack/PagerDuty/email pe notify kare.

Socho IRCTC ka system — agar train booking API ka error rate 5% se upar chala jaye, tumhe turant pata chalna chahiye, na ki agle din jab customers Twitter pe complain karein.

```yaml
# alert.rules.yml
groups:
  - name: app
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate"
          description: "Error rate: {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        annotations:
          summary: "High latency"
```

Isko line-by-line samjho:

- `expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05` — yeh check karta hai ki 5xx status wale requests (server errors) ka rate 0.05 (matlab 5%) se zyada hai ya nahi. `status=~"5.."` ek regex label matcher hai jo saare `5xx` codes (500, 502, 503...) ko match karta hai.

- `for: 5m` — yeh bahut important hai! Agar condition sirf ek moment ke liye true ho (jaise ek temporary spike), alert fire nahi hoga. Condition ko lagatar **5 minutes tak** true rehna chahiye tabhi alert trigger hoga. Isse false alarms kam hote hain — production mein chhote spikes normal hote hain, sirf sustained problems pe hi alert chahiye.

- `annotations` — yeh human-readable message hai jo alert ke saath jayega. `{{ $value | humanizePercentage }}` ek template syntax hai jo actual value ko percentage format mein daal deta hai (jaise "7.3%").

Second alert `HighLatency` batata hai ki agar p99 latency 1 second se zyada ho jaye 5 minute tak, to bhi alert fire hoga.

> [!warning]
> Alert fatigue se bacho — agar tum bahut zyada sensitive thresholds set karoge (jaise 1% error rate pe hi alert), tumhare on-call engineer ko har 10 minute mein notification aayega aur woh ignore karna shuru kar denge (bilkul "boy who cried wolf" wali kahani). Thresholds realistic rakho aur `for` duration use karke noise kam karo.

Alerts fire hone ke baad yeh **Alertmanager** (Prometheus ka companion tool) ko jaate hain, jo unhe deduplicate, group, aur route karta hai (Slack channel, PagerDuty, email waghera) — woh is note ka scope nahi hai lekin jaan lo ki Prometheus khud sirf alert *evaluate* karta hai, actual notification bhejne ka kaam Alertmanager ka hai.

## Poora Flow Samjho

1. Tumhara app `/metrics` endpoint expose karta hai (via `prom-client`)
2. Prometheus har 15s mein us endpoint ko scrape karta hai aur time-series DB mein store karta hai
3. Alert rules continuously evaluate hoti hain — agar koi condition match ho aur `for` duration tak sustain ho, alert fire hota hai
4. Grafana Prometheus se data pull karke dashboards banata hai jisse tum visually system health dekh sakte ho
5. Team PromQL queries likhke apne specific business metrics (jaise "checkout success rate") bhi track kar sakti hai

Yeh poora stack Kubernetes ke saath bahut ache se integrate hota hai (isliye "Kubernetes-native" bola jata hai) — Prometheus Operator jaise tools automatically pods discover karke unhe scrape karna shuru kar dete hain, bina manual config ke.

## Key Takeaways

- **Prometheus** ek time-series database hai jo pull-based model se metrics scrape aur store karta hai
- Teen main metric types: **Counter** (sirf badhta hai), **Gauge** (upar-neeche), **Histogram** (buckets/percentiles ke liye)
- Apna app instrument karne ke liye `prom-client` jaisi library use karo aur `/metrics` endpoint expose karo
- Labels se metrics ko slice karo, lekin high-cardinality labels (jaise user_id) avoid karo
- **PromQL** queries jaise `rate()` aur `histogram_quantile()` se meaningful insights nikalte hain — raw counters directly useful nahi hote
- **Grafana** Prometheus ke data ko visual dashboards mein convert karta hai
- **Alert rules** + `for` duration se sustained problems pe hi notification aati hai, temporary spikes pe nahi
- Poora stack open-source, free, aur Kubernetes-native hai — isliye industry standard ban gaya hai

Next: [Distributed Tracing](./05_distributed_tracing.md)

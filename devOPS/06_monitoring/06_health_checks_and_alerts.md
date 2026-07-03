# Health Checks & Alerts

Socho tumhara Zomato app 2 baje raat ko crash ho gaya but kisi ko pata hi nahi chala kyunki koi check hi nahi kar raha tha ki server zinda hai ya nahi. Subah customers complain karne lage "order hi place nahi ho raha", aur tab jaake pata chala ki service 6 ghante se down thi. Yeh exactly wahi problem hai jo **health checks aur alerts** solve karte hain — system khud apni "tabiyat" batata rehta hai, aur jab kuch garbad ho, turant kisi ko phone/Slack pe notify kar diya jaata hai. Isko soch lo apne building ke security guard jaisa — har round mein check karta hai sab dorr locked hain ya nahi, aur kuch gadbad dikhe toh turant watchman ko whistle maar deta hai.

## Health Check Endpoints

**Kya hota hai?** Health check ek simple API endpoint hota hai jo batata hai "main zinda hoon" ya "main kaam karne ke liye ready hoon". Yeh bilkul waise hai jaise koi tumhe WhatsApp pe "hi, all good?" message kare aur tum "yes" reply karo — agar reply nahi aaya, matlab kuch problem hai.

**Kyun zaruri hai?** Kubernetes, load balancer, ya monitoring tool (jaise Prometheus) ko pata hona chahiye ki tumhara app traffic handle karne ke layak hai ya nahi. Agar app crash ho gaya ya database se connect nahi ho pa raha, toh us instance pe traffic bhejna bewakoofi hogi — bilkul waise jaise Swiggy tumhe ek aise restaurant ka order confirm kar de jo abhi band pada hai.

Do'-teen alag tarah ke health checks hote hain jo alag-alag sawaal poochte hain:

```javascript
// Node.js health check
app.get('/health', (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date(),
    version: process.env.APP_VERSION
  };
  res.status(200).json(health);
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  const ready = {
    database: checkDatabase(),
    cache: checkCache(),
    external_api: checkExternalAPI()
  };

  const allReady = Object.values(ready).every(v => v);
  res.status(allReady ? 200 : 503).json(ready);
});
```

Yahan teen alag endpoints hain, aur inka role samajhna important hai:

- **`/health`** — Yeh ek general "hello, main up hoon" endpoint hai. Basic info deta hai — status, timestamp, version. Zyada tar sirf humans ke liye ya basic uptime monitoring tools ke liye use hota hai (jaise UptimeRobot).
- **`/health/live`** — Yeh **liveness** check hai. Sawaal simple hai: "kya process crash ho gayi ya deadlock mein phas gayi?" Agar iska response nahi aaya, toh matlab process ko restart karna padega. Yeh sirf process ke apne health ko dekhta hai, kisi dependency ko nahi.
- **`/health/ready`** — Yeh **readiness** check hai, aur yeh zyada important hai. Sawaal hai: "kya main abhi traffic serve karne ke liye taiyar hoon?" Yahan tum database, cache, external APIs sab check karte ho. Agar database down hai, toh app process toh zinda hai (liveness pass hoga) but traffic serve nahi kar payega, isliye readiness fail hona chahiye.

> [!tip]
> Liveness aur readiness ko kabhi mix mat karo. Agar tumne liveness check mein database check daal diya, aur database temporarily slow ho gaya, toh Kubernetes tumhare healthy app ko bhi restart kar dega — jabki actual problem database side pe thi, app side pe nahi. Yeh ek classic mistake hai jo bahut se log karte hain.

Ek IRCTC jaisi analogy lo: liveness check yeh poochta hai "kya station ka building khada hai?" (haan, khada hai), jabki readiness check poochta hai "kya ticket counter khula hai aur booking le raha hai?" (shayad nahi, agar backend server down hai). Building khade rehne se ticket book nahi ho jaati — dono alag concerns hain.

## Kubernetes Probes

**Kyun zaruri hai?** Kubernetes khud se health check endpoints ko nahi jaanta jab tak tum use bataoge nahi. Isliye Pod spec mein `livenessProbe` aur `readinessProbe` define karte hain, taaki Kubernetes periodically in endpoints ko hit kare aur decide kare ki kya karna hai.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    # Check if container is alive
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3

    # Check if ready for traffic
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 2
```

Har field ka matlab samjho, kyunki interview mein bhi yeh common sawaal hai:

- **`initialDelaySeconds`** — Container start hone ke baad kitni der wait kare pehla check karne se pehle. Liveness ke liye 30 second diya hai kyunki app ko boot hone mein time lagta hai — agar yeh kam rakha toh Kubernetes app ko "dead" samajh ke restart loop mein daal dega, jabki app sirf slow start ho raha tha.
- **`periodSeconds`** — Har kitni der mein check repeat kare. Liveness har 10 second mein, readiness har 5 second mein (readiness ko thoda zyada frequently check karte hain kyunki traffic routing decision jaldi update hona chahiye).
- **`timeoutSeconds`** — Agar response itni der mein nahi aaya, toh check fail maana jayega.
- **`failureThreshold`** — Kitni baar consecutive fail hone ke baad action liya jaye. Liveness mein 3 baar fail hua toh container **restart** hota hai. Readiness mein 2 baar fail hua toh Pod ko load balancer se **traffic milna band** ho jaata hai (lekin restart nahi hota — Kubernetes wait karta hai ki pod khud recover kar le).

**Real world scenario**: Socho tumhara Ola driver-matching service startup ke time database se connect ho raha hai, jisme 8-10 second lagte hain. Agar readinessProbe ka `initialDelaySeconds` 0 rakh diya, toh Kubernetes turant traffic bhejna shuru kar dega us pod ko jo abhi database se connected hi nahi hai — result: 503 errors customers ko dikhenge jab tak pod actually ready nahi ho jaata. Isliye realistic delay set karna zaruri hai.

> [!warning]
> Agar liveness aur readiness dono same endpoint (jaise `/health/ready`) point karte hain, toh ek dangerous cascading failure ho sakta hai: database slow ho gaya → readiness fail → but agar wahi endpoint liveness bhi use kar raha hai → container restart ho jayega → naya container bhi database slow hone ki wajah se fail hoga → **restart loop** shuru ho jayega jab tak database recover na ho. Yeh problem ko aur bada kar deta hai jabki database already stressed hai.

## Alerting Rules

**Kya hota hai?** Health check endpoints toh sirf "haan/nahi" batate hain, lekin production mein tumhe metrics ko continuously watch karna padta hai — error rate, latency, disk space, memory — aur jab yeh thresholds cross karein, tumhe pata chalna chahiye **bina dashboard khole**. Yahan pe Prometheus jaisa monitoring tool alerting rules define karke kaam karta hai.

```yaml
# Prometheus alerting rules
groups:
  - name: application
    rules:
      - alert: ServiceDown
        expr: |
          up{job="myapp"} == 0
        for: 1m
        annotations:
          summary: "Service is down"

      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Error rate {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        annotations:
          summary: "p99 latency is {{ $value }}s"

      - alert: DiskSpaceLow
        expr: |
          node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        annotations:
          summary: "Only 10% disk space remaining"
```

Chalo har alert ko ek-ek karke samjho, jaise koi CRED transaction fraud detect karne wala system:

- **`ServiceDown`** — Prometheus `up` metric use karta hai jo batata hai kya target scrape ho pa raha hai (0 ya 1). Agar 1 minute tak `0` rahe, toh alert fire hoga. `for: 1m` isliye important hai — bina isske, ek single failed scrape (jo network glitch ki wajah se ho sakta hai) bhi false alarm bana dega. Yeh waisa hi hai jaise UPI transaction fail hone pe turant fraud alert na bhej ke, agar 2-3 baar consistently fail ho raha ho tabhi flag karo.

- **`HighErrorRate`** — Yeh 5xx status wale requests ki rate calculate karta hai last 5 minutes mein, aur agar total requests ka 5% se zyada errors hain, toh alert fire hoga. Yeh IRCTC ke tatkal booking jaisa hai — agar achanak 5% se zyada requests fail hone lagein (server errors ki wajah se), toh iska matlab kuch bada break ho gaya hai, sirf ek user ka issue nahi.

- **`HighLatency`** — `histogram_quantile(0.99, ...)` p99 latency nikalta hai — matlab 99% requests kitni der mein complete hui, sabse slow 1% ko chhod ke. Agar yeh 1 second se zyada ho jaaye, matlab tumhara app slow ho raha hai. Zomato order placement agar 1 second se zyada le raha hai, toh users frustrate ho ke app band kar dete hain — is threshold ko monitor karna business-critical hai.

- **`DiskSpaceLow`** — Available disk space ko total disk size se divide karke percentage nikalta hai, aur agar 10% se kam bacha hai toh alert. Notice karo iska koi `for` clause nahi hai — matlab yeh turant fire ho jayega jaise hi threshold cross hoga, kyunki disk full hona kabhi bhi sudden nahi hota (gradually badhta hai), isliye ek single check bhi reliable signal hota hai. Disk full ho jaaye toh database writes fail hone lagte hain — ek silent killer hai jo agar time pe na pakda jaaye toh poora system down kar sakta hai.

> [!info]
> `for` clause ka purpose hai **noise reduce karna**. Bina isske, har chhota sa spike (jo apne aap fix ho jaata) bhi alert bhej dega, aur teams "alert fatigue" mein aa jaayengi — matlab itne zyada false alarms aayenge ki log real alerts ko bhi ignore karne lagenge. Isko soch lo us building security guard jaisa jo har chhoti si billi ki awaaz pe bhi alarm bajata hai — kuch dino baad log alarm ko hi ignore karna shuru kar denge.

## Alert Notification

**Kya hota hai?** Sirf alert detect karna kaafi nahi hai — usse sahi insaan tak, sahi channel pe, sahi urgency ke saath pahunchana bhi zaruri hai. Yahan **Alertmanager** (Prometheus ka companion tool) kaam mein aata hai, jo alerts ko route, group, aur deduplicate karta hai.

```yaml
# Alertmanager config
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

  receiver: 'team-slack'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'team-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'xxxxx'
```

Isko step-by-step samjho:

- **`group_by: ['alertname']`** — Agar ek hi alert (jaise `HighErrorRate`) multiple servers pe simultaneously fire ho raha hai, toh Alertmanager unhe ek single notification mein group kar dega, instead of 50 alag-alag Slack messages bhejne ke. Bilkul waise jaise Swiggy ek hi restaurant ke 10 orders ko ek batch mein group karke delivery boy ko bhejta hai, instead of 10 alag trips karne ke.

- **`group_wait: 10s`** — Pehla alert aane ke baad, Alertmanager 10 second wait karega taaki agar related alerts aur bhi aayein toh unhe ek saath group kar sake, phir notification bhejega.

- **`group_interval: 10s`** — Agar naye alerts existing group mein add ho, toh next notification kab bheje.

- **`repeat_interval: 12h`** — Agar ek alert already resolved nahi hua hai, toh usko dobara kab remind kare. 12 ghante is default rakha jaata hai taaki team ko baar-baar spam na ho lekin unresolved critical issue bhula bhi na diya jaaye.

- **`receiver: 'team-slack'`** — Default receiver. Zyada tar non-critical alerts Slack `#alerts` channel mein jaate hain, jahan team casually monitor kar sakti hai.

- **`routes` with `match: severity: critical`** — Yeh ek routing rule hai: agar alert ki severity "critical" hai, toh usko default Slack receiver ke bajaye **PagerDuty** ko bhejo. PagerDuty phone call/SMS/push notification bhejta hai jab tak koi acknowledge na kare — raat ke 3 baje bhi. Yeh CRED ke fraud alert jaisa hai: normal notification email se ho sakta hai, lekin high-value suspicious transaction ke liye turant phone call jaana chahiye.

> [!warning]
> Sirf Slack pe alerts bhejna kaafi nahi hai agar critical hai — raat ko log so rahe hote hain aur Slack notification miss ho jaati hai. Isliye **severity-based routing** critical hai: low severity → Slack (team dekh legi jab online aayegi), high/critical severity → PagerDuty ya phone call (on-call engineer ko turant jagaya jaaye). Production mein "sab kuch Slack pe daal do" approach se downtime ghante tak chal sakta hai bina kisi ko pata chale.

### On-Call aur Runbooks

Ek aur cheez jo alerts ke saath zaruri hai — **runbook**. Jab alert fire hota hai, on-call engineer ko sirf "Error rate high hai" batana kaafi nahi — usse yeh bhi pata hona chahiye ki **kya karna hai**. Isliye har critical alert ke saath ek runbook link hona chahiye jisme steps ho: "yeh dashboard check karo, yeh command run karo, agar yeh case hai toh rollback karo". Bina runbook ke, alert sirf panic create karta hai, solution nahi deta — bilkul waise jaise fire alarm bajne se aag nahi bujhti, tumhe pata hona chahiye extinguisher kahan hai.

## Key Takeaways

- **Liveness probe** sirf yeh check karta hai ki process crash toh nahi hui — fail hone pe container **restart** hota hai. Isme dependencies (DB, cache) check mat karo, warna cascading restart loop ban sakta hai.
- **Readiness probe** check karta hai ki app dependencies ke saath traffic serve karne layak hai ya nahi — fail hone pe pod se **traffic hata diya jaata hai**, restart nahi hota.
- **`/health`, `/health/live`, `/health/ready`** — teeno ka role alag hai; inhe mix mat karo.
- Prometheus **alerting rules** metrics (error rate, latency, disk space, uptime) ko thresholds ke against continuously evaluate karte hain, aur `for` clause noise reduce karta hai.
- **Alertmanager** alerts ko group, deduplicate, aur severity ke basis pe route karta hai — critical alerts PagerDuty pe, normal alerts Slack pe.
- Har critical alert ke saath ek **runbook** hona chahiye taaki on-call engineer ko pata ho kya action lena hai, sirf notification kaafi nahi.
- Sahi `initialDelaySeconds` aur `failureThreshold` set karna zaruri hai — bahut aggressive settings false restarts/traffic-drops create karte hain, bahut lenient settings real problems ko der se pakadte hain.

Next: [Performance Monitoring](./07_performance_monitoring.md)

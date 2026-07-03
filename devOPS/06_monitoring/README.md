# Monitoring & Observability

Socho tumne apna app deploy kar diya production mein — sab kuch chal raha hai, users use kar rahe hain, aur ek din 2 baje raat ko app down ho jaata hai. Ab sawaal yeh hai — tumhe kaise pata chalega? Koi user complain karega tabhi? Ya tumhe khud pehle pata chal jaayega?

Yehi fark hota hai monitoring aur observability ka. Jaise Swiggy ya Zomato ka backend team kabhi sona nahi chahta jab tak unka dashboard green hai — waise hi humein bhi apne systems ko "dekhna" aana chahiye, bina unhe manually check kiye. Is section mein hum seekhenge production systems ko poori tarah se monitor aur observe karna — taaki problem hone se pehle ya turant baad usse pakad sakein, root cause tak pahunch sakein, aur system ko healthy rakh sakein.

## Kyun zaruri hai monitoring?

Jab tak tumhara app sirf tumhare laptop pe chal raha tha, kuch bhi galat hota tha to terminal mein error dikh jaata tha. Lekin production mein:
- Hazaaron users simultaneously request bhej rahe hain (IRCTC ki tatkal booking jaisa load socho)
- Server kai machines pe distributed hai
- Ek request database, cache, third-party API, message queue — sabse hoke guzarti hai
- Kuch bhi kahin bhi fail ho sakta hai — aur tumhe pata bhi nahi chalega jab tak koi tumhe batayega nahi

Isliye monitoring sirf "nice to have" nahi hai — yeh production systems ki backbone hai. Bina monitoring ke tum blind fold laga ke gaadi chala rahe ho.

## Topics Covered

1. **Observability Concepts** - Metrics, logs, traces, the three pillars
2. **Application Logging** - Structured logging, log levels, best practices
3. **CloudWatch** - Logs, metrics, alarms, dashboards
4. **Prometheus & Grafana** - Metrics collection, visualization, alerting
5. **Distributed Tracing** - Jaeger, OpenTelemetry, request tracing
6. **Health Checks & Alerts** - Liveness, readiness probes, alerting strategies
7. **Performance Monitoring** - APM tools, profiling, optimization

Chalo har topic ko thoda detail mein samajhte hain, taaki sirf naam padh ke aage na badho, balki asal mein samajh aaye kya seekhna hai.

### 1. Observability Concepts — Metrics, Logs, Traces (The Three Pillars)

**Kya hota hai?**
Observability ka matlab hai — system ke internal state ko uske external outputs se samajh paana, bina system ko modify kiye. Iske teen pillars hote hain:

- **Metrics** — numbers over time. Jaise "is minute mein kitne requests aaye", "CPU usage kitna hai", "response time kitna hai". Yeh Swiggy ke dashboard jaisa hai jahan tumhe pata chalta hai "is waqt kitne orders active hain" — ek number, time ke saath.
- **Logs** — events ka detailed record. "User X ne 10:32 baje login kiya", "Payment failed for order #4521 — reason: card declined". Yeh tumhare CCTV footage jaisa hai — exact kya hua, kab hua.
- **Traces** — ek single request ka poora safar, alag-alag services se hoke. Jaise ek Swiggy order — pehle order-service ko gaya, phir restaurant-service ko, phir payment-service ko, phir notification-service ko. Trace tumhe batata hai ki is poore safar mein kaunsa step sabse zyada time le raha hai.

**Kyun zaruri hai?**
Sirf ek pillar kaafi nahi hota. Metrics tumhe batayenge "response time badh gaya hai" lekin *kyun* badha, yeh nahi batayenge. Logs tumhe ek specific error dikhayenge lekin poora pattern nahi dikhayenge. Traces tumhe batayenge ki microservices ke beech kahan bottleneck hai. Teeno milke ek complete picture banate hain — jaise doctor ke paas patient ka blood pressure (metric), medical history (logs), aur MRI scan (trace) sab ho to sahi diagnosis hoti hai.

> [!info]
> Monitoring vs Observability mein fark hai: **Monitoring** tumhe batata hai *kya* galat hua (known problems ke liye alerts). **Observability** tumhe capability deta hai *kyun* galat hua yeh dhoondhne ki, chahe woh problem pehle kabhi dekhi na ho.

### 2. Application Logging — Structured Logging, Log Levels, Best Practices

**Kya hota hai?**
Logging matlab apne application ke andar ho rahe events ko record karna. Lekin sirf `console.log("kuch hua")` likhna kaafi nahi hai production mein.

**Structured logging** ka matlab hai logs ko plain text ki jagah JSON format mein likhna, taaki machine easily parse kar sake:

```javascript
// Bura tarika - plain text
console.log("User 123 logged in at 10:30");

// Achha tarika - structured JSON
logger.info("user_login", {
  userId: 123,
  timestamp: new Date().toISOString(),
  ip: req.ip,
  service: "auth-service"
});
```

Jab tumhare paas lakhon logs ho jaayein (jaise CRED ke transaction logs), tab tum text search nahi kar sakte — tumhe query karni padegi jaise "sab failed payments dikhao jahan amount > 1000". Structured logs ke saath yeh easy ho jaata hai kyunki tools (Elasticsearch, CloudWatch Insights) JSON fields pe query kar sakte hain.

**Log Levels** — har log ki ek severity hoti hai:
- `DEBUG` — development mein detailed info, production mein usually off
- `INFO` — normal operations ("user logged in", "order placed")
- `WARN` — kuch unusual hua but app crash nahi hua ("retry ho raha hai 3rd time")
- `ERROR` — kuch fail hua jo handle karna padega ("payment gateway timeout")
- `FATAL/CRITICAL` — app crash hone wala hai ya ho gaya

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

logger.info('Order created', { orderId: 'ORD123', userId: 'U456' });
logger.error('Payment failed', { orderId: 'ORD123', reason: 'card_declined' });
```

**Best Practices:**
- Kabhi bhi sensitive data log mat karo (password, card number, OTP) — yeh security disaster hai
- Har log mein `requestId` ya `correlationId` add karo taaki ek request ke saare logs ek saath dhoondh sako
- Production mein `DEBUG` level off rakho, warna logs ka volume bahut zyada ho jaayega aur storage cost badh jaayegi
- Log rotation setup karo — files infinite badhti nahi rehni chahiye

> [!warning]
> Kabhi bhi user ka password, credit card number, ya OTP logs mein mat likhna — chahe woh error message mein hi kyun na ho. Yeh compliance violation (PCI-DSS, GDPR) ban sakta hai aur agar logs leak ho gaye to bahut bada security incident ho jaayega.

### 3. CloudWatch — Logs, Metrics, Alarms, Dashboards

**Kya hota hai?**
AWS CloudWatch AWS ka native monitoring service hai. Agar tumhara app AWS pe hai (EC2, Lambda, ECS, RDS), to CloudWatch automatically bahut sara data collect karta hai.

**CloudWatch Logs** — saare application logs ek jagah collect hote hain:

```bash
# EC2 instance se logs CloudWatch bhejne ke liye agent install karo
sudo yum install amazon-cloudwatch-agent

# Config file banao
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/app/*.log",
            "log_group_name": "/myapp/production",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF
```

**CloudWatch Metrics** — default metrics (CPU, network, disk) automatically aate hain, lekin custom metrics bhi bhej sakte ho:

```javascript
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

async function recordOrderMetric(status) {
  await cloudwatch.putMetricData({
    Namespace: 'MyApp/Orders',
    MetricData: [{
      MetricName: 'OrdersProcessed',
      Dimensions: [{ Name: 'Status', Value: status }],
      Value: 1,
      Unit: 'Count'
    }]
  }).promise();
}
```

**CloudWatch Alarms** — jab koi metric threshold cross kare, alert bhejo:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "high-cpu-usage" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-south-1:123456789:alert-topic
```

Socho isko CRED ke fraud detection system jaisa — jaise hi kuch threshold cross hota hai (jaise ek din mein bahut zyada failed transactions), turant team ko SMS/Slack pe alert chala jaata hai.

**Dashboards** — CloudWatch Dashboards se tum ek hi jagah CPU, memory, request count, error rate — sab visualize kar sakte ho, jaise ek pilot ka cockpit jahan saare important gauges ek saath dikhte hain.

**Kyun zaruri hai?**
Agar tum AWS use kar rahe ho, to CloudWatch already available hai — extra infrastructure setup nahi karna padta. Yeh chhote se medium projects ke liye kaafi hota hai. Lekin jaise jaise scale badhta hai aur multi-cloud ya on-prem bhi mix hota hai, log Prometheus/Grafana jaise open-source tools ki taraf shift karte hain.

### 4. Prometheus & Grafana — Metrics Collection, Visualization, Alerting

**Kya hota hai?**
Prometheus ek open-source metrics collection aur alerting tool hai jo **pull-based model** use karta hai — matlab Prometheus khud jaake tumhare application se metrics "scrape" (khींchता) karta hai, ek fixed interval pe (jaise har 15 seconds).

Grafana ek visualization tool hai jo Prometheus (ya kisi bhi data source) se data leke beautiful, interactive dashboards banata hai.

**Kaise kaam karta hai — flow samjho:**

1. Tumhara app apne metrics ko ek `/metrics` endpoint pe expose karta hai
2. Prometheus har kuch second mein us endpoint ko scrape karta hai
3. Data Prometheus ke time-series database mein store hota hai
4. Grafana Prometheus se query karke graphs banata hai

```javascript
// Node.js app mein Prometheus metrics expose karna
const promClient = require('prom-client');
const express = require('express');
const app = express();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, status_code: res.statusCode });
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.listen(3000);
```

Prometheus config (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-node-app'
    static_configs:
      - targets: ['localhost:3000']

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

Alerting rule (agar error rate zyada ho jaaye to alert):

```yaml
groups:
  - name: app_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for last 5 minutes"
```

**Grafana dashboard mein** tum PromQL (Prometheus Query Language) likh ke graphs bana sakte ho:

```promql
# Request rate per second
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Analogy samjho:** Prometheus + Grafana ka combo bilkul waisa hai jaise Zomato ka "delivery partner tracking system" — Prometheus har delivery partner ki location, speed, status ko regularly poll karta hai (pull karta hai), aur Grafana us data ko ek live map pe dikhata hai jahan operations team dekh sakti hai kaunsa area mein zyada delay ho raha hai.

**Kyun zaruri hai?**
Prometheus + Grafana industry standard hai kyunki yeh open-source, cloud-agnostic hai (AWS, GCP, on-prem sabpe kaam karta hai), aur Kubernetes ke saath bahut acche se integrate hota hai (Kubernetes khud Prometheus format mein metrics expose karta hai).

> [!tip]
> Agar tum Kubernetes use kar rahe ho, to Prometheus + Grafana almost default choice ban jaata hai kyunki Kubernetes ecosystem (kube-state-metrics, node-exporter) already Prometheus format support karta hai.

### 5. Distributed Tracing — Jaeger, OpenTelemetry, Request Tracing

**Kya hota hai?**
Jab tumhara app monolith tha, ek request ka poora flow ek hi process mein hota tha — debug karna easy tha. Lekin microservices duniya mein ek single request (jaise "order place karo") 5-10 different services se hoke guzarta hai:

```
User Request → API Gateway → Order Service → Inventory Service → Payment Service → Notification Service
```

Agar is request mein delay ho raha hai, to kaise pata chalega *kaunsi* service slow hai? Yahi kaam **distributed tracing** karta hai.

**Trace, Span, aur Context Propagation:**
- Ek **trace** poore request ka end-to-end journey represent karta hai (ek unique trace ID ke saath)
- Har service jo is request ko process karti hai, ek **span** create karti hai (start time, end time, metadata ke saath)
- Yeh trace ID request ke saath propagate hota hai (headers mein), taaki saari services ek hi trace ka part bane

Socho isko IRCTC ki tatkal booking jaisa — jab tum ticket book karte ho, request pehle **authentication service** ko jaati hai, phir **seat availability service** ko, phir **payment service** ko, phir **PNR generation service** ko. Agar booking slow hai, to distributed tracing tumhe exactly dikhayega ki kaunsi service mein 3 second lag raha hai — shayad payment gateway ka response slow hai.

**OpenTelemetry** aajkal ka industry-standard hai tracing instrument karne ke liye (vendor-neutral — kisi bhi backend jaise Jaeger, Zipkin, ya Datadog ke saath kaam karta hai):

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Manual span banane ke liye:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function processOrder(orderId) {
  const span = tracer.startSpan('process-order');
  span.setAttribute('order.id', orderId);

  try {
    await checkInventory(orderId);
    await processPayment(orderId);
    span.setStatus({ code: 0 }); // OK
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message }); // ERROR
    throw err;
  } finally {
    span.end();
  }
}
```

**Jaeger** ek popular open-source tracing backend hai jo traces ko collect, store, aur visualize karta hai — ek waterfall diagram ki tarah, jahan tum exactly dekh sakte ho kaunsa step kitna time le raha hai.

**Kyun zaruri hai?**
Bina distributed tracing ke, microservices architecture mein performance problem dhoondhna sui mein dhaaga dhoondhne jaisa hai. Tracing tumhe visually dikha deta hai — "haan yehi service bottleneck hai" — logs aur metrics milke bhi itni clarity nahi de sakte jitni ek trace waterfall diagram deta hai.

### 6. Health Checks & Alerts — Liveness, Readiness Probes, Alerting Strategies

**Kya hota hai?**
Health checks woh endpoints hote hain jo batate hain "mera app zinda hai aur kaam karne ke liye ready hai ya nahi". Kubernetes jaise orchestrators inhe use karke decide karte hain ki traffic bhejna hai ya container ko restart karna hai.

Do tarah ke probes hote hain:

- **Liveness Probe** — "kya app process abhi bhi zinda hai?" Agar fail ho jaaye, Kubernetes container ko restart kar deta hai. Yeh check karta hai deadlock ya crash jaisi cheezein.
- **Readiness Probe** — "kya app abhi request serve karne ke liye ready hai?" Agar fail ho jaaye, Kubernetes us pod pe traffic bhejna band kar deta hai (lekin restart nahi karta). Yeh useful hai jab app startup pe database connection wait kar raha ho, ya temporarily overloaded ho.

Socho isko restaurant jaisa — **liveness** check karta hai "kya restaurant khula hai ya band ho gaya" (agar band hai, to naya staff bhejo/restart karo). **Readiness** check karta hai "kya waiter abhi order lene ke liye free hai" (agar busy hai, temporarily naye customers ko wait karwao, lekin restaurant band mat karo).

```javascript
const express = require('express');
const app = express();

let isReady = false;
let dbConnected = false;

// App startup ke baad database connect hone tak time lagta hai
connectToDatabase().then(() => {
  dbConnected = true;
  isReady = true;
});

// Liveness - simple check, process zinda hai ya nahi
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness - dependencies ready hain ya nahi
app.get('/health/ready', (req, res) => {
  if (isReady && dbConnected) {
    res.status(200).json({ status: 'ready', db: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', db: dbConnected ? 'connected' : 'disconnected' });
  }
});
```

Kubernetes deployment mein use karna:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

**Alerting Strategies:**
Alert lagana easy hai, lekin *sahi* alert lagana skill hai. Kuch important principles:

- **Alert on symptoms, not causes** — "response time > 2s" better hai "CPU > 90%" se, kyunki high CPU hamesha problem nahi hota
- **Avoid alert fatigue** — agar tumhe din mein 50 alerts aa rahe hain, log unhe ignore karna shuru kar denge (jaise WhatsApp group notifications jo koi padhta nahi)
- **Actionable alerts** — har alert ke saath yeh clear hona chahiye ki kya action lena hai
- **On-call rotation** — teams mein ek rotation hoti hai ki kaun alert respond karega, jaise Ola/Uber ke driver shifts

> [!warning]
> Alert fatigue ek real problem hai. Agar har chhoti cheez pe alert bhejoge, team unhe mute karna shuru kar degi — aur jab asli critical issue aayega, tab bhi ignore ho jaayega. "Cry wolf" wali situation na banao.

### 7. Performance Monitoring — APM Tools, Profiling, Optimization

**Kya hota hai?**
APM (Application Performance Monitoring) tools jaise New Relic, Datadog, ya Elastic APM ek level upar jaake dikhate hain ki code ke andar exactly kahan time lag raha hai — database query slow hai, ya external API call, ya koi CPU-heavy computation.

**Profiling** — code ke andar function-level performance dekhna:

```javascript
// Node.js built-in profiler use karke
// node --prof app.js
// Phir: node --prof-process isolate-*.log > profile.txt

// Ya simple timing ke liye
console.time('database-query');
const result = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
console.timeEnd('database-query');
```

APM tool integration example (Datadog):

```javascript
require('dd-trace').init({
  service: 'order-service',
  env: 'production',
  logInjection: true
});

const express = require('express');
const app = express();
```

**Key Metrics to track:**
- **Response time (latency)** — p50, p95, p99 percentiles (average kaafi nahi hota, kyunki outliers chhup jaate hain)
- **Throughput** — kitne requests per second handle ho rahe hain
- **Error rate** — kitne percent requests fail ho rahe hain
- **Saturation** — resources (CPU, memory, connection pool) kitne capacity pe chal rahe hain

Yeh four metrics ko "Golden Signals" bhi kaha jaata hai (Google SRE book se popular hua).

Socho isko Flipkart ke Big Billion Days sale jaisa — jab traffic 10x badh jaata hai, APM tools turant dikha dete hain ki kaunsa service (checkout? payment? inventory?) bottleneck ban raha hai, taaki us specific service ko scale kiya ja sake, poore system ko nahi.

**Kyun zaruri hai?**
Bina performance monitoring ke, optimization guesswork ban jaata hai. APM tools tumhe data-driven decisions lene deta hai — "yeh specific query slow hai, isko optimize karo" — instead of randomly cheezein try karna.

## Prerequisites

Is section mein aage badhne se pehle yeh cheezein pata honi chahiye:

- Running applications on AWS/Kubernetes — kam se kam basic deployment experience
- Understanding of Docker and orchestration — containers kaise chalte hain
- Basic knowledge of metrics and logs — kya farak hai in dono mein

Agar in mein se koi bhi weak hai, pehle un topics ko revise kar lo, warna monitoring concepts thoda abstract lagenge.

## What You'll Build

Is section ke end tak, tum yeh sab kar paoge:

- Implement structured application logging — proper log levels aur JSON format ke saath
- Set up CloudWatch for AWS resources — logs, metrics, alarms, dashboards
- Deploy Prometheus and Grafana stack — metrics collect aur visualize karna
- Implement distributed tracing — microservices ke beech request flow track karna
- Configure health checks and alerting — liveness/readiness probes aur smart alerts
- Monitor application performance — APM tools se bottlenecks dhoondhna

## Key Takeaways

- Monitoring aur observability alag cheezein hain — monitoring batata hai *kya* galat hua, observability deta hai capability *kyun* samajhne ki
- Teen pillars yaad rakho — **Metrics** (numbers over time), **Logs** (detailed events), **Traces** (request ka poora journey)
- Structured logging (JSON format) production mein plain text logs se bahut behtar hai — searchable aur queryable hota hai
- Kabhi bhi sensitive data (password, card number, OTP) logs mein mat likhna
- CloudWatch AWS-native quick setup ke liye achha hai; Prometheus + Grafana cloud-agnostic aur Kubernetes-friendly hai
- Distributed tracing (OpenTelemetry + Jaeger) microservices mein bottleneck dhoondhne ke liye zaruri hai
- Liveness probe = "zinda hai ya restart karo", Readiness probe = "traffic bhejna hai ya nahi"
- Alert fatigue se bacho — sirf actionable, symptom-based alerts banao
- Golden Signals yaad rakho: Latency, Throughput, Error rate, Saturation
- Average latency pe bharosa mat karo — p95/p99 percentiles dekho, outliers chhup jaate hain average mein

**Previous Section**: [← Infrastructure as Code](../05_infrastructure_as_code/)

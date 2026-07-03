# Application Logging

Socho tumhara Zomato jaisa app hai aur ek din raat 2 baje production mein order placement fail hone laga. Ab tumhare paas do options hain — ya to tum SSH karke server pe baithe ho aur `console.log` ke bhare pade output mein Ctrl+F maar rahe ho, ya phir tumhare paas ek proper structured logging system hai jahan tum 2 second mein query maar sakte ho: "saare failed orders jinka userId = 123 tha, last 10 minutes mein". Application logging basically wahi second wala scene set up karne ke baare mein hai — taaki debugging aur monitoring dono easy ho jaaye.

Logging sirf `console.log` chipka dena nahi hai. Yeh ek discipline hai — kya log karna hai, kaise log karna hai, kitna detail chahiye, aur sabse important — kya **kabhi bhi** log nahi karna hai (jaise password). Chalo ek ek karke samajhte hain.

## Logging Levels

**Kya hota hai?** Har log line ki ek "severity" hoti hai — matlab yeh batana ki yeh message kitna important/urgent hai. Jaise IRCTC app mein alag alag notification categories hoti hain — "seat confirm hui" (normal info) vs "train cancel ho gayi" (critical alert). Same tarah se application logs bhi levels mein divide hote hain taaki tum shor mein se signal nikal sako.

```
DEBUG   - Development info, verbose
INFO    - Normal operation, important events
WARN    - Potential problems, warnings
ERROR   - Errors, failures
FATAL   - System failure, crash
```

**Kyun zaruri hai?** Production mein agar tum sab kuch INFO ya usse bhi neeche DEBUG level pe log karoge, toh logs ka volume itna zyada ho jayega ki useful cheez dhundhna bhaari padega — bilkul waise jaise Diwali sale ke din Flipkart ke saare notifications ek saath aa jaayein aur tumhe important wala (order shipped) dikhe hi na. Isliye:

- **DEBUG**: Sirf development/staging mein on karo. "Yeh function call hua", "yeh variable ki value yeh hai" jaisa verbose detail. Production mein isse off rakhte hain kyunki noise bahut hoga.
- **INFO**: Normal business events — "user logged in", "order placed", "payment successful". Yeh tumhare app ki "heartbeat" hai, batati hai sab thik chal raha hai.
- **WARN**: Kuch aisa hua jo error nahi hai lekin dhyaan dene layak hai — jaise "API response time 3 second se zyada aaya" ya "retry queue mein items badh rahe hain". Ola driver ko "traffic zyada hai, thoda late ho sakta hai" jaisa signal.
- **ERROR**: Kuch fail hua — jaise payment declined, database query fail, external API ne 500 diya. Yeh actionable hai, kisi ko dekhna padega.
- **FATAL**: Poora system hi crash ho gaya ya itna bada issue hai ki app chal hi nahi sakta — jaise database connection hi nahi ban raha startup pe. Yeh turant page/alert trigger karna chahiye.

> [!tip]
> Production mein generally minimum level `INFO` rakhte hain (DEBUG off), taaki logs manageable rahein. Jab kisi specific issue ko debug karna ho, temporarily DEBUG level on kar sakte ho.

## Structured Logging

**Kya hota hai?** "Structured" ka matlab hai ki tumhara log message ek plain sentence nahi hai, balki key-value pairs ka ek object hai — jaise JSON. Isse machine (log aggregator, search tool) usko parse karke query kar sakti hai. Farak dekho:

```javascript
// ❌ Unstructured
console.log("User login attempt for user");
```

Yeh line kuch batati hi nahi — kaunsa user? Kab? Kis IP se? Agar tumhe yeh dhundhna ho ki "user 123 ne kab kab login try kiya", toh tumhe raw text mein regex maarna padega. Bilkul waise jaise ek bill book mein handwriting mein saara data likha ho aur tumhe usme se search karna ho — possible hai lekin painful hai.

```javascript
// ✅ Structured
logger.info("User login attempt", {
  userId: "123",
  email: "user@example.com",
  ip: "192.168.1.1",
  timestamp: "2024-01-15T10:30:45Z"
});
```

Yeh output hota hai:

```json
{
  "level": "INFO",
  "message": "User login attempt",
  "userId": "123",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "timestamp": "2024-01-15T10:30:45Z",
  "service": "auth"
}
```

Ab yeh ek proper database record jaisa lagta hai. Log aggregator (jaise Elasticsearch ya CloudWatch Insights) isme direct query maar sakta hai: `userId = "123" AND level = "ERROR"`. Ek UPI transaction ki tarah socho — agar har transaction ka ek structured record ho (amount, sender, receiver, timestamp, status), toh audit karna, dispute resolve karna sab easy ho jaata hai. Agar sab kuch sirf ek free-text note ho, toh reconciliation nightmare ban jaata hai.

> [!info]
> `service: "auth"` jaisa field bhi important hota hai — jab tumhare paas microservices architecture ho (auth service, order service, payment service alag alag), toh yeh field batata hai konsa service ne log likha. Isse cross-service debugging easy hoti hai.

## Logging Library Examples

Har language mein battle-tested logging libraries available hain jo structured logging, multiple transports (file, console, remote), log rotation, aur formatting handle karti hain. Khud se yeh sab implement karne ki zaroorat nahi — wheel reinvent mat karo.

### Node.js with Winston

Winston Node.js ecosystem ki sabse popular logging library hai. Yeh multiple "transports" support karti hai — matlab tum ek hi logger se console pe bhi likh sakte ho, file mein bhi, aur kisi remote service (jaise CloudWatch ya Datadog) ko bhi bhej sakte ho, sab ek saath.

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info("Order created", { orderId: "456", amount: 99.99 });
logger.error("Payment failed", { error: "Declined", code: "declined" });
```

Yahan dhyaan do — `error.log` file sirf `error` level (aur usse upar, jaise `fatal`) ke logs store karti hai, jabki `combined.log` mein sab kuch aata hai. Yeh pattern kaafi common hai — production incidents ke time tumhe sirf errors dekhne hain, poora noise nahi. Bilkul Swiggy ke support dashboard jaisa — "escalated complaints" ka alag view hota hai "all tickets" se.

### Python with Structlog

Python duniya mein `structlog` similar kaam karta hai — structured, key-value based logging jo JSON mein output kar sakta hai.

```python
import structlog

logger = structlog.get_logger()

logger.info("database_query", query="SELECT * FROM users", duration_ms=245)
logger.error("api_error", status=500, endpoint="/api/users", error="Internal error")
```

Dono examples mein pattern same hai — ek short event name (`"database_query"`, `"api_error"`) plus context ke key-value pairs. Yeh design intentional hai: event name se tum jaldi samajh jaate ho "kya hua", aur key-values se "kis context mein hua".

## Best Practices

Ab kuch aisi cheezein jo experience se seekhi jaati hain — aur agar tum inko shuru se follow karo toh production debugging bahut aasan ho jaati hai.

```javascript
// ✅ Include context
logger.info("Request processed", {
  requestId: req.id,
  userId: req.user.id,
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  durationMs: Date.now() - req.startTime
});
```

**Context zaruri kyun hai?** Socho tumhara ek microservice hai jo Ola ke ride-matching ka kaam karta hai, aur kisi user ne complaint ki "mera ride assign nahi hua". Agar tumhare logs mein `requestId` hai, toh tum us ek request ka poora journey trace kar sakte ho — kahan se request aayi, kaunsi service ne kya kiya, kahan time zyada laga. `requestId` ek tarah ka tracking number hai, jaise courier tracking ID — usse tum poori delivery chain follow kar sakte ho.

```javascript
// ❌ Don't log sensitive data
logger.info("User", { username, password });  // BAD
```

> [!warning]
> Yeh sabse common aur sabse dangerous mistake hai. Password, OTP, credit card number, CVV, Aadhaar number, session tokens — yeh sab agar plain text mein log ho gaye, toh woh data tumhare log files/log aggregator mein forever store ho jaata hai, jahan access control utna strict nahi hota jitna production database pe hota hai. Agar kabhi log leak ho gaya (misconfigured S3 bucket, compromised log server), toh yeh ek massive data breach ban jaata hai. CRED ya kisi bhi payment app mein aisi galti company ko crore rupaye ka fine aur reputation damage kara sakti hai.

```javascript
// ✅ Redact sensitive data
logger.info("User", {
  username,
  password: "***"
});
```

Sahi tareeka yeh hai — sensitive fields ko redact/mask karo, ya better, unko log hi mat karo. Bahut saari logging libraries mein built-in "redaction" feature hota hai jahan tum field names specify kar dete ho (jaise `password`, `token`, `cardNumber`) aur woh automatically `***` se replace ho jaate hain, chahe developer bhool bhi jaaye.

```javascript
// ✅ Use appropriate levels
logger.debug("Processing step 1");      // Development
logger.info("User logged in");          // Normal operations
logger.warn("High memory usage");       // Potential issue
logger.error("Database query failed");  // Error
logger.fatal("System crashed");         // Critical
```

Level sahi choose karna itna hi important hai jitna message likhna. Agar tum har cheez ko `error` level pe log karoge (kyunki "dikh toh jaayega"), toh jab actual critical error aayega, woh baaki noise mein dab jaayega — jaise agar building mein har chhoti baat pe fire alarm bajta rahe, toh log log usse ignore karna shuru kar denge, aur jab asli aag lagegi tab bhi koi react nahi karega.

## Aggregation

**Kya hota hai?** Agar tumhare paas 5 microservices hain, har ek 3-4 instances pe chal raha hai (auto-scaling ki wajah se), toh logs 15-20 alag alag jagah generate ho rahe hain. Agar koi issue debug karna ho, toh har server pe SSH karke log file dekhna practically impossible hai. **Log aggregation** ka matlab hai — saare services/instances ke logs ek central jagah collect karna, taaki ek hi dashboard se search/filter/alert set kar sako.

Zomato jaisa socho — agar har restaurant apna order register alag rakhe, toh Zomato ko pura business analyze karne ke liye har restaurant jaake register dekhna padega. Iske bajaye Zomato ka central system hai jahan sab orders ek jagah aa jaate hain — chahe order kisi bhi restaurant se ho. Log aggregation bhi wahi role play karta hai infrastructure ke liye.

```bash
# CloudWatch Logs (AWS)
aws logs create-log-group --log-group-name /app/api

# ELK Stack (open source)
# Elasticsearch: storage and search
# Logstash: collection and parsing
# Kibana: visualization

# Splunk (commercial)
# Datadog (commercial)
```

Kuch popular options:

- **CloudWatch Logs (AWS)**: Agar tum already AWS pe ho, toh yeh sabse natural choice hai — EC2, ECS, Lambda sab automatically CloudWatch mein logs bhej sakte hain, aur CloudWatch Insights se query bhi maar sakte ho.
- **ELK Stack** (Elasticsearch + Logstash + Kibana): Open-source combo. Logstash logs collect/parse karta hai, Elasticsearch usko store/index karta hai (fast search ke liye), aur Kibana visualization/dashboard provide karta hai. Bahut companies self-hosted ELK use karti hain cost control ke liye.
- **Splunk**: Enterprise-grade commercial tool, powerful lekin costly. Bade enterprises mein compliance/audit heavy environments mein common hai.
- **Datadog**: Modern SaaS observability platform — logging ke sath metrics aur tracing bhi ek jagah milta hai, integration setup bhi easy hota hai.

> [!tip]
> Aggregation sirf storage nahi hai — asli power hai **alerting**. Tum rule bana sakte ho: "agar 5 minute mein `ERROR` level ke logs 100 se zyada aayein, toh Slack/PagerDuty pe alert bhejo". Isse tumhe production issue pata chalta hai user ke complain karne se pehle — jaise Swiggy proactively pata laga le ki kisi area mein delivery delay ho raha hai, before customer complaint aaye.

---

## Key Takeaways

- **Structured logging** (JSON key-value format) enables searching, filtering, aur querying — plain text messages ke bajaye
- **Logging levels** (DEBUG, INFO, WARN, ERROR, FATAL) signal-to-noise ratio maintain karte hain — production mein galat level use karna alerts ko useless bana sakta hai
- **Context** har log mein hona chahiye — requestId, userId, timing, method/path — taaki poora request journey trace ho sake
- **Never log sensitive data** — passwords, tokens, card numbers kabhi plain text mein log mat karo; redact karo ya skip karo
- **Aggregation** (CloudWatch, ELK, Splunk, Datadog) saare services/instances ke logs ek central jagah laata hai — debugging aur alerting dono ke liye zaruri
- Logging library (Winston for Node.js, Structlog for Python) use karo — khud se logging infra reinvent mat karo

Next: [CloudWatch](./03_cloudwatch.md)

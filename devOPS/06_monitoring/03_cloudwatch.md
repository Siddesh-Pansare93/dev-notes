# AWS CloudWatch

> AWS ke resources aur applications ko monitor karna — metrics, logs, aur alarms ke through.

Socho ek second ke liye — tumne Zomato jaisa ek order-processing service AWS pe deploy kiya hai. Server chal raha hai, orders aa rahe hain, sab theek lag raha hai... lekin tumhe kaise pata chalega ki CPU 95% pe chal raha hai, ya koi API 500 error de raha hai, ya database connections khatam ho rahe hain? Bina monitoring ke tum andhere mein tumhare production system chala rahe ho. **CloudWatch** yahi kaam karta hai — yeh AWS ka built-in "CCTV camera + alarm system" hai jo tumhare EC2, RDS, Lambda, aur baaki har AWS resource pe nazar rakhta hai.

Isko aise socho: CloudWatch ek building ka **security control room** hai jahan se:
- **Metrics** — CCTV screens hain jo real-time numbers dikhate hain (kitne log andar aaye, kitna traffic hai)
- **Logs** — security guard ki diary hai jisme har event likha jata hai (kaun aaya, kab aaya, kya hua)
- **Alarms** — siren hai jo bajta hai jab kuch galat ho raha ho (fire, intrusion, overload)
- **Dashboards** — control room ka wall hai jahan saare CCTV feeds ek saath dikh rahe hain

## Metrics

### Kya hota hai?

Metric ek **time-series data point** hai — matlab, kisi cheez ki value time ke saath kaise change ho rahi hai, uska record. Jaise Swiggy app mein tum dekh sakte ho "last 1 hour mein kitne orders aaye" — yeh ek metric hai. AWS khud bhi automatically bahut saare metrics collect karta hai (jaise EC2 ka CPUUtilization, RDS ka DatabaseConnections), lekin tum apne **custom metrics** bhi bhej sakte ho — jaise "kitne orders place hue" ya "payment failure rate kitna hai".

### Kyun zaruri hai?

Bina metrics ke tumhe pata hi nahi chalega ki system healthy hai ya nahi. Production mein "sab theek chal raha hai" bolna kaafi nahi — tumhe numbers chahiye. Jaise IRCTC ka team dekhta hai "kitne concurrent users tatkal booking window mein hain" taaki server crash hone se pehle scale kar sakein.

```bash
# Custom metric bhejo — apne app ka koi business metric CloudWatch ko push karo
aws cloudwatch put-metric-data \
  --namespace MyApp \
  --metric-name OrderCount \
  --value 42 \
  --timestamp 2024-01-15T10:30:00Z

# Metrics query karo — jaise "pichhle 1 din mein CPU kaisa raha"
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-123456 \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-16T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

Yahan `--namespace` samjho ek folder hai jisme tumhare related metrics rakhe jaate hain (jaise `MyApp` naam ka namespace tumhare application-level metrics ke liye), aur `AWS/EC2` jaisa namespace AWS ke apne built-in metrics ke liye reserved hota hai. `--period 3600` matlab data ko 1-1 ghante ke buckets mein group karke dikhao, aur `--statistics Average,Maximum` batata hai ki us bucket ke andar average aur maximum value kya thi.

> [!tip]
> Custom metrics ka cost associate hota hai — har unique metric (namespace + name + dimensions ka combination) ke liye alag charge lagta hai. Zyada dimensions mat daalo bina zaroorat ke, warna bill badh jayega.

## Logs

### Kya hota hai?

**CloudWatch Logs** tumhare application ke text logs ko centrally store karta hai — jaise ek Node.js server jo `console.log` kar raha hai, uske saare logs ek jagah collect ho jaate hain, chahe wo 10 servers pe chal raha ho ya 100. Isko soch lo ek **common diary** ki tarah jisme Zomato ke saare delivery partners apna daily update likh rahe hain — chahe wo Mumbai mein ho ya Bangalore mein, sab entries ek hi jagah aa rahi hain.

### Kyun zaruri hai?

Agar tumhare paas 10 EC2 instances hain load-balanced setup mein, aur ek request fail ho gayi, toh tumhe pata nahi hoga ki kis instance ne fail kiya. SSH karke har machine pe jaake log file dhoondna practically impossible hai. CloudWatch Logs sab kuch centralize kar deta hai — ek jagah se search karo, filter karo, aur real-time tail bhi kar sakte ho.

**Building blocks:**
- **Log Group** — ek category/folder (jaise `/app/api` — tumhare API service ke saare logs)
- **Log Stream** — ek log group ke andar ek specific source ki entries (jaise `api-server-1`, `api-server-2` — har server ka apna stream)

```bash
# Log group banao — yeh ek "folder" hai jisme related logs jaayenge
aws logs create-log-group --log-group-name /app/api

# Log events bhejo — actual log entry daalo
aws logs put-log-events \
  --log-group-name /app/api \
  --log-stream-name api-server-1 \
  --log-events timestamp=$(date +%s000),message="Request processed"

# Logs live dekho — jaise "tail -f" but AWS pe, real-time
aws logs tail /app/api --follow

# Sirf ERROR wale logs filter karo — bina saara data manually scan kiye
aws logs filter-log-events \
  --log-group-name /app/api \
  --filter-pattern "ERROR"
```

`aws logs tail --follow` command bahut kaam ki hai — deployment ke baad turant yeh chala do aur dekho live logs aa rahe hain ya nahi, exactly jaise tum local machine pe `tail -f app.log` karte ho.

> [!warning]
> Log groups ke liye **retention period** set karna mat bhoolo (default hamesha-hamesha rakhta hai — "Never Expire"). Warna storage cost silently badhta rahega. Production setup mein 30-90 din ka retention common hai.

## Alarms

### Kya hota hai?

Alarm ek metric pe **threshold-based trigger** hai. Jaise smoke detector — jab tak smoke level normal hai, chup hai, lekin jaise hi threshold cross hota hai, siren baj jata hai. CloudWatch Alarm bhi waise hi kaam karta hai: tum ek metric define karte ho (jaise CPU usage), ek threshold set karte ho (jaise 80%), aur jab wo cross ho jaaye, toh ek action fire hota hai — jaise SNS notification bhejna, auto-scaling trigger karna, ya Lambda function chalana.

### Kyun zaruri hai?

Socho CRED ka payment system hai — agar server ka CPU 95% pe pahunch jaaye aur koi alert na aaye, toh tumhe pata tabhi chalega jab customers complain karna shuru karenge. Alarms proactive monitoring dete hain — problem hone se pehle hi tumhe pata chal jaata hai.

```bash
# High CPU pe alarm banao
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:my-topic

# Saare alarms list karo
aws cloudwatch describe-alarms

# Alarm ko disable karo (jaise maintenance window ke time)
aws cloudwatch disable-alarm-actions --alarm-names high-cpu
```

Yahan `--evaluation-periods 2` important hai — matlab CloudWatch ek baar 80% cross hote hi alarm nahi bajayega, balki 2 consecutive periods (yaani 2 × 300 seconds = 10 minute) tak threshold cross rehna chahiye tabhi alarm trigger hoga. Yeh **false positives** rokta hai — jaise ek temporary CPU spike (deploy ke waqt) ke liye tumhe 3 AM ko phone pe call na aaye.

> [!tip]
> `--alarm-actions` mein tum SNS topic de sakte ho jo aage Slack, email, ya PagerDuty tak notification forward kar sakta hai. Isko auto-scaling policy se bhi jod sakte ho taaki CPU high hone pe automatically naye instances spin ho jaayein — bina kisi insaan ko jagaye.

## Dashboards

### Kya hota hai?

Dashboard ek **visual control panel** hai jahan tum multiple metrics ko ek hi screen pe dekh sakte ho — graphs, numbers, charts ki form mein. Jaise Ola ke ops team ka ek bada screen control room mein laga ho jisme "active rides", "driver availability", "surge pricing zones" sab ek saath dikh rahe hon.

### Kyun zaruri hai?

CLI se ya API se metric query karna debugging ke time theek hai, lekin roz-roz manually check karna practical nahi. Dashboard ek baar bana lo, aur phir sirf ek glance mein pura system health samajh aa jaaye.

```bash
# Dashboard banao — dashboard.json file mein widgets define karke
aws cloudwatch put-dashboard \
  --dashboard-name MyDashboard \
  --dashboard-body file://dashboard.json
```

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", {"stat": "Average"}],
          ["AWS/RDS", "DatabaseConnections", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "System Metrics"
      }
    }
  ]
}
```

Is JSON mein har `widget` ek graph/chart hai jo dashboard pe show hoga. Tum multiple widgets add karke ek complete "mission control" bana sakte ho — jisme EC2 CPU, RDS connections, API latency, error rates — sab ek jagah dikhein.

> [!info]
> Dashboard JSON ko version control (git) mein rakhna best practice hai — "dashboard as code". Isse tum dashboard ko reproduce kar sakte ho kisi bhi naye environment mein bina manually widgets drag-drop kiye.

## Real-world flow — sab kaise saath mein kaam karta hai

1. Tumhara app **metrics** emit karta hai (CPU, memory, custom business metrics jaise `OrderCount`)
2. Tumhara app **logs** bhi likhta hai (`console.log`, error traces) jo CloudWatch Logs mein collect hote hain
3. Ek **alarm** metric ko continuously watch karta hai — jaise "agar error rate > 5% ho jaaye"
4. Alarm trigger hone pe SNS ke through **notification** jaata hai (Slack, email, PagerDuty)
5. On-call engineer **dashboard** khol ke poora picture dekhta hai — konsa metric spike hua, konse logs mein error hai
6. Root cause milte hi fix deploy hota hai, aur alarm wapas normal ho jaata hai

Yeh poora loop — Zomato, Swiggy, ya kisi bhi bade production system ka bread-and-butter hai. Bina iske, production mein kuch bhi "silently" fail ho sakta hai aur pata chalega sirf tab jab customer Twitter pe complain kare.

## Key Takeaways

- **Metrics** quantitative data track karte hain (time ke saath numbers ka trend) — AWS built-in metrics deta hai, aur tum apne custom metrics bhi push kar sakte ho
- **Logs** events aur errors capture karte hain — sab servers ke logs ek centralized jagah pe collect hote hain, easy search/filter/tail ke saath
- **Alarms** metric thresholds pe trigger hote hain — proactive alerting deta hai taaki problem customer tak pahunchne se pehle hi pata chal jaaye
- **Dashboards** key metrics ko ek hi jagah visualize karte hain — poora system health ek glance mein
- **Integration** SNS, Lambda, SQS ke saath hoti hai — matlab alarm sirf notify hi nahi karta, actions bhi automate kar sakta hai (auto-scaling, auto-remediation)
- **Low cost** hai typical usage ke liye, lekin custom metrics aur log retention pe nazar rakho warna bill surprise de sakta hai

Next: [Prometheus & Grafana](./04_prometheus_and_grafana.md)

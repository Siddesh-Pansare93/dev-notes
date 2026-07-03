# Load Balancers in AWS

> Traffic ko multiple instances ke beech distribute karna — Application Load Balancer (ALB) aur Network Load Balancer (NLB) use karke.

Socho tumhara Zomato jaisa app launch hua hai aur suddenly Friday raat 8 baje 50,000 log ek saath order kar rahe hain. Agar saara traffic ek hi EC2 instance pe jaa raha hai, toh woh instance ekdum se overload ho jayega aur crash kar jayega — poora app down. Load balancer yahi problem solve karta hai. Yeh ek "traffic police" ki tarah kaam karta hai jo incoming requests ko dekh kar decide karta hai ki kaunsa server (instance) abhi free hai aur usko request forward kar deta hai. Isse na sirf load evenly distribute hota hai, balki agar koi ek instance down ho jaye toh load balancer automatically traffic ko baaki healthy instances pe bhej deta hai — user ko pata bhi nahi chalta.

## Table of Contents
1. [Load Balancer Types](#load-balancer-types)
2. [Application Load Balancer (ALB)](#application-load-balancer-alb)
3. [Network Load Balancer (NLB)](#network-load-balancer-nlb)
4. [Target Groups](#target-groups)
5. [Health Checks](#health-checks)
6. [SSL/TLS Certificates](#ssltls-certificates)
7. [Routing Rules](#routing-rules)

---

## Load Balancer Types

### Kya hota hai? ALB vs NLB vs Classic

AWS teen tarah ke load balancers deta hai, aur har ek ka apna use-case hai. Yeh samajhna zaruri hai kyunki galat load balancer choose karne se performance issues ya unnecessary cost aa sakta hai.

- **ALB (Application Load Balancer)** — Layer 7 (application layer) pe kaam karta hai, matlab yeh HTTP/HTTPS requests ke andar jhaank sakta hai — URL path dekh sakta hai, headers dekh sakta hai, hostname dekh sakta hai. Isliye smart routing decisions le sakta hai. Zomato ke example mein socho — `/restaurant/*` wale requests ek service pe jaayein aur `/orders/*` wale doosri service pe, ALB yeh easily kar sakta hai.
- **NLB (Network Load Balancer)** — Layer 4 (transport layer) pe kaam karta hai, matlab yeh sirf IP aur port dekh kar routing karta hai, request ke andar content nahi dekhta. Iska fayda yeh hai ki yeh bahut hi fast aur low-latency hai — millions of requests per second handle kar sakta hai. Gaming servers, IoT devices, ya real-time trading systems jaise use-cases ke liye best hai jaha microsecond-level latency matter karti hai.
- **Classic Load Balancer (CLB)** — Yeh purana, legacy load balancer hai jo dono layers (7 aur 4) thoda-thoda handle karta hai lekin naya features nahi milte. Aaj ke time mein AWS naye projects ke liye ALB/NLB hi recommend karta hai. Agar tumhe kahin CLB dikhe purane projects mein, samajh lena legacy hai.

| Feature | ALB | NLB | Classic |
|---------|-----|-----|---------|
| **Performance** | Good | Ultra-high | Standard |
| **Throughput** | ~400k req/s | ~45M packets/s | Lower |
| **Use Case** | Web apps, microservices | Gaming, IoT, extreme throughput | Legacy |
| **Layer** | Layer 7 (App) | Layer 4 (Transport) | Both |
| **Path-based routing** | ✓ | ✗ | ✗ |
| **Host-based routing** | ✓ | ✗ | ✗ |

> [!tip]
> Jab tak tumhe extreme low-latency ya raw TCP/UDP handling ki zarurat na ho (jaise gaming ya IoT), tab tak Node.js/web apps ke liye **ALB** hi default choice honi chahiye. Yeh smart routing, path-based rules, aur HTTPS termination sab kuch built-in deta hai.

---

## Application Load Balancer (ALB)

Web applications aur microservices ke liye perfect fit hai. Socho ek IRCTC jaisa system hai jisme alag-alag microservices hain — booking service, payment service, PNR status service. ALB in sabko ek single entry point ke through expose kar sakta hai aur URL path ke basis pe sahi service ko route kar sakta hai.

### ALB Kaise Banate Hain?

Pehla step hai load balancer ka "shell" bana lena — subnets, security groups, aur scheme (internet-facing ya internal) define karke.

```bash
# Create load balancer
aws elbv2 create-load-balancer \
  --name my-alb \
  --subnets subnet-1a subnet-1b \
  --security-groups sg-web \
  --type application \
  --scheme internet-facing

# Output: LoadBalancerArn, DNSName
# DNS: my-alb-123456.us-east-1.elb.amazonaws.com
```

Yaha `--scheme internet-facing` ka matlab hai ki yeh load balancer public internet se accessible hoga (jaise tumhara Zomato ka public website). Agar tumhe sirf internal microservices ke beech communication chahiye (jaise ek backend service dusre backend service ko call kare), toh `internal` scheme use karoge — yeh sirf VPC ke andar accessible hoga, public internet se nahi.

Yaad rakhna — ALB ko kam se kam **do different Availability Zones** mein subnets chahiye hoti hain. Yeh AWS ki requirement hai taaki agar ek poora datacenter (AZ) down ho jaye, toh bhi tumhara load balancer doosri AZ se traffic serve kar sake. Yeh high-availability ka basic principle hai.

### Target Group Banao

ALB khud traffic ko directly instances pe nahi bhejta — usko pehle pata hona chahiye ki "kaun se instances valid targets hain". Isi ke liye **Target Group** banate hain. Target group ek list hai un servers ki jaha traffic forward hona chahiye, saath mein health check configuration bhi.

```bash
# Create target group for EC2 instances
aws elbv2 create-target-group \
  --name my-targets \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-12345678 \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

### Targets Register Karo

Ab jo bhi EC2 instances actual traffic serve karenge, unko is target group mein register karna padta hai — jaise restaurant partners ko Zomato ke platform pe onboard karna.

```bash
# Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123 \
  --targets Id=i-instance1 Id=i-instance2 Id=i-instance3
```

### Listener Banao

Listener yeh define karta hai ki load balancer kis port pe incoming requests suno, aur unhe kaha forward karo. Bina listener ke, ALB ko pata hi nahi chalega ki traffic aane pe kya karna hai.

```bash
# Create listener (port 80 → target group)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/my-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123
```

Socho isko aise — ALB ek reception desk hai (jaise kisi mall ke entrance pe), listener yeh decide karta hai ki "port 80 pe koi aaye toh usse floor 3 (target group) pe bhej do".

### CloudFormation Template

Agar tum manual `aws` CLI commands baar-baar nahi chalana chahte (jo error-prone hai aur infra-as-code ka principle bhi violate karta hai), toh CloudFormation use karke poora setup ek YAML file mein define kar sakte ho. Yeh especially useful hai jab tumhe same setup multiple environments (dev, staging, prod) mein replicate karna ho.

```yaml
ALB:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: my-alb
    Subnets:
      - subnet-1a
      - subnet-1b
    SecurityGroups:
      - sg-web

TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: my-targets
    Port: 80
    Protocol: HTTP
    VpcId: vpc-12345678
    HealthCheckPath: /health
    HealthCheckProtocol: HTTP
    HealthCheckIntervalSeconds: 30
    HealthCheckTimeoutSeconds: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3

Listener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    DefaultActions:
      - Type: forward
        TargetGroupArn: !Ref TargetGroup
    LoadBalancerArn: !Ref ALB
    Port: 80
    Protocol: HTTP
```

---

## Network Load Balancer (NLB)

Jab tumhe extreme performance aur ultra-low latency chahiye ho — jaise koi trading platform ya multiplayer gaming server jaha har millisecond count hota hai — waha NLB use karte hain.

### Kyun zaruri hai NLB?

ALB request ke content ko parse karta hai (HTTP headers, path, etc.), jisme thoda overhead lagta hai. NLB yeh nahi karta — yeh sirf packets ko forward karta hai bina unke andar dekhe. Isliye NLB millions of requests per second handle kar sakta hai with very low latency. Socho yeh ek express highway hai jaha koi toll booth check nahi hai — bas gaadi seedha aage nikal jaati hai.

### NLB Banao

```bash
# Create NLB (layer 4)
aws elbv2 create-load-balancer \
  --name my-nlb \
  --subnets subnet-1a subnet-1b \
  --type network \
  --scheme internet-facing
```

### UDP/TCP Support

Yeh NLB ki ek badi khaasiyat hai — yeh sirf HTTP/HTTPS tak limited nahi hai. Raw TCP aur UDP traffic bhi handle kar sakta hai, jo ALB nahi kar sakta. Isliye gaming servers (jo UDP use karte hain low-latency ke liye) ya custom TCP-based protocols ke liye NLB hi option hai.

```bash
# Target group for TCP
aws elbv2 create-target-group \
  --name tcp-targets \
  --protocol TCP \
  --port 3000 \
  --vpc-id vpc-12345678

# Target group for UDP (gaming, real-time)
aws elbv2 create-target-group \
  --name udp-targets \
  --protocol UDP \
  --port 5353 \
  --vpc-id vpc-12345678

# TLS/SSL termination
aws elbv2 create-target-group \
  --name tls-targets \
  --protocol TLS \
  --port 443 \
  --vpc-id vpc-12345678
```

> [!info]
> NLB apne aap **static IP address** deta hai har Availability Zone ke liye (ya Elastic IP bhi attach kar sakte ho). Yeh useful hai jab client-side firewall rules mein specific IPs whitelist karni ho — ALB mein aisa nahi hota kyunki uska IP change ho sakta hai.

---

## Target Groups

### Kya kaam karta hai Target Group?

Target group basically ek "pool of servers" hai jaha load balancer traffic bhejta hai. Iske andar EC2 instances, IP addresses, ya even Lambda functions register ho sakte hain. Iske saath health check configuration bhi attach hota hai jisse pata chalta hai ki kaunsa target abhi healthy hai aur traffic accept karne ke layak hai.

### Auto Scaling ke saath ALB

Real-world mein manually instances register/deregister karna practical nahi hai — traffic Friday raat ko badh sakta hai aur Monday morning ko kam ho sakta hai. Isliye Auto Scaling Group (ASG) ko directly target group se jodte hain, taaki jab bhi ASG naya instance launch kare, woh automatically target group mein register ho jaye — bina kisi manual intervention ke.

```bash
# Register Auto Scaling Group with target group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --launch-template LaunchTemplateName=my-template \
  --min-size 1 --max-size 10 --desired-capacity 3 \
  --vpc-zone-identifier "subnet-1a,subnet-1b" \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123
```

### Deregistration Delay — Graceful Shutdown

Yeh ek bahut important cheez hai jo beginners aksar miss kar dete hain. Socho ek user Swiggy pe order place kar raha hai, aur exactly usi time ASG ne decide kiya ki traffic kam hai toh ek instance ko terminate kar do. Agar load balancer turant us instance se traffic bhejna band kar de aur instance bhi turant mar jaye, toh us user ka in-flight request fail ho jayega — bura user experience.

**Deregistration delay** isko solve karta hai — jab koi instance deregister hone wala ho, load balancer usse naye requests bhejna band kar deta hai lekin jo requests already chal rahe hain unhe complete hone ke liye kuch time (default 300 seconds, yaha 30 seconds set kiya hai) deta hai, phir instance ko terminate karta hai.

```bash
# Graceful shutdown: 30 seconds to finish requests
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123 \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30
```

> [!warning]
> Agar tumhara deregistration delay bahut kam rakha (jaise 0-5 seconds) aur tumhare requests complete hone mein zyada time lagta hai (jaise file upload ya long-running API call), toh users ko random 502/504 errors dikhenge jab scale-in hoga. Apne average request duration ke hisaab se yeh value tune karo.

---

## Health Checks

### Kyun zaruri hai Health Check?

Load balancer ko kaise pata chalega ki koi instance zinda hai ya crash ho gaya hai? Iska jawab hai **health checks**. Load balancer periodically (jaise har 30 seconds mein) har target ko ek request bhejta hai (usually ek specific endpoint jaise `/health`) aur uske response ke basis pe decide karta hai ki target healthy hai ya unhealthy. Agar koi target consecutively fail ho jaye (unhealthy threshold cross ho jaye), toh load balancer usko traffic bhejna band kar deta hai — isse users ko kabhi bhi ek "dead" server pe route nahi kiya jaata.

Socho yeh Swiggy delivery partner ki app ki tarah hai jo periodically ping bhejti hai "main online hoon" — agar ping band ho jaaye, system samajh jaata hai partner offline ho gaya aur usko naya order assign nahi karta.

### HTTP Health Check Configure Karna

```bash
# Configure health check
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123 \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200
```

Yaha key parameters samajh lo:
- **interval-seconds** — kitni der mein health check request bheji jaaye (yaha har 30 second mein)
- **timeout-seconds** — kitni der wait karein response ke liye, uske baad fail maan liya jayega
- **healthy-threshold-count** — kitni consecutive successful checks ke baad target ko "healthy" mana jaaye
- **unhealthy-threshold-count** — kitni consecutive failed checks ke baad target ko "unhealthy" mana jaaye aur traffic bhejna band kar diya jaaye
- **matcher** — kaunsa HTTP status code "success" mana jaaye (yaha sirf 200)

### Custom Health Check Endpoint

Sirf `200 OK` bhejna kaafi nahi hota — ek achha health check endpoint yeh bhi check karta hai ki application ki dependencies (database, cache) sahi se kaam kar rahi hain ya nahi. Node.js developer hone ke naate tumhe yeh pattern familiar lagega:

```javascript
// Node.js health check endpoint
app.get('/health', (req, res) => {
  // Check dependencies
  const health = {
    status: 'UP',
    timestamp: new Date(),
    checks: {
      database: checkDatabase(),
      cache: checkCache(),
      disk: checkDiskSpace()
    }
  };

  const statusCode = health.checks.database && health.checks.cache ? 200 : 503;
  res.status(statusCode).json(health);
});
```

Isse fayda yeh hai ki agar tumhara instance zinda hai lekin uska database connection mar chuka hai (jo actually requests serve nahi kar payega), toh yeh endpoint `503` return karega aur load balancer us instance ko traffic bhejna band kar dega — even though the server process itself is running fine.

### Health Check Troubleshooting

Production mein sabse common issue jo aati hai woh hai targets ka baar-baar "unhealthy" dikhna. Debug karne ke liye yeh steps follow karo:

```bash
# View target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123

# Check logs
aws logs tail /aws/alb/my-alb --follow

# Common issues:
# - Security group blocks health check port
# - Application doesn't respond on health endpoint
# - High response time exceeds timeout
```

> [!warning]
> Sabse common mistake jo naye developers karte hain — EC2 instance ki **security group** mein sirf apna application port (jaise 3000) open karte hain, lekin load balancer ke health check requests ko allow nahi karte. Yaad rakhna, security group mein load balancer ke source (ya load balancer ki security group) se traffic allow hona chahiye, warna health check hamesha fail hoga aur ALB kabhi bhi target ko healthy nahi maanega — traffic hi nahi jayega!

---

## SSL/TLS Certificates

### Kyun zaruri hai HTTPS?

Aaj ke time mein koi bhi production app bina HTTPS ke chalana galat practice hai — chahe woh UPI payment app ho ya simple blog. Browsers bhi ab HTTP sites ko "Not Secure" dikhate hain. AWS **ACM (AWS Certificate Manager)** ka use karke free SSL certificates issue kar sakte ho, aur load balancer ke saath directly attach kar sakte ho — bina kisi manual certificate renewal ke jhanjhat ke (ACM khud renew karta rehta hai).

### ACM Certificate Request Karo

```bash
# Request free AWS certificate
aws acm request-certificate \
  --domain-name myapp.com \
  --subject-alternative-names "*.myapp.com" \
  --validation-method DNS
```

Yaha `*.myapp.com` ek wildcard certificate hai — matlab yeh `api.myapp.com`, `www.myapp.com`, `admin.myapp.com` sab subdomains ke liye kaam karega, alag-alag certificate lene ki zarurat nahi.

### HTTPS Listener Banao

Certificate aane ke baad, usko ek naye HTTPS listener (port 443) ke saath attach karte hain. Yeh listener incoming encrypted traffic ko decrypt karega (SSL termination) aur phir plain HTTP traffic ko target group tak forward karega.

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/my-alb/abc123 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/abc123 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/my-targets/abc123
```

Yeh setup ek badi cheez simplify karta hai — tumhare backend EC2 instances ko khud SSL certificates handle nahi karne padte, ALB hi yeh kaam kar leta hai (**SSL termination**). Instances sirf plain HTTP samajhte hain, jo development aur maintenance dono easy banata hai.

### HTTP to HTTPS Redirect

Agar koi user galti se `http://myapp.com` type kar de (bina `s` ke), toh usko forcefully HTTPS pe redirect kar dena chahiye. Isse security bhi improve hoti hai aur SEO ke liye bhi accha hai.

```bash
# Create HTTP listener that redirects to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/my-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

`HTTP_301` matlab "permanent redirect" — browser aur search engines ko yeh signal jaata hai ki yeh URL permanently naye location (HTTPS) pe shift ho gaya hai.

---

## Routing Rules

### Kya hota hai Smart Routing?

Yeh ALB ka sabse powerful feature hai — same load balancer ke through multiple different services ko route kar sakte ho, based on **hostname** ya **URL path**. Ek IRCTC jaisa monolith system tod kar microservices banate waqt, ek hi domain (`irctc.co.in`) ke peeche multiple services chalane ke liye yeh bahut kaam aata hai.

### Host-Based Routing

Socho tumhare paas `api.myapp.com` aur `www.myapp.com` — dono alag services hain (ek backend API, ek frontend website), lekin dono ek hi ALB ke peeche baithe hain. Host-header ke basis pe ALB decide karta hai ki request kaha bhejni hai.

```bash
# Route api.myapp.com → api target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=host-header,Values=api.myapp.com \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/api-targets/abc123 \
  --priority 1

# Route www.myapp.com → web target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=host-header,Values=www.myapp.com \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/web-targets/abc123 \
  --priority 2
```

### Path-Based Routing

Isi tarah, ek hi domain ke andar bhi URL path ke basis pe alag-alag services pe route kar sakte ho. Jaise `/api/*` wale requests backend service pe jaayein, aur `/static/*` wale requests ek caching layer (jaise CloudFront ya static file server) pe jaayein.

```bash
# Route /api/* → api target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=path-pattern,Values=/api/* \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/api-targets/abc123 \
  --priority 1

# Route /static/* → cache target group
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:listener/app/my-alb/abc123/abc123 \
  --conditions Field=path-pattern,Values=/static/* \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/cache-targets/abc123 \
  --priority 2
```

> [!info]
> **Priority** number jitna chhota hoga, uska evaluation utna pehle hoga. ALB rules ko priority order mein check karta hai aur jo pehla match milta hai wahi apply hota hai — baaki rules ignore ho jaate hain. Isliye rules design karte waqt priority order carefully sochna zaruri hai.

### CloudFormation mein Complex Routing

Multiple conditions (host + path dono ek saath) bhi combine kar sakte ho ek hi rule mein — jaise sirf `api.myapp.com` domain pe hi `/api/*` path ko match karna ho:

```yaml
ListenerRule:
  Type: AWS::ElasticLoadBalancingV2::ListenerRule
  Properties:
    ListenerArn: !Ref Listener
    Actions:
      - Type: forward
        TargetGroupArn: !Ref APITargetGroup
    Conditions:
      - Field: path-pattern
        Values: ['/api/*']
      - Field: host-header
        Values: ['api.myapp.com']
    Priority: 1
```

---

## Practical Example: Complete ALB Setup

Chalo ab sab kuch ek saath jodte hain — ek real-world script jaisa dikhega jo production mein CI/CD pipeline ke andar chal sakta hai. Yeh script ALB banata hai, target group banata hai, listener attach karta hai, aur instances register karta hai — sab kuch automated tareeke se, taaki tumhe baar-baar manual AWS console mein click-click na karna pade.

```bash
#!/bin/bash
# setup-alb.sh

set -e

# Variables
ALB_NAME=my-alb
TG_NAME=my-targets
VPC_ID=vpc-12345678
SUBNETS="subnet-1a subnet-1b"
SG_ID=sg-web

# 1. Create ALB
ALB=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNETS \
  --security-groups $SG_ID \
  --scheme internet-facing \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "Created ALB: $ALB"

# 2. Create target group
TG=$(aws elbv2 create-target-group \
  --name $TG_NAME \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Created target group: $TG"

# 3. Create HTTP listener
LISTENER=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "Created listener: $LISTENER"

# 4. Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn $TG \
  --targets Id=i-instance1 Id=i-instance2

# 5. Get ALB DNS name
DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "✓ ALB setup complete!"
echo "Access at: http://$DNS"
```

`set -e` line pe dhyan do — yeh bash ko bolta hai ki agar koi bhi command fail ho, toh poora script turant ruk jaaye, aage ke commands na chalein. Yeh production scripts mein bahut important habit hai, warna ek command fail hone ke baad bhi script chalti rahegi aur partially broken infrastructure bana degi.

## Key Takeaways

- **ALB (Layer 7)** — web apps aur microservices ke liye best, path-based aur host-based routing support karta hai, HTTP/HTTPS traffic ke andar dekh kar smart decisions leta hai.
- **NLB (Layer 4)** — extreme throughput aur ultra-low latency ke liye, TCP/UDP support karta hai, gaming/IoT/real-time systems ke liye best fit.
- **Target Groups** define karte hain ki traffic kaha jaayega — EC2 instances, IPs, ya Lambda functions ka pool, saath mein health check config.
- **Health Checks** ensure karte hain ki sirf healthy targets ko hi traffic mile — application-level checks (DB, cache) lagana zaruri hai, sirf process alive hona kaafi nahi.
- **Security groups** mein health check port allow karna mat bhoolna — yeh sabse common gotcha hai jisse targets hamesha unhealthy dikhte hain.
- **HTTPS/SSL** ACM certificates se free mein mil jaata hai, ALB pe SSL termination karke backend instances ko simple rakh sakte ho.
- **Deregistration delay** graceful shutdown ke liye zaruri hai — bina isके, scale-in ke time in-flight requests fail ho sakti hain.
- **Routing rules (host/path-based)** ek hi ALB se multiple services expose karne dete hain — priority order carefully design karna zaruri hai.

Next: [Auto Scaling](./05_auto_scaling.md) - automatically scale infrastructure

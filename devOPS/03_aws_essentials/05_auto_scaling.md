# AWS Auto Scaling

## Kya Seekhoge Is File Mein

- Auto Scaling kya hota hai aur yeh itna zaruri kyun hai
- Auto Scaling Groups (ASG) ka fundamentals
- Launch Templates kaise banate hain
- Scaling policies (target tracking, step, scheduled) — kaunsi kab use karni hai
- Load Balancer ke saath integration kaise hota hai
- Cost optimization aur high availability ke best practices

---

## Auto Scaling Hai Kya?

Socho tumne Diwali sale ke liye ek e-commerce app launch kiya hai. Normal din pe 100 users aate hain, lekin sale wale din achanak 50,000 users aa jaate hain. Ab agar tumne fixed 2 servers laga rakhe hain, toh sale wale din site crash ho jayegi — bilkul waise hi jaise Flipkart ya Myntra ka Big Billion Day sale ke time server down ho jaata hai agar capacity planning sahi na ho.

Dusri taraf, agar tumne "safe side" lene ke liye 50 servers pehle se hi chalu rakhe hain taaki spike handle ho jaaye, toh normal din pe 48 servers khaali baithe rahenge — aur AWS tumse paisa har second charge karta hai, chahe server use ho ya na ho. Yeh seedha paisa jalana hai.

**Auto Scaling** iska solution hai — yeh automatically EC2 instances ki count ko demand ke hisaab se badhata-ghatata hai. Jab traffic zyada aaye, naye servers khud spin ho jaate hain. Jab traffic kam ho jaaye, extra servers khud band ho jaate hain. Bilkul Ola/Uber jaisa socho — surge time pe zyada drivers online aa jaate hain (demand ke hisaab se), normal time pe utne hi rehte hain jitni zarurat hai.

### Fayde (Benefits)

✅ **Cost Optimization** - Kam traffic mein instances kam ho jaate hain, bill kam aata hai
✅ **High Availability** - Koi instance unhealthy ho jaaye toh Auto Scaling khud usse replace kar deta hai
✅ **Better Performance** - Traffic spike aaye toh naye instances turant add ho jaate hain
✅ **No Manual Intervention** - Tumhe raat 3 baje uthke manually server add nahi karna padta — metrics ke basis pe sab automatic hota hai

> [!tip]
> Auto Scaling ka sabse bada fayda yeh hai ki tum "engineer on-call" hoke bhi chain se so sakte ho — system khud decide karta hai kab scale up/down karna hai.

---

## Core Components

Auto Scaling ko samajhne ke liye 4 building blocks yaad rakho:

### 1. **Launch Template**
Yeh ek blueprint hai — jaise ek recipe card jisme likha hota hai naya instance kaise banega: kaunsa AMI (OS image) use hoga, kaunsa instance type, kaunse security groups, aur startup pe kya script chalegi (user data). Jab bhi Auto Scaling naya server banata hai, isi template ko follow karta hai.

### 2. **Auto Scaling Group (ASG)**
Yeh EC2 instances ka ek logical group hai jo ek unit ki tarah manage hota hai. Isme tum batate ho minimum kitne instances chahiye, maximum kitne allow hain, aur normally kitne chahiye (desired capacity). ASG hi decide karta hai kab naya instance add karna hai ya purana hatana hai.

### 3. **Scaling Policies**
Yeh rules hain jo batate hain kab aur kitna scale karna hai — chahe metrics ke basis pe (jaise CPU 70% cross kar gaya) ya scheduled time ke basis pe (jaise raat 2 baje traffic kam ho jaata hai toh scale down kar do).

### 4. **Health Checks**
Yeh instances ki tabiyat check karte rehte hain — EC2 level pe (machine chal rahi hai ya nahi) ya ELB level pe (application actually response de rahi hai ya nahi). Agar koi instance beemar (unhealthy) nikle, ASG usse replace kar deta hai.

---

## Launch Templates

### Kyun Zaruri Hai?

Jab ASG ko naya instance launch karna ho, usse pata hona chahiye ki exactly kaisa instance banana hai — kaunsa OS, kaunsa hardware, kaunsi security setting. Launch Template yeh sab define karta hai, taaki naya instance hamesha consistent tarike se ban sake — manually console mein click-click karke instance banane ka jhanjhat khatam.

### Create Launch Template (AWS CLI)

```bash
aws ec2 create-launch-template \
  --launch-template-name my-app-template \
  --version-description "Version 1" \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.micro",
    "KeyName": "my-key-pair",
    "SecurityGroupIds": ["sg-0123456789abcdef"],
    "UserData": "IyEvYmluL2Jhc2gKZWNobyAiSGVsbG8gV29ybGQi",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "MyApp"}]
    }]
  }'
```

### User Data Script (Base64 Encoded)

User data ek script hai jo instance boot hote hi automatically chal jaati hai — matlab tumhe manually SSH karke app deploy nahi karni padti. Naya instance khud apna environment setup kar leta hai aur app start kar deta hai.

```bash
#!/bin/bash
# Install Node.js and start app
yum update -y
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

cd /home/ec2-user
git clone https://github.com/myuser/myapp.git
cd myapp
npm install
npm start
```

**Encode to Base64**:
```bash
cat user-data.sh | base64
```

> [!info]
> AWS ko user data hamesha Base64 encoded format mein chahiye hota hai. Yeh koi security cheez nahi hai (encryption nahi hai), sirf ek standard encoding hai taaki binary-safe transmission ho sake.

---

## Auto Scaling Groups (ASG)

### Kya Hota Hai?

ASG basically wo "manager" hai jo decide karta hai kitne instances chahiye, kaunse Availability Zones mein honge, aur kaunsa Launch Template use hoga. Isko IRCTC ki booking counters jaisa socho — normal din pe 3 counters khule rehte hain, lekin Tatkal booking ke time automatically extra counters khul jaate hain taaki load handle ho sake. ASG hi wo system hai jo yeh counters (instances) open/close karta hai.

### Create Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --launch-template LaunchTemplateName=my-app-template,Version='$Latest' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --availability-zones us-east-1a us-east-1b us-east-1c \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-targets/abc123 \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags Key=Environment,Value=Production
```

### Key Parameters

| Parameter | Kya Karta Hai |
|-----------|-------------|
| `min-size` | Minimum instances jo hamesha chalte rahenge (e.g., 2) — chahe traffic zero ho, itne toh honge hi |
| `max-size` | Maximum instances jitne bhi bhare bhare traffic mein spin ho sakte hain (e.g., 10) — cost control ke liye cap |
| `desired-capacity` | Normal conditions mein kitne instances chahiye (e.g., 3) |
| `health-check-grace-period` | Naye instance ko itna time diya jaata hai app start hone ke liye, iske pehle health check fail nahi maana jaata (seconds) |
| `health-check-type` | EC2 (sirf machine check) ya ELB (application-level check) |

> [!warning]
> `min-size` ko kabhi 0 mat rakho production mein agar high availability chahiye — warna traffic drop hote hi sab instances band ho jaayenge, aur naya request aane pe cold start ka lag lagega (bilkul waise jaise Swiggy app khulne mein time leta hai jab bahut der se use nahi kiya ho).

---

## Scaling Policies

Ab asli maza yahan hai — ASG ko yeh kaise pata chalega ki kab scale karna hai? Iske liye teen tarike hain.

### 1. Target Tracking Scaling

**Sabse Common Aur Recommended**: Ismein tum bas ek target value bata dete ho (jaise "CPU usage 70% pe rakho"), aur AWS khud calculate karta hai kitne instances add/remove karne hain taaki wo target maintain rahe. Bilkul thermostat jaisa — tum temperature set karte ho, AC khud on/off hota rehta hai.

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-app-asg \
  --policy-name target-tracking-cpu \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0
  }'
```

**Kaam Kaise Karta Hai**:
- Agar CPU > 70% ho jaaye → scale out (naye instances add honge)
- Agar CPU < 70% ho jaaye → scale in (instances kam honge)

#### Predefined Metrics
- `ASGAverageCPUUtilization` - Saare instances ka average CPU usage
- `ASGAverageNetworkIn` - Average network input traffic
- `ASGAverageNetworkOut` - Average network output traffic
- `ALBRequestCountPerTarget` - Har target pe kitne requests aa rahe hain (ALB ke saath)

#### Custom Metric Example

Kabhi kabhi CPU ya network se zyada important koi business metric hoti hai — jaise "active connections" ya "queue length". Uske liye custom metric use kar sakte ho:

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-app-asg \
  --policy-name target-tracking-custom \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "CustomizedMetricSpecification": {
      "MetricName": "ActiveConnections",
      "Namespace": "MyApp",
      "Statistic": "Average"
    },
    "TargetValue": 1000.0
  }'
```

### 2. Step Scaling

Target tracking ek simple "target maintain karo" wala approach hai. Lekin agar tumhe fine-grained control chahiye — jaise "CPU thoda badha toh thoda add karo, bohot badha toh bohot add karo" — toh Step Scaling use karte hain. Yeh CloudWatch alarms ke basis pe kaam karta hai.

```bash
# Create CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu-alarm \
  --alarm-description "Trigger when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:autoscaling:us-east-1:123456789012:scalingPolicy:abc123:autoScalingGroupName/my-app-asg:policyName/scale-up

# Create step scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-app-asg \
  --policy-name scale-up \
  --policy-type StepScaling \
  --adjustment-type PercentChangeInCapacity \
  --metric-aggregation-type Average \
  --step-adjustments '[
    {"MetricIntervalLowerBound": 0, "MetricIntervalUpperBound": 10, "ScalingAdjustment": 10},
    {"MetricIntervalLowerBound": 10, "ScalingAdjustment": 20}
  ]'
```

**Example samjho aise**:
- CPU 80-90% ke beech ho toh 10% zyada instances add karo
- CPU 90% se upar chala jaaye toh 20% zyada instances add karo (aggressive scaling, kyunki situation critical hai)

### 3. Scheduled Scaling

Yeh tab kaam aata hai jab tumhe traffic pattern pehle se pata ho — jaise office hours mein zyada load aata hai aur raat ko kam. Bilkul Zomato jaisa socho — lunch (12-2 PM) aur dinner (7-10 PM) ke time order zyada aate hain, baaki time kam. Agar yeh pattern predictable hai, toh CPU spike hone ka wait kyun karna — pehle se hi schedule kar do.

```bash
# Scale up on weekdays at 8 AM
aws autoscaling put-scheduled-action \
  --auto-scaling-group-name my-app-asg \
  --scheduled-action-name scale-up-morning \
  --recurrence "0 8 * * 1-5" \
  --min-size 5 \
  --max-size 20 \
  --desired-capacity 10

# Scale down on weekdays at 6 PM
aws autoscaling put-scheduled-action \
  --auto-scaling-group-name my-app-asg \
  --scheduled-action-name scale-down-evening \
  --recurrence "0 18 * * 1-5" \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3
```

> [!tip]
> Real production systems mein aksar Target Tracking aur Scheduled Scaling dono ek saath use karte hain — schedule se baseline set karo (predictable traffic ke liye), aur target tracking se unexpected spikes handle karo.

---

## Load Balancers Ke Saath Integration

### Kyun Zaruri Hai?

Auto Scaling se naye instances toh ban jaate hain, lekin traffic ko unhe pata kaise chalega ki naya instance available hai? Yahan Load Balancer (ALB) ka role aata hai — yeh traffic ko sabhi healthy instances mein evenly distribute karta hai, bilkul waise jaise restaurant mein ek captain customers ko alag-alag khaali tables pe bhej deta hai.

### Attach ASG to ALB Target Group

```bash
# Create target group
aws elbv2 create-target-group \
  --name my-app-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-12345678 \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Attach ASG to target group
aws autoscaling attach-load-balancer-target-groups \
  --auto-scaling-group-name my-app-asg \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-app-targets/abc123
```

### Yeh Kaam Kaise Karta Hai

1. ASG naya instance launch karta hai
2. Wo instance automatically target group mein register ho jaata hai
3. ALB uska health check karta hai (`/health` endpoint pe ping maarke)
4. Agar healthy nikla, ALB usse traffic bhejna shuru kar deta hai
5. Agar unhealthy nikla, ASG usse turant replace kar deta hai (bina user ko pata chale)

---

## Health Checks

### EC2 Health Check (Default)
Yeh sirf itna check karta hai ki instance (machine) chal rahi hai ya nahi — AWS hypervisor level pe. Lekin agar tumhari app crash ho gayi ho lekin machine chal rahi ho, yeh check pass ho jaayega — jo galat hai.

### ELB Health Check (Recommended)
Yeh actual application ko ping karta hai (jaise `/health` endpoint) aur check karta hai ki app sahi se response de rahi hai ya nahi. Yeh zyada reliable hai kyunki isse pata chalta hai app actually kaam kar rahi hai, sirf machine nahi.

```bash
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --health-check-type ELB \
  --health-check-grace-period 300
```

**Grace Period Kya Hai**: Jab naya instance launch hota hai, app start hone mein kuch time lagta hai (dependencies load, DB connections, etc). Grace period yeh time deta hai — is period ke andar health check fail ho toh bhi instance turant terminate nahi hoga.

> [!warning]
> Agar grace period bahut kam rakha, toh ASG naye instances ko "unhealthy" samajh ke baar-baar terminate karta rahega, jabki asal mein wo bas start ho rahe the. Isse ek infinite loop ban sakta hai — instance banega, terminate hoga, phir banega. Isliye app ke actual startup time ke hisaab se grace period set karo.

---

## Real-World Example: Node.js API Ke Saath Auto Scaling

### Architecture
```
Internet → ALB → ASG (2-10 instances) → RDS Database
```

Yeh ek typical production setup hai jo tum khud bhi replicate kar sakte ho — bilkul waise jaise ek chota startup apna backend deploy karta hai.

### Step-by-Step Setup

#### 1. Launch Template Banao

```bash
cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Clone and start app
cd /home/ec2-user
aws s3 cp s3://my-bucket/my-app.zip .
unzip my-app.zip
cd my-app
npm install --production
npm start
EOF

aws ec2 create-launch-template \
  --launch-template-name nodejs-api-template \
  --launch-template-data file://launch-template.json
```

#### 2. Auto Scaling Group Banao

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name nodejs-api-asg \
  --launch-template LaunchTemplateName=nodejs-api-template \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456,subnet-ghi789" \
  --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/nodejs-api-targets/abc123 \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags Key=Name,Value=NodeJS-API Key=Environment,Value=Production
```

#### 3. Target Tracking Policy Add Karo

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name nodejs-api-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0
  }'
```

Bas itna kaam karke tumhare paas ek fully auto-scaling Node.js API ready hai jo traffic ke hisaab se khud 2 se 10 instances tak scale ho sakega.

---

## Auto Scaling Ko Monitor Kaise Karein

### ASG Activity Dekho

Jab bhi scaling event hota hai (instance add/remove), uska log dekhna zaruri hai — debugging aur cost tracking dono ke liye.

```bash
# List scaling activities
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name my-app-asg \
  --max-records 10

# View current instances
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names my-app-asg \
  --query 'AutoScalingGroups[0].Instances[*].[InstanceId,HealthStatus,LifecycleState]' \
  --output table
```

### CloudWatch Metrics

Yeh key metrics hain jo regularly monitor karne chahiye:
- `GroupDesiredCapacity` - Kitne instances target hain
- `GroupInServiceInstances` - Kitne healthy instances abhi actually chal rahe hain
- `GroupMinSize` / `GroupMaxSize` - Configured limits
- `GroupTotalInstances` - Total instances (healthy + unhealthy dono milaake)

> [!tip]
> Agar `GroupTotalInstances` aur `GroupInServiceInstances` mein bada farak dikhe, toh samajh jao kuch instances unhealthy ho rahe hain baar-baar — yeh debug karne ka signal hai (shayad grace period kam hai, ya health check endpoint galat hai).

---

## Cost Optimization Tips

### 1. Spot Instances Use Karo

Spot Instances AWS ke "leftover" unused capacity hote hain jo bahut sasta milte hain (70-90% tak discount) — lekin AWS inhe kabhi bhi wapas le sakta hai agar usse capacity chahiye ho. Non-critical ya fault-tolerant workloads ke liye yeh bahut cost-effective hai — thoda risky OYO room jaisa socho, sasta hai lekin last-minute cancel ho sakta hai.

```bash
# Mix on-demand and spot instances
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name my-app-asg \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "my-app-template",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "t3.micro"},
        {"InstanceType": "t3.small"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 30,
      "SpotAllocationStrategy": "lowest-price"
    }
  }'
```

Yahan `OnDemandBaseCapacity: 2` ka matlab hai — kam se kam 2 instances hamesha reliable On-Demand honge (guaranteed), baaki extra capacity mein Spot instances mix ho jaayenge sasta rakhne ke liye.

### 2. Rightsizing

Apna actual CPU/Memory usage monitor karo aur instance type ko usi hisaab se adjust karo. Agar tum `t3.large` use kar rahe ho lekin CPU kabhi 20% se upar nahi jaata, toh tum overpay kar rahe ho — `t3.medium` ya `t3.small` mein switch karke paisa bacha sakte ho.

### 3. Scale-In Protection

Kabhi kabhi kuch instances "special" hote hain — jaise koi long-running batch job process kar raha ho, ya koi WebSocket connection maintain kar raha ho. Scale-In Protection use karke tum in critical instances ko accidental termination se bacha sakte ho jab ASG scale-in kare.

---

## Best Practices

✅ **ELB health checks use karo** application-level monitoring ke liye
✅ **Sahi grace period set karo** (app start hone ka time consider karke)
✅ **Multiple AZs span karo** high availability ke liye — ek Availability Zone down ho jaaye toh doosri chalti rahe
✅ **Target tracking use karo** (sabse easy aur reliable, most cases mein yehi kaafi hai)
✅ **CloudWatch metrics regularly monitor karo** policies tune karne ke liye
✅ **Scaling policies ko production mein daalne se pehle test karo** (load testing tools se)
✅ **Termination policies samajh ke use karo** (jaise oldest instance pehle hataana, ya billing hour ke closest wala)
✅ **Connection draining implement karo** (300 seconds) — taaki instance terminate hone se pehle existing requests complete ho jaayein, users ko error na mile

---

## Exercise

**Auto-Scaled Web Application Deploy Karo**:

1. Apni app ke saath ek Launch Template banao
2. Ek ALB aur target group create karo
3. Ek ASG banao (min 2, max 6, desired 3)
4. CPU-based target tracking add karo (70%)
5. `ab` ya `hey` tool se stress test karke scaling trigger karo
6. CloudWatch mein scaling activity monitor karo

Yeh exercise karke tumhe hands-on samajh aa jaayega ki real production mein Auto Scaling kaise behave karta hai — kitna time lagta hai naye instance ko spin hone mein, aur scale-in kitna smooth hota hai.

---

**Next**: [RDS & Databases](./06_rds_and_databases.md) → Managed relational databases

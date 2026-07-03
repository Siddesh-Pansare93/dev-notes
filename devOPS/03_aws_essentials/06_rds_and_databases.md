# RDS & Databases on AWS

> Amazon RDS (Relational Database Service) ke through relational databases manage karna seekhte hain.

## Kya hota hai RDS?

Socho tum apna khud ka database (Postgres, MySQL) ek EC2 machine pe khud install karke chala rahe ho. Ab sochो us database ko maintain karne mein kya-kya karna padega — OS patches lagana, database software update karna, daily backups lena, agar server crash ho jaye toh failover handle karna, disk full na ho iska dhyan rakhna, replication set karna scaling ke liye... itna sab kaam ek poore DBA (Database Administrator) ka hota hai.

RDS yeh sab kaam AWS ko de deta hai. Tum bas keh do "mujhe Postgres chahiye db.t3.micro size mein" aur AWS backend mein poora managed database spin up kar deta hai — automatic backups, patching, failover, monitoring sab built-in.

Isko aise socho — khud database chalana matlab khud ka dhaba khोलना hai jahan tumhe raw material lana hai, safai karni hai, staff manage karna hai. RDS use karna matlab Swiggy/Zomato cloud kitchen model hai — tumhe bas order dena hai (query bhejni hai), baaki ka operational headache (kitchen maintenance, hygiene, supply chain) provider sambhalta hai.

RDS multiple engines support karta hai: **PostgreSQL, MySQL, MariaDB, Oracle, SQL Server**, aur ek AWS ka apna flavour bhi hai jo **Aurora** kehlata hai (jo Postgres/MySQL compatible hai but performance mein turbocharged hai).

> [!info]
> RDS sirf **relational** (SQL) databases ke liye hai. Agar tumhe NoSQL chahiye (jaise MongoDB style ya key-value store), toh uske liye AWS ka alag service hai — **DynamoDB**. Dono ko confuse mat karna.

## RDS Instance Create Karna

Neeche wala command ek naya Postgres database instance bana raha hai:

```bash
aws rds create-db-instance \
  --db-instance-identifier myapp-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password MyPassword123! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-db \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --multi-az
```

Chaliye har flag ko samajhte hain — kyunki yeh interview mein bhi poochha jata hai:

- **`--db-instance-identifier`**: Tumhare database ka naam — jaise tum apne restaurant ko ek naam dete ho taaki dhoondhne mein aasani ho.
- **`--db-instance-class`**: Yeh EC2 ke instance type jaisa hi hai — `db.t3.micro` matlab chhota, cheap, burstable machine (dev/testing ke liye theek hai, production ke liye tumhe `db.m5.large` jaisa kuch chahiye hoga jahan CPU/RAM zyada guaranteed ho).
- **`--engine postgres`**: Kaunsa database engine chahiye — postgres, mysql, mariadb, oracle-ee, sqlserver-ex, etc.
- **`--master-username` / `--master-user-password`**: Root/admin credentials. **Kabhi bhi** production password ko plaintext command mein mat likho — AWS Secrets Manager ya SSM Parameter Store use karo.
- **`--allocated-storage 20`**: Kitna disk chahiye (GB mein) — jaise tum apna ghar book karte waqt bolte ho "2BHK chahiye, 900 sqft".
- **`--vpc-security-group-ids`**: Yeh firewall hai — decide karta hai ki kaun (kis IP/security group se) database tak pahunch sakta hai. Best practice: database ko kabhi bhi public internet ke liye khula mat rakho, sirf apni app servers (EC2/ECS) ko access do.
- **`--db-subnet-group-name`**: Kaunse subnets mein database rakha jaye — usually **private subnets** mein rakhte hain (public mein nahi), taaki koi bhi Tom, Dick, Harry directly internet se database tak na pahunch sake.
- **`--backup-retention-period 7`**: Kitne din tak automatic backups rakhne hain (7 din yahan).
- **`--multi-az`**: High availability ke liye ek standby copy alag Availability Zone mein bana do — isko detail mein neeche samjhenge.

> [!warning]
> Password kabhi bhi command line mein hardcode mat karo — yeh shell history mein save ho jata hai aur CloudTrail logs mein bhi dikh sakta hai. Instead `--manage-master-user-password` flag use karo (yeh AWS Secrets Manager mein automatically password store kar deta hai) ya environment variable se pass karo.

## Multi-AZ & Backups

### Kya hota hai Multi-AZ?

Yeh samjho: IRCTC ka main booking server Mumbai mein hai. Agar wahan power cut ho jaye ya data center down ho jaye, toh poora booking system thap ho jayega — lakhon log tickets book nahi kar payenge. Isiliye smart approach yeh hoti hai ki ek **exact synchronous copy** kisi doosre data center (jaise Pune) mein bhi rakho. Agar Mumbai wala down ho, toh turant Pune wale pe switch ho jaye, bina user ko pata chale.

Yahi cheez RDS Multi-AZ karta hai. Jab tum Multi-AZ enable karte ho:

1. AWS tumhare primary database ka ek **synchronous standby replica** ek **alag Availability Zone** (basically alag physical data center, same region ke andar) mein bana deta hai.
2. Har write jo primary pe hota hai, wahi synchronously standby pe bhi replicate hota hai — matlab dono hamesha sync mein rehte hain.
3. Agar primary fail ho jaye (hardware failure, AZ outage, patching ke waqt), toh AWS automatically standby ko naya primary bana deta hai — is process ko **failover** kehte hain. Yeh usually 60-120 seconds mein ho jata hai, **bina tumhare application code ko badle** — kyunki DNS endpoint wahi rehta hai, sirf backend mein switch ho jata hai.

```bash
# Enable Multi-AZ (automatic failover)
aws rds modify-db-instance \
  --db-instance-identifier myapp-db \
  --multi-az \
  --apply-immediately
```

`--apply-immediately` ka matlab hai ki change turant apply ho, warna AWS usko agle maintenance window tak taal deta (jisse production traffic disturb na ho).

> [!tip]
> Multi-AZ **high availability** ke liye hai, **scaling** ke liye nahi. Standby replica pe tum directly read queries nahi bhej sakte — woh sirf failover ke liye standby baitha hai. Read traffic scale karne ke liye tumhe **Read Replicas** chahiye (neeche dekho).

### Backups — Disaster Recovery ka Zaroori Hathiyar

RDS do tarah ke backups deta hai:

1. **Automated backups**: RDS khud roz backup leta hai aur transaction logs bhi continuously store karta hai. Isse tum **point-in-time recovery** kar sakte ho — matlab agar aaj subah 11:47 baje kisi ne galti se saara data delete kar diya, toh tum database ko 11:46 ki state mein restore kar sakte ho. `--backup-retention-period` decide karta hai yeh kitne din tak available rahega (max 35 din).

2. **Manual snapshots**: Tumhare khud ke liye — jab chaho tab ek snapshot le lo, aur yeh tab tak rehta hai jab tak tum khud delete na karo (retention period se bandhaa nahi hota).

```bash
# Manual backup snapshot lena
aws rds create-db-snapshot \
  --db-instance-identifier myapp-db \
  --db-snapshot-identifier myapp-backup

# Backup se naya database restore karna
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myapp-db-restored \
  --db-snapshot-identifier myapp-backup
```

Ek important gotcha samjho — **restore hamesha ek naye database instance mein hota hai**, purane wale ko overwrite nahi karta. Isliye upar wale example mein naya identifier `myapp-db-restored` diya gaya hai. Agar tumhe production database ko replace karna hai, toh restore karne ke baad tumhe apni app ka connection string bhi switch karna padega (ya DNS/endpoint swap karna padega).

Isko UPI transaction ke context mein socho — agar CRED ka database corrupt ho jaye, toh unka backup unhe kal raat 2 baje ki state mein wapas le ja sakta hai, lekin woh restore ek naye database mein hoga jisko phir traffic point karna padega.

## Read Replicas — Read Traffic Scale Karna

### Kyun zaruri hai?

Socho Flipkart ka Big Billion Day sale chal raha hai. Lakhon log ek saath product listings dekh rahe hain (read queries), lekin order place karne wale (write queries) usse kaafi kam hain. Agar sab kuch ek hi database pe jaaye, toh woh database read traffic ke bojh se dab jayega aur writes bhi slow ho jayenge.

Solution: **Read Replicas**. Yeh primary database ke asynchronous copies hote hain jinhe tum sirf **read queries** ke liye use karte ho. Tumhari application layer mein logic hota hai — "SELECT wale queries read replica pe bhejo, INSERT/UPDATE/DELETE primary pe bhejo".

```bash
# Read replica banao read queries scale karne ke liye
aws rds create-db-instance-read-replica \
  --db-instance-identifier myapp-db-read \
  --source-db-instance-identifier myapp-db
```

Kuch important baatein:

- Replication **asynchronous** hoti hai — matlab replica pe data primary se thoda **lag** kar sakta hai (usually milliseconds se seconds, but load zyada ho toh zyada bhi ho sakta hai). Isliye agar tumhe turant-consistent read chahiye (jaise payment confirm karne ke turant baad wahi data dikhana hai), toh primary se hi padho.
- Tum **multiple read replicas** bana sakte ho — jitna zyada read traffic, utne zyada replicas laga sakte ho.
- Read replicas ko tum **standalone primary bhi bana sakte ho** (promote karke) — disaster recovery ya migration ke scenarios mein kaam aata hai.
- Multi-AZ standby aur Read Replica mein confuse mat hona: Multi-AZ standby = **sirf failover ke liye**, directly query nahi kar sakte. Read Replica = **directly query karne ke liye**, availability ke liye nahi (though cross-region replica disaster recovery mein bhi madad karta hai).

## Best Practices

- **Backup retention**: Kam se kam 7 din rakho — production ke liye 30+ din bhi consider karo agar compliance requirement ho.
- **Multi-AZ**: Production mein hamesha ON rakho — dev/staging mein optional hai (cost bachane ke liye).
- **Monitoring**: CloudWatch metrics (CPU, connections, storage, replica lag) aur logs enable karo — bina monitoring ke tumhe pata hi nahi chalega ki database slow kyun ho raha hai jab tak users complain na karein.
- **Security**: Connection pooling ke liye **RDS Proxy** use karo — yeh especially serverless/Lambda setups mein zaruri hai kyunki Lambda functions bohot saare short-lived connections khol sakte hain jo database ko overwhelm kar dete hain. RDS Proxy in connections ko pool karke database ko protect karta hai.
- **Updates**: Automatic minor version upgrades ON rakho taaki security patches automatically lagte rahein — major version upgrades manually plan karo kyunki unmein breaking changes ho sakte hain.
- **Encryption**: Data at rest (disk pe) aur in transit (network mein) dono encrypt karo — RDS mein yeh ek flag se enable ho jata hai (`--storage-encrypted`), lekin yaad rakhna ki yeh sirf naye instance banate waqt set kar sakte ho, existing unencrypted instance ko baad mein encrypt nahi kar sakte (snapshot lekar naya encrypted instance banana padta hai).
- **Least privilege**: Master user ko application ke liye directly use mat karo — application ke liye alag, limited-permission DB user banao.

## Key Takeaways

- **RDS** managed relational database service hai — backups, patching, failover sab AWS handle karta hai, tumhe sirf query bhejni hoti hai.
- **Multi-AZ** high availability ke liye hota hai — synchronous standby copy alag AZ mein, automatic failover ke saath. Yeh scaling ke liye nahi hai.
- **Backups** (automated + manual snapshots) disaster recovery ke liye zaruri hain — restore hamesha naye instance mein hota hai.
- **Read Replicas** asynchronous copies hain jo read traffic scale karne ke liye use hoti hain — writes ke liye nahi.
- **Encryption** data ko rest aur transit dono mein protect karta hai — instance creation ke waqt hi decide karna padta hai.
- **RDS Proxy** connection pooling ke liye use karo, especially serverless architectures mein.

Next: [S3 & CloudFront](./07_s3_and_cloudfront.md)

# S3 & CloudFront

> Object storage ke liye S3, aur poori duniya mein content fatafat deliver karne ke liye CloudFront CDN.

Socho ek second ke liye — tumne apni React app build kar li, `dist` folder ban gaya, ab yeh files kahan rakhoge jo browser directly serve kar sake? Yahi kaam karta hai **S3** — ek massive, infinitely scalable file storage jisme tum kuch bhi daal sakte ho (images, videos, zip files, static HTML/CSS/JS, backups, logs — literally kuch bhi). Aur jab tumhare users India, US, Europe sabhi jagah se aa rahe hon, toh ek hi server (jo maan lo Mumbai region mein hai) se sabko serve karna slow padega — US wale user ko response aane mein latency lagegi. Isi problem ko solve karta hai **CloudFront** — yeh tumhari S3 files ko duniya bhar ke edge locations pe cache kar deta hai, taaki jo bhi user closest location se request kare, usse fast response mile.

Isko Zomato ke analogy se samjho — S3 tumhara central kitchen/warehouse hai jahan saara raw material (data) store hota hai. CloudFront un local dark-stores/cloud kitchens jaisa hai jo har city mein khड़े hain — jab order aata hai toh nearest dark store se turant deliver ho jata hai, poore central warehouse tak jaane ki zaroorat nahi padti.

## S3 Basics

### Kya hota hai S3?

S3 (Simple Storage Service) ek **object storage** service hai — matlab yeh file system ki tarah folders/directories nahi maintain karta, balki har cheez ek "object" hota hai jo ek unique key (path jaisa dikhta hai) ke through access hota hai. Ek "bucket" S3 ka top-level container hota hai — jaise tumhara Google Drive ka root folder, bas globally unique naam ke saath (kyunki bucket names poori AWS mein unique hone chahiye, sirf tumhare account mein nahi).

### Create & Manage Buckets

```bash
# Create bucket
aws s3 mb s3://my-app-bucket

# Upload file
aws s3 cp app.zip s3://my-app-bucket/

# Sync directory
aws s3 sync ./dist s3://my-app-bucket/ --delete

# Download file
aws s3 cp s3://my-app-bucket/app.zip .

# List contents
aws s3 ls s3://my-app-bucket/ --recursive

# Delete bucket (must be empty)
aws s3 rb s3://my-app-bucket
```

Yeh commands basically ek CLI file explorer jaise hain, bas local machine ki jagah cloud storage pe operate ho rahe hain.

- `mb` (make bucket) — naya bucket banata hai. Naam globally unique hona chahiye, isliye `my-app-bucket` jaisa generic naam production mein aksar already liya hua milega — kuch unique suffix add karo (jaise company name + random string).
- `cp` — ek single file copy karta hai, chahe upload ho ya download.
- `sync` — pura folder S3 se compare karke sirf jo files change hui hain unhe upload karta hai (delta upload, poora reupload nahi). `--delete` flag zaroor samjho — yeh S3 pe woh files bhi delete kar dega jo local folder mein ab exist nahi karti. Deploy scripts mein yeh bahut common hai kyunki purani build files clean rehni chahiye.

> [!warning]
> `aws s3 sync ./dist s3://my-app-bucket/ --delete` chalane se pehle double-check karo ki tum sahi bucket target kar rahe ho. Galat bucket pe `--delete` chala diya toh production data clean ho sakta hai — jaise galti se apne khud ke Flipkart warehouse ka saara stock clear kar dena!

### Bucket Versioning & Lifecycle

**Kyun zaruri hai?** Socho tumne galti se production ka `config.json` overwrite kar diya ya delete kar diya — ab kya karoge? Agar versioning enabled hai, toh S3 purani copies bhi rakhta hai, matlab tum kisi bhi purane version pe rollback kar sakte ho. Yeh IRCTC ke ticket history jaisa hai — tumhara current booking dikhta hai, but purane bookings ka record bhi kahin store rehta hai jise tum retrieve kar sakte ho.

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-app-bucket \
  --versioning-configuration Status=Enabled
```

Ek baar versioning ON kar diya toh har overwrite ya delete ek naya "version" create karta hai, purana version delete nahi hota — bas "non-current" ho jata hai. Iska side-effect yeh hai ki storage cost badhta rahega agar tum purane versions ko clean nahi karte. Isi ke liye **lifecycle policy** kaam aati hai:

```bash
# Delete old versions after 30 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-app-bucket \
  --lifecycle-configuration file://lifecycle.json
```

```json
{
  "Rules": [{
    "Id": "DeleteOldVersions",
    "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
    "Status": "Enabled"
  }]
}
```

Yeh rule bolta hai — "jo bhi version 30 din se current nahi hai (matlab purana ho gaya), usko automatically delete kar do." Yeh ek automatic housekeeping cron job jaisa hai jo Swiggy apne expired coupon codes ke liye chalata hoga — purana data zyada der store karke paisa waste nahi karna.

> [!tip]
> Lifecycle policies sirf version delete karne ke liye nahi hoti — tum inhe use karke objects ko cheaper storage class (jaise S3 Glacier) mein automatically move bhi kar sakte ho agar wo files rarely access hoti hain. Cost optimization ka bahut powerful tool hai.

### Access Control

**Kyun zaruri hai?** By default S3 bucket **private** hota hai — koi bhi outsider tumhara data directly access nahi kar sakta. Yeh sahi bhi hai, security ka golden rule hai "secure by default." Lekin agar tumhe static website host karni hai ya public assets serve karni hain (jaise product images), toh tumhe selectively public access dena padega.

```bash
# Block all public access (secure by default)
aws s3api put-public-access-block \
  --bucket my-app-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

Yeh command ek extra safety switch hai — bucket-level pe "Public Access Block" laga deta hai jo galti se koi bhi ACL ya policy public bana de toh usse bhi override/block kar deta hai. Production buckets mein yeh hamesha ON rakhna chahiye jab tak explicitly public hosting ki zaroorat na ho.

```bash
# Grant public read access via policy
aws s3api put-bucket-policy \
  --bucket my-app-bucket \
  --policy file://public-policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-app-bucket/*"
  }]
}
```

Is policy ka matlab hai: "*" (koi bhi, world mein kahin se bhi) `s3:GetObject` (matlab sirf read/download) kar sakta hai bucket ke andar kisi bhi object pe. Notice karo — `PutObject` ya `DeleteObject` allow nahi kiya gaya, sirf read. Yeh important hai — public bucket ka matlab yeh nahi ki koi bhi upload/delete bhi kar sake, sirf read access dena hai (jaise ek public menu card, jise koi bhi dekh sakta hai, but koi edit nahi kar sakta).

> [!warning]
> Agar `put-public-access-block` pehle se ON hai, toh public bucket policy kaam nahi karegi jab tak tum `BlockPublicPolicy` aur `RestrictPublicBuckets` ko explicitly false na karo us specific bucket ke liye. Yeh ek common confusion point hai jab log static site host karne ki koshish karte hain aur access denied milta rehta hai.

---

## CloudFront CDN

### Kya hota hai CloudFront aur kyun chahiye?

Maan lo tumhari S3 bucket Mumbai (ap-south-1) region mein hai. Ab agar koi user US se tumhari static site access kare, toh har request ko Mumbai tak travel karna padega — round trip latency high hogi. CloudFront ek **CDN (Content Delivery Network)** hai jo AWS ke duniya bhar mein faile hue "edge locations" (200+ cities) pe tumhara content cache kar deta hai. Jab US ka user request bhejta hai, toh usse nearest edge location se serve ho jata hai — Mumbai tak jaane ki zaroorat hi nahi padti (jab tak cache miss na ho).

Iska real-world analogy — Amazon ka warehouse network. Agar tumne Bangalore se order kiya aur product Bangalore ke warehouse mein already stock mein hai, toh agle din delivery mil jaati hai. Agar wahi product sirf Delhi warehouse mein hota, toh delivery mein zyada time lagta. CloudFront edge locations bhi waise hi kaam karte hain — content ko user ke jitna kareeb ho sake, utna kareeb rakhte hain.

### Create Distribution

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://distribution.json

# Returns: DistributionId, DomainName
# Domain: d123456.cloudfront.net
```

```json
{
  "CallerReference": "unique-id",
  "DefaultRootObject": "index.html",
  "Origins": [{
    "Id": "my-bucket",
    "DomainName": "my-app-bucket.s3.amazonaws.com",
    "S3OriginConfig": {}
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "my-bucket",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD"],
    "ForwardedValues": {"QueryString": false}
  },
  "Enabled": true
}
```

Is config ke important parts samjho:

- **`Origins`** — batata hai CloudFront ko ki actual content kahan se fetch karna hai (yahan S3 bucket). Origin ek S3 bucket, ek EC2 instance, ya koi bhi HTTP server ho sakta hai.
- **`DefaultRootObject`** — jab koi root URL (`/`) hit kare, toh kaunsi file serve karni hai. `index.html` classic default hai, exactly waise jaise apache/nginx mein hota hai.
- **`ViewerProtocolPolicy: redirect-to-https`** — agar koi user `http://` se aaye, toh usse automatically `https://` pe redirect kar do. Security best practice hai, kabhi bhi plain HTTP allow mat karo production mein.
- **`AllowedMethods: ["GET", "HEAD"]`** — sirf read operations allow karo, kyunki static content CDN se serve ho raha hai, POST/PUT/DELETE jaisi cheezein origin server (backend API) tak seedha jaani chahiye, CDN se nahi.
- **`ForwardedValues.QueryString: false`** — query strings ko cache key mein include mat karo. Matlab `page.html?ref=fb` aur `page.html?ref=google` dono same cached response denge. Agar tumhari app query params ke basis pe different content deti hai, toh yeh `true` karna padega, warna wrong cached response mil sakta hai.

Distribution create hone ke baad tumhe ek CloudFront domain milta hai jaise `d123456.cloudfront.net` — yeh tumhara CDN endpoint hai. Deploy hone mein 15-20 minute lag sakte hain kyunki config duniya bhar ke edge locations mein propagate hoti hai.

### Invalidate Cache

**Kyun zaruri hai?** Yeh sabse common gotcha hai jo naye developers ko confuse karta hai — tumne S3 pe naya build upload kar diya, but website pe abhi bhi purana version dikh raha hai! Aisa isliye hota hai kyunki CloudFront ne purani file ko cache kar rakha hai edge locations pe, aur wo apne aap turant refresh nahi hoti (jab tak cache expire na ho).

```bash
# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id d123456 \
  --paths "/*"

# Invalidate specific files
aws cloudfront create-invalidation \
  --distribution-id d123456 \
  --paths "/index.html" "/api/config.json"
```

Invalidation basically CloudFront ko bolta hai — "in files ka cached copy phenk do, agli baar request aaye toh origin (S3) se fresh copy le aana." Yeh Swiggy app ke restaurant menu cache jaisa hai — agar restaurant ne apna menu update kiya, toh Swiggy ko purana cached menu clear karke naya fetch karna padega, warna customer purana menu dekhega aur order karega jo ab available hi nahi hai.

> [!tip]
> `"/*"` invalidation har baar mat use karo — AWS pehle 1000 invalidation paths per month free deta hai, uske baad charge lagta hai. Better approach: filenames mein content hash daalo (jaise `app.a1b2c3.js`), taaki file change hone pe naam bhi change ho jaaye — is trick se invalidation ki zaroorat hi nahi padti kyunki naya naam automatically fresh request trigger karega. Ye "cache busting" technique kehlati hai aur production mein highly recommended hai.

### Custom Domain

Default CloudFront domain (`d123456.cloudfront.net`) dekhne mein professional nahi lagta — koi bhi user apne app ka URL `myapp.com` dekhna chahega, na ki randomly generated CloudFront hash.

```bash
# Create certificate for domain
aws acm request-certificate \
  --domain-name myapp.com \
  --validation-method DNS

# Update CloudFront to use custom domain
aws cloudfront update-distribution \
  --id d123456 \
  --distribution-config file://updated-config.json
# Add CNAME: myapp.com → d123456.cloudfront.net in Route53
```

Yahan do steps hote hain:
1. **ACM (AWS Certificate Manager)** se ek SSL/TLS certificate mangwana — CloudFront custom domain pe HTTPS chalane ke liye certificate mandatory hai (varna browser "not secure" dikhayega). `DNS` validation method matlab tumhe apne DNS provider (Route53 ya jo bhi use kar rahe ho) mein ek validation record daalna padega taaki AWS confirm kar sake ki tum wakai us domain ke owner ho.
2. Certificate validate hone ke baad, CloudFront distribution ko update karke bolna hai ki "ab is custom domain (`myapp.com`) ko bhi accept karo, aur is certificate ko use karo HTTPS ke liye."
3. Finally DNS mein ek CNAME (ya Route53 mein Alias record) daalna hai jo `myapp.com` ko CloudFront ke domain (`d123456.cloudfront.net`) ki taraf point kare.

Yeh bilkul waise hai jaise CRED apne app ka custom short-link (`cred.club/xyz`) banata hai instead of raw AWS/third-party URL dikhaने ke — branding aur trust dono ke liye zaruri hai.

---

## Static Site Hosting

### Deploy React/Vue App

**Kyun useful hai?** Agar tumhari app pure frontend hai (koi server-side rendering nahi, sirf static HTML/CSS/JS jo browser mein chalta hai), toh tumhe ek pura server maintain karne ki zaroorat nahi — S3 + CloudFront combo se hi tum poori duniya mein fast, reliable, aur cheap hosting kar sakte ho. Yahi pattern hai jo bahut saari companies apne marketing sites, dashboards, aur SPAs ke liye use karti hain.

```bash
# Build and upload
npm run build
aws s3 sync ./dist s3://my-app-bucket --delete

# Invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id d123456 \
  --paths "/*"

echo "Deployed to: https://myapp.com"
```

Yeh teen steps mil ke ek basic CI/CD deploy pipeline bana dete hain:
1. Build karo (`npm run build` se production-optimized static files banti hain)
2. Un files ko S3 pe sync karo (purani files replace/delete ho jaati hain `--delete` ki wajah se)
3. CloudFront cache invalidate karo taaki users ko naya version dikhe, purana nahi

Yeh flow GitHub Actions ya kisi bhi CI tool mein easily automate ho sakta hai — code push hote hi yeh sab steps automatically chal jaate hain, koi manual deployment ki zaroorat nahi.

### 404 Handling for SPAs

**Kya problem hai?** Single Page Applications (React Router, Vue Router waali apps) mein saari routing client-side JavaScript handle karti hai. Matlab agar koi user directly `myapp.com/dashboard/settings` URL type karke browser mein enter kare, toh S3 ko yeh path samajh nahi aayega kyunki uske paas literally aisi koi file (`dashboard/settings.html`) exist hi nahi karti — sirf ek `index.html` hai jisme saara JavaScript router logic hai. Result: S3 "404 Not Found" bhej dega, jabki actually route valid hai (JavaScript ko chance hi nahi mila handle karne ka).

```bash
# Route 404s to index.html for client-side routing
aws s3api put-bucket-website \
  --bucket my-app-bucket \
  --website-configuration file://website-config.json
```

```json
{
  "IndexDocument": {"Suffix": "index.html"},
  "ErrorDocument": {"Key": "index.html"}
}
```

Solution simple hai — S3 ko bolo ki koi bhi error (404) mile toh bhi `index.html` hi serve kar do. Ab browser ko `index.html` mil jaata hai, JavaScript load hota hai, aur React Router/Vue Router apna client-side logic chalake sahi component render kar deta hai based on URL. Yeh IRCTC ke reception counter jaisa hai — chahe tum kisi bhi galat window pe jao, wahan ka staff tumhe sahi counter tak guide kar dega instead of seedha "not found, jao wapas" bolne ke.

> [!info]
> Yehi kaam CloudFront level pe bhi kiya ja sakta hai — CloudFront ki "Custom Error Response" feature mein 404/403 errors ko `/index.html` (status code 200 ke saath) pe map kar diya jaata hai. Actually production setups mein yeh approach zyada common hai kyunki S3 website hosting endpoint HTTPS support nahi karta by default, jabki CloudFront level error handling HTTPS ke saath bhi kaam karta hai.

---

## Best Practices

- **Enable versioning** for accidental deletion recovery — galti se delete/overwrite hone pe rollback ka safety net milta hai
- **Use CloudFront** for global distribution — latency kam, performance zyada, poori duniya mein fast access
- **Cache appropriately** (static: 1 year, HTML: 0) — JS/CSS/images jaise assets jo content-hashed hote hain unhe long cache do (1 year), lekin `index.html` ko hamesha fresh fetch karne do (cache 0) taaki naya deploy turant reflect ho
- **Enable CORS** if serving from multiple domains — agar tumhari API ek domain se, aur frontend doosre domain/CDN se serve ho raha hai, toh CORS headers configure karna zaruri hai warna browser requests block kar dega
- **Encrypt** data at rest (S3-SSE) — Server-Side Encryption enable karo taaki data disk pe encrypted form mein store ho, compliance aur security dono ke liye zaruri
- **Use bucket policies** instead of ACLs — bucket policies zyada flexible aur manage karne mein aasan hain, AWS khud bhi ACLs ko legacy approach maanta hai
- **Monitor costs** - S3 can get expensive at scale — especially agar bahut zyada requests (GET/PUT) ho rahi hon ya data transfer out zyada ho, toh bill dheere dheere badh sakta hai. CloudWatch billing alarms laga ke rakho

---

## Key Takeaways

- **S3** object storage hai — files, backups, static assets, kuch bhi store karne ke liye, buckets globally unique naam ke saath
- **Bucket by default private hota hai** — public access explicitly enable karna padta hai (public access block + bucket policy dono manage karne padenge)
- **Versioning + lifecycle policies** milke accidental data loss se bachate hain aur purane versions ko automatically clean bhi karte hain
- **CloudFront** ek CDN hai jo S3 (ya kisi bhi origin) ke content ko duniya bhar ke edge locations pe cache karke latency kam karta hai
- **Cache invalidation** zaruri hai jab bhi naya deploy karo, warna users ko purana cached content dikhta rahega — content-hashed filenames se invalidation ki zaroorat hi khatam ki ja sakti hai
- **Custom domain + ACM certificate** se apna branded HTTPS URL CloudFront pe map kar sakte ho
- **S3 + CloudFront combo** SPAs/static sites ke liye ek complete, cheap, aur scalable hosting solution hai — bas 404-to-index.html rule set karna mat bhoolna client-side routing ke liye

Next: [VPC Networking](./08_vpc_networking.md)

# S3 & CloudFront

> Object storage with S3 and global content delivery with CloudFront CDN.

## S3 Basics

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

### Bucket Versioning & Lifecycle

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-app-bucket \
  --versioning-configuration Status=Enabled

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

### Access Control

```bash
# Block all public access (secure by default)
aws s3api put-public-access-block \
  --bucket my-app-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

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

---

## CloudFront CDN

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

### Invalidate Cache

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

### Custom Domain

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

---

## Static Site Hosting

### Deploy React/Vue App

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

### 404 Handling for SPAs

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

---

## Best Practices

- **Enable versioning** for accidental deletion recovery
- **Use CloudFront** for global distribution
- **Cache appropriately** (static: 1 year, HTML: 0)
- **Enable CORS** if serving from multiple domains
- **Encrypt** data at rest (S3-SSE)
- **Use bucket policies** instead of ACLs
- **Monitor costs** - S3 can get expensive at scale

---

## Summary

- **S3** stores objects (files, data, backups)
- **CloudFront** caches content globally
- **Versioning** protects against deletion
- **Lifecycle policies** manage old objects
- **Static site hosting** hosts SPAs and websites
- **Bucket policies** control access securely

Next: [VPC Networking](./08_vpc_networking.md)

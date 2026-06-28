# RDS & Databases on AWS

> Manage relational databases with Amazon RDS (Relational Database Service).

## Quick Summary

RDS provides managed databases (PostgreSQL, MySQL, MariaDB, Oracle, SQL Server) with automatic backups, patching, and failover.

### Create RDS Instance

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

### Multi-AZ & Backups

```bash
# Enable Multi-AZ (automatic failover)
aws rds modify-db-instance \
  --db-instance-identifier myapp-db \
  --multi-az \
  --apply-immediately

# Create backup
aws rds create-db-snapshot \
  --db-instance-identifier myapp-db \
  --db-snapshot-identifier myapp-backup

# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier myapp-db-restored \
  --db-snapshot-identifier myapp-backup
```

### Read Replicas

```bash
# Create read replica for scaling read queries
aws rds create-db-instance-read-replica \
  --db-instance-identifier myapp-db-read \
  --source-db-instance-identifier myapp-db
```

### Best Practices

- **Backup retention**: 7+ days minimum
- **Multi-AZ**: Always enable for production
- **Monitoring**: CloudWatch metrics and logs
- **Security**: Use RDS Proxy for connection pooling
- **Updates**: Enable automatic minor version upgrades

---

## Summary

- **RDS** handles database administration
- **Multi-AZ** ensures high availability
- **Backups** enable disaster recovery
- **Read replicas** scale read traffic
- **Encryption** protects data at rest and in transit

Next: [S3 & CloudFront](./07_s3_and_cloudfront.md)

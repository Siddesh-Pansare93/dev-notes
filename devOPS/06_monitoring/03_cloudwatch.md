# AWS CloudWatch

> Monitor AWS resources and applications with CloudWatch metrics, logs, and alarms.

## Metrics

```bash
# Put custom metric
aws cloudwatch put-metric-data \
  --namespace MyApp \
  --metric-name OrderCount \
  --value 42 \
  --timestamp 2024-01-15T10:30:00Z

# Query metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-123456 \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-16T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

## Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /app/api

# Put log events
aws logs put-log-events \
  --log-group-name /app/api \
  --log-stream-name api-server-1 \
  --log-events timestamp=$(date +%s000),message="Request processed"

# View logs
aws logs tail /app/api --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /app/api \
  --filter-pattern "ERROR"
```

## Alarms

```bash
# Create alarm on high CPU
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

# List alarms
aws cloudwatch describe-alarms

# Disable alarm
aws cloudwatch disable-alarm-actions --alarm-names high-cpu
```

## Dashboards

```bash
# Create dashboard
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

---

## Summary

- **Metrics** track quantitative data
- **Logs** capture events and errors
- **Alarms** trigger on metric thresholds
- **Dashboards** visualize key metrics
- **Integration** with SNS, Lambda, SQS
- **Low cost** for typical usage

Next: [Prometheus & Grafana](./04_prometheus_and_grafana.md)

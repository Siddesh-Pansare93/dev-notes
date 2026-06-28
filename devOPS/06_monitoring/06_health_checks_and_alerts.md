# Health Checks & Alerts

> Implement health checks and alerting for reliable systems.

## Health Check Endpoints

```javascript
// Node.js health check
app.get('/health', (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date(),
    version: process.env.APP_VERSION
  };
  res.status(200).json(health);
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  const ready = {
    database: checkDatabase(),
    cache: checkCache(),
    external_api: checkExternalAPI()
  };

  const allReady = Object.values(ready).every(v => v);
  res.status(allReady ? 200 : 503).json(ready);
});
```

## Kubernetes Probes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    # Check if container is alive
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3

    # Check if ready for traffic
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 2
```

## Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: application
    rules:
      - alert: ServiceDown
        expr: |
          up{job="myapp"} == 0
        for: 1m
        annotations:
          summary: "Service is down"

      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Error rate {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        annotations:
          summary: "p99 latency is {{ $value }}s"

      - alert: DiskSpaceLow
        expr: |
          node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        annotations:
          summary: "Only 10% disk space remaining"
```

## Alert Notification

```yaml
# Alertmanager config
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

  receiver: 'team-slack'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'team-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'xxxxx'
```

---

## Summary

- **Liveness** probe checks if app is alive
- **Readiness** probe checks if ready for traffic
- **Health endpoints** provide diagnostic info
- **Alerts** notify on problems
- **Multiple channels** (Slack, PagerDuty, email)
- **Runbooks** provide troubleshooting steps

Next: [Performance Monitoring](./07_performance_monitoring.md)

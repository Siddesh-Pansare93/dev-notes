# Prometheus & Grafana

> Open-source monitoring and visualization stack.

## Prometheus

Time-series database for metrics.

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'app'
    static_configs:
      - targets: ['localhost:3000']
```

## Instrumentation

```javascript
// Node.js with Prometheus client
const prometheus = require('prom-client');

// Counter
const httpRequests = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status']
});

// Gauge
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Active database connections'
});

// Histogram
const requestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path']
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequests.labels(req.method, res.statusCode).inc();
    requestDuration.labels(req.method, req.path).observe(duration);
  });

  next();
});

// Expose metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## Grafana

Visualization and dashboarding.

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```bash
# Access
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)

# Add Prometheus as data source in Grafana UI
# Create dashboard with queries like:
# rate(http_requests_total[5m])
# histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

## Alerts

```yaml
# alert.rules.yml
groups:
  - name: app
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate"
          description: "Error rate: {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        annotations:
          summary: "High latency"
```

---

## Summary

- **Prometheus** collects and stores metrics
- **Exporters** expose application metrics
- **Grafana** visualizes metrics
- **Alerts** trigger on conditions
- **Open source** and free
- **Kubernetes native** with good ecosystem

Next: [Distributed Tracing](./05_distributed_tracing.md)

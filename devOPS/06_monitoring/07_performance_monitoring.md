# Performance Monitoring & Optimization

> Monitor and optimize application performance with APM tools and profiling.

## Application Performance Monitoring (APM)

```javascript
// APM with OpenTelemetry
const apm = require('elastic-apm-node');

apm.start({
  serviceName: 'my-app',
  serverUrl: 'http://apm-server:8200'
});

// Automatic tracing
app.use((req, res, next) => {
  apm.captureRequest(req, () => {
    next();
  });
});

// Custom transactions
const transaction = apm.startTransaction('checkout', 'request');

const span1 = transaction.startSpan('validate-cart', 'commerce');
// Validate cart
span1.end();

const span2 = transaction.startSpan('process-payment', 'commerce');
// Process payment
span2.end();

transaction.end();
```

## Profiling

```javascript
// CPU profiling with clinic.js
// npm install -g clinic
// clinic doctor -- node app.js
// clinic flame -- node app.js

// Memory profiling
const heapdump = require('heapdump');

app.get('/debug/heapdump', (req, res) => {
  heapdump.writeSnapshot((filename) => {
    res.download(filename);
  });
});
```

## Key Metrics to Track

```
System Metrics:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- GC pauses (for Node.js, Java)

Application Metrics:
- Request throughput
- Response time (p50, p95, p99)
- Error rate
- Database query time
- Cache hit ratio

Business Metrics:
- Conversion rate
- User engagement
- Revenue
- Transaction volume
```

## Performance Optimization

```javascript
// Identify slow operations
const slowQueryThreshold = 1000; // 1 second

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > slowQueryThreshold) {
      logger.warn('Slow request', {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    }
  });

  next();
});
```

## Benchmarking

```bash
# Apache Bench
ab -n 10000 -c 100 http://localhost:3000/api/health

# Results
# Requests per second: 500
# Time per request: 200ms
# Failed requests: 0

# Wrk (modern benchmarking)
wrk -t4 -c100 -d30s http://localhost:3000/api/health
```

## Common Bottlenecks

```
1. Database Queries
   - N+1 queries
   - Missing indexes
   - Slow joins
   Solution: Add indexes, use query optimization

2. External API Calls
   - High latency
   - Rate limits
   Solution: Caching, retries, circuit breaker

3. Memory Leaks
   - Growing memory over time
   Solution: Profiling, fix references

4. CPU Intensive Operations
   - Long-running tasks
   Solution: Offload to workers, optimize algorithms

5. Network I/O
   - Slow responses from downstream
   Solution: Caching, compression, CDN
```

## Continuous Performance Testing

```yaml
# CI/CD pipeline performance test
performance-test:
  script:
    - npm run build
    - npm run start &
    - sleep 5
    - wrk -t4 -c100 -d10s http://localhost:3000/ > results.json
    - python analyze-performance.py results.json

  artifacts:
    paths:
      - results.json
```

---

## Summary

- **APM** provides end-to-end application visibility
- **Profiling** identifies performance bottlenecks
- **Metrics** track system and app performance
- **Benchmarking** measures improvements
- **Continuous testing** catches regressions
- **Optimization** iteratively improves performance

---

## Congratulations! 🎉

You've completed the entire Modern DevOps Learning Guide covering:

✅ **Fundamentals** - Docker containerization
✅ **CI/CD** - Automated testing and deployment
✅ **AWS** - Cloud infrastructure
✅ **Orchestration** - Docker Compose, Kubernetes
✅ **Infrastructure as Code** - Terraform, CloudFormation
✅ **Monitoring** - Observability and performance

### Next Steps

1. **Build a Project** - Apply what you learned
2. **Deploy to Production** - Use CI/CD pipeline
3. **Monitor Live** - Set up dashboards and alerts
4. **Optimize** - Improve performance and reliability
5. **Contribute** - Share your knowledge

Happy DevOps-ing! 🚀

# Application Logging

> Implement structured logging for debugging and monitoring applications.

## Logging Levels

```
DEBUG   - Development info, verbose
INFO    - Normal operation, important events
WARN    - Potential problems, warnings
ERROR   - Errors, failures
FATAL   - System failure, crash
```

## Structured Logging

```javascript
// ❌ Unstructured
console.log("User login attempt for user");

// ✅ Structured
logger.info("User login attempt", {
  userId: "123",
  email: "user@example.com",
  ip: "192.168.1.1",
  timestamp: "2024-01-15T10:30:45Z"
});
```

```json
{
  "level": "INFO",
  "message": "User login attempt",
  "userId": "123",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "timestamp": "2024-01-15T10:30:45Z",
  "service": "auth"
}
```

## Logging Library Examples

### Node.js with Winston

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info("Order created", { orderId: "456", amount: 99.99 });
logger.error("Payment failed", { error: "Declined", code: "declined" });
```

### Python with Structlog

```python
import structlog

logger = structlog.get_logger()

logger.info("database_query", query="SELECT * FROM users", duration_ms=245)
logger.error("api_error", status=500, endpoint="/api/users", error="Internal error")
```

## Best Practices

```javascript
// ✅ Include context
logger.info("Request processed", {
  requestId: req.id,
  userId: req.user.id,
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  durationMs: Date.now() - req.startTime
});

// ❌ Don't log sensitive data
logger.info("User", { username, password });  // BAD

// ✅ Redact sensitive data
logger.info("User", {
  username,
  password: "***"
});

// ✅ Use appropriate levels
logger.debug("Processing step 1");      // Development
logger.info("User logged in");          // Normal operations
logger.warn("High memory usage");       // Potential issue
logger.error("Database query failed");  // Error
logger.fatal("System crashed");         // Critical
```

## Aggregation

```bash
# CloudWatch Logs (AWS)
aws logs create-log-group --log-group-name /app/api

# ELK Stack (open source)
# Elasticsearch: storage and search
# Logstash: collection and parsing
# Kibana: visualization

# Splunk (commercial)
# Datadog (commercial)
```

---

## Summary

- **Structured logging** enables searching and filtering
- **Appropriate levels** for different message types
- **Context** includes request ID, user, timing
- **Never log** sensitive data (passwords, tokens)
- **Aggregation** centralizes logs from all services
- **Querying** enables debugging and alerting

Next: [CloudWatch](./03_cloudwatch.md)

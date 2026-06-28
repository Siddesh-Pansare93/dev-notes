# Distributed Tracing

> Trace requests across microservices with Jaeger and OpenTelemetry.

## Jaeger

Open-source distributed tracing system.

```yaml
# docker-compose.yml
services:
  jaeger:
    image: jaegertracing/all-in-one
    ports:
      - "6831:6831/udp"  # Jaeger agent
      - "16686:16686"    # UI
```

## Instrumentation with OpenTelemetry

```javascript
// Node.js tracing
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-trace-jaeger');

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://localhost:6831',
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Automatic tracing of HTTP, database, etc.
```

## Manual Spans

```javascript
const tracer = require('@opentelemetry/api').trace.getTracer('my-app');

async function processOrder(orderId) {
  const span = tracer.startSpan('processOrder');

  try {
    // Span operations
    span.setAttribute('orderId', orderId);

    const span2 = tracer.startSpan('fetchInventory', {
      parent: span
    });
    // Fetch inventory
    span2.end();

    const span3 = tracer.startSpan('processPayment', {
      parent: span
    });
    // Process payment
    span3.end();

    return result;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

## Trace Visualization

```mermaid
flowchart TD
    UR["👤 User Request\nGET /api/order\nTotal: 240ms"]

    AG["🔀 API Gateway\n50ms"]
    Auth["🔐 Authentication\n20ms"]
    Authz["✅ Authorization\n5ms"]

    OS["📦 Order Service\n80ms"]
    DB["🗄️ Database Query\n50ms (incl. 10ms network)"]
    INV["📋 Inventory Check\n20ms"]

    PS["💳 Payment Service\n100ms"]
    EXT["🌐 External Payment API\n95ms"]

    NS["🔔 Notification Service\n10ms"]
    Q["📨 Queue Message\n5ms"]

    UR --> AG
    AG --> Auth & Authz
    UR --> OS
    OS --> DB & INV
    UR --> PS
    PS --> EXT
    UR --> NS
    NS --> Q

    style UR fill:#374151,color:#fff
    style EXT fill:#ef4444,color:#fff
    style DB fill:#f59e0b,color:#fff
    style PS fill:#7c3aed,color:#fff
```

Access at: http://localhost:16686

---

## Summary

- **Traces** show request flow across services
- **Spans** represent individual operations
- **OpenTelemetry** is vendor-neutral standard
- **Jaeger** is open-source tracing backend
- **Automatic instrumentation** requires minimal code
- **Debugging** distributed systems made easy

Next: [Health Checks & Alerts](./06_health_checks_and_alerts.md)

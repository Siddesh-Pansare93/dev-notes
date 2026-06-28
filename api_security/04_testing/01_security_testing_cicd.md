# Phase 4: Security Testing & CI/CD Integration

Welcome to Phase 4 of the Secure Coding & API Security tutorial. In this section, we transition from writing secure code to automatically verifying its security. Implementing security checks in your Continuous Integration/Continuous Deployment (CI/CD) pipeline ensures that vulnerabilities are caught before they reach production—a practice often referred to as **DevSecOps** or "Shifting Left."

## What You'll Learn
1. **Static Application Security Testing (SAST):** Integrating Semgrep into GitHub Actions.
2. **Dynamic Application Security Testing (DAST):** Automating OWASP ZAP for active scanning.
3. **Security-Focused Unit & Integration Tests:** Writing tests specifically for authentication bypass and injection attempts.
4. **Audit Logging:** Enabling structured security event logs for auditing and monitoring.

---

## 1. Static Application Security Testing (SAST)

**SAST** analyzes your source code or compiled binaries for known vulnerabilities without executing the application. It looks for hardcoded secrets, dangerous function calls, and common logic flaws.

### Integrating Semgrep into GitHub Actions

[Semgrep](https://semgrep.dev/) is a fast, open-source static analysis tool that excels at finding bugs and enforcing code standards.

Here is how you can integrate Semgrep into your GitHub Actions workflow:

```yaml
# .github/workflows/semgrep.yml
name: Semgrep SAST

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  semgrep:
    name: Run Semgrep Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: "p/default" # Uses default security rulesets
          generateSarif: "1"
          
      - name: Upload SARIF file for GitHub Advanced Security
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: semgrep.sarif
```

**Why this matters:**
This pipeline automatically scans every Pull Request (PR). If a developer accidentally commits code vulnerable to SQL Injection or Cross-Site Scripting (XSS), the PR will be flagged immediately.

---

## 2. Dynamic Application Security Testing (DAST)

While SAST looks at the code, **DAST** interacts with the running application from the outside, much like an attacker would. It sends malicious payloads to your API endpoints and monitors the responses to find vulnerabilities.

### Automating OWASP ZAP

[OWASP ZAP](https://www.zaproxy.org/) (Zed Attack Proxy) is the world’s most widely used DAST tool. You can run ZAP in your CI pipeline against a staging environment or a locally spun-up container.

```yaml
# .github/workflows/dast-zap.yml
name: OWASP ZAP DAST Scan

on: [push]

jobs:
  zap_scan:
    runs-on: ubuntu-latest
    name: Run DAST Scan
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      # (Optional) Step to spin up your application container here
      # - name: Start Application
      #   run: docker-compose up -d

      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.1.0
        with:
          target: 'http://localhost:3000/api/openapi.json' # Your OpenAPI/Swagger spec
          format: openapi
          fail_action: true # Fails the build if high-severity issues are found
```

**Why this matters:**
DAST catches runtime configuration errors, missing security headers, and complex authentication flaws that static analysis might miss.

---

## 3. Security-Focused Unit & Integration Tests

Standard unit tests verify that your application works when users behave properly. **Security tests** verify that your application fails safely when users misbehave.

### Testing Authentication Bypass

Your API should reject requests that lack proper credentials or attempt to access resources belonging to other users (Insecure Direct Object Reference - IDOR).

Here is an example using Node.js and Jest/Supertest:

```javascript
// tests/security/auth.test.js
const request = require('supertest');
const app = require('../../app'); // Your Express app

describe('Security: Authentication & Authorization', () => {
  
  it('should reject unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  it('should prevent IDOR (User A accessing User B data)', async () => {
    // Assume tokenA belongs to user 1
    const tokenA = 'Bearer eyJhbGciOi...'; 
    const targetUserId = 2; // User B
    
    const res = await request(app)
      .get(`/api/users/${targetUserId}/billing`)
      .set('Authorization', tokenA);
      
    // Should return 403 Forbidden or 404 Not Found
    expect(res.statusCode).toBe(403); 
  });
});
```

### Testing Injection Attempts

Always write tests that attempt to inject malicious payloads (SQL, NoSQL, Command Injection) to ensure your input validation and parameterized queries are working.

```javascript
// tests/security/injection.test.js
describe('Security: Input Validation & Injection', () => {

  it('should mitigate SQL injection attempts on login', async () => {
    const maliciousPayload = {
      username: "admin' OR '1'='1",
      password: "password"
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(maliciousPayload);

    // If vulnerable, this might return 200. We expect it to fail safely.
    expect(res.statusCode).toBe(401);
  });
});
```

---

## 4. Audit Logging & Structured Security Events

Security doesn't stop at deployment. You must know **who** did **what**, and **when** they did it. This is where Audit Logging comes in. 

### Enabling Structured Security Event Logs

Standard text logs (`console.log("User logged in")`) are hard to parse in SIEMs (Security Information and Event Management systems). Instead, use **Structured JSON Logging**.

Here is an example using the `winston` library in Node.js:

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Outputs logs as structured JSON
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/audit.log', level: 'info' })
  ]
});

// Security Audit Event Helper
const logSecurityEvent = (eventType, user, action, resource, ip, status) => {
  logger.info({
    event_type: eventType,      // e.g., 'AUTH_SUCCESS', 'DATA_ACCESS'
    actor_id: user.id || null,
    actor_email: user.email || 'anonymous',
    action: action,             // e.g., 'READ', 'UPDATE', 'DELETE'
    resource: resource,         // e.g., 'Invoice_1234'
    ip_address: ip,
    status: status,             // e.g., 'SUCCESS', 'FAILURE'
    timestamp: new Date().toISOString()
  });
};

module.exports = { logger, logSecurityEvent };
```

**Usage in an API Route:**

```javascript
// routes/billing.js
app.get('/api/billing/:id', authenticate, async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.id);
    
    // Log the successful access
    logSecurityEvent('DATA_ACCESS', req.user, 'READ', `Invoice_${req.params.id}`, req.ip, 'SUCCESS');
    
    res.json(invoice);
  } catch (error) {
    // Log unauthorized or failed access
    logSecurityEvent('DATA_ACCESS', req.user, 'READ', `Invoice_${req.params.id}`, req.ip, 'FAILURE');
    res.status(403).json({ error: 'Access Denied' });
  }
});
```

**Why this matters:**
Structured logs can be automatically ingested by tools like Datadog, Splunk, or ELK Stack. If a breach occurs, these audit logs are critical for incident response to trace exactly what the attacker accessed.

---

## Summary

In this phase, we have hardened our deployment and operational lifecycle by:
1. Adding **Semgrep (SAST)** to GitHub Actions to block vulnerable code from being merged.
2. Automating **OWASP ZAP (DAST)** to scan our live API endpoints for runtime weaknesses.
3. Writing explicit **Security Tests** to verify that authentication bypass and injection attempts fail safely.
4. Implementing **Structured Audit Logging** to ensure we have full visibility into security-relevant events in production.

This concludes Phase 4! You are now equipped to build, test, and monitor secure APIs.

# Phase 3: Secure API Design & Implementation

Welcome to Phase 3 of the **Secure Coding & API Security** tutorial. In this section, we will delve into the architectural and implementation-level strategies necessary to build robust, secure, and resilient APIs. Modern APIs are the backbone of most applications, making them prime targets for attackers.

By the end of this module, you will understand how to defend against common vulnerabilities by enforcing strict design patterns and security controls.

---

## 1. Input Validation & Output Encoding

### Input Validation
Never trust client data. All data entering your API (headers, URL parameters, query strings, and body payload) must be validated against a strict set of rules.

**Why it matters:** Prevents injection attacks (SQLi, NoSQLi, Command Injection) and ensures business logic integrity.

**Best Practices:**
*   **Allow-listing (Positive Validation):** Define exactly what is allowed (e.g., "age must be an integer between 18 and 120"). Do not rely on deny-listing (blocking bad characters).
*   **Type Checking:** Ensure the data type matches expectations (string, boolean, array).

**Example (Node.js/Express with `express-validator`):**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/users', [
  body('email').isEmail().normalizeEmail(),
  body('age').isInt({ min: 18, max: 120 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Proceed with processing
});
```

### Output Encoding
If your API returns user-supplied data (especially if consumed by a web browser), it must be encoded to prevent Cross-Site Scripting (XSS).

**Why it matters:** Ensures that the browser interprets the data as text, not as executable code.

*   If returning HTML, use HTML entity encoding (e.g., `<` becomes `&lt;`).
*   Ensure the `Content-Type: application/json` header is strictly set so the browser doesn't try to render JSON as HTML.

---

## 2. Avoiding Sensitive Data in URLs

URLs are frequently logged in multiple places:
*   Browser history
*   Proxy server logs
*   Web server access logs (e.g., Nginx, Apache)
*   Referer headers sent to third parties

**The Rule:** Never pass sensitive information (passwords, API keys, session tokens, PII) in the URL path or query string.

**❌ Bad Practice (Data in URL):**
```http
GET /api/accounts?userId=123&sessionToken=abc123xyz HTTP/1.1
```

**✅ Good Practice (Data in Headers/Body):**
```http
POST /api/accounts HTTP/1.1
Authorization: Bearer abc123xyz
Content-Type: application/json

{
  "userId": 123
}
```

---

## 3. HTTPS Everywhere

APIs must exclusively communicate over HTTPS. HTTP traffic is sent in plaintext, allowing attackers on the network (e.g., public Wi-Fi) to intercept credentials and sensitive data.

**Key Implementation Details:**
1.  **TLS 1.2 or 1.3:** Disable older, insecure protocols like SSLv3, TLS 1.0, and TLS 1.1.
2.  **HTTP Strict Transport Security (HSTS):** Enforce HTTPS at the browser level by sending the `Strict-Transport-Security` header. This prevents downgrade attacks.
3.  **Secure Cookies:** If your API uses cookies for sessions, ensure they have the `Secure` (HTTPS only) and `HttpOnly` (inaccessible to JavaScript) flags.

---

## 4. Proper CORS Policies

Cross-Origin Resource Sharing (CORS) is a browser security feature that restricts how web pages from one domain can interact with APIs hosted on a different domain.

**Why it matters:** A permissive CORS policy (like `Access-Control-Allow-Origin: *` combined with credentials) can allow malicious websites to make unauthorized requests on behalf of an authenticated user.

**Best Practices:**
*   **Specify Exact Origins:** Only allow trusted domains. Do not use wildcards (`*`) for internal or authenticated APIs.
*   **Limit Methods:** Only allow the HTTP methods needed (e.g., `GET`, `POST`).
*   **Limit Headers:** Restrict `Access-Control-Allow-Headers` to only those required by your client.

**Example (Node.js/Express):**
```javascript
const cors = require('cors');

const corsOptions = {
  origin: 'https://www.trusted-frontend.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Only if using cookies/sessions
};

app.use(cors(corsOptions));
```

---

## 5. Rate Limiting, API Gateways, and WAF

To protect your API from abuse, denial-of-service (DoS) attacks, and brute-forcing, you need network and application-level defenses.

### Rate Limiting
Restricts the number of requests a user (or IP address) can make within a specific time window.
```javascript
// Express example using express-rate-limit
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: "Too many requests from this IP, please try again later."
});

app.use('/api/', apiLimiter);
```

### API Gateways
Place an API Gateway (e.g., AWS API Gateway, Kong, Apigee) in front of your services. They handle:
*   Authentication/Authorization offloading
*   Global rate limiting and throttling
*   Routing and load balancing

### Web Application Firewall (WAF)
A WAF inspects incoming HTTP traffic to block common web exploits (like SQL injection or XSS payloads) before they ever reach your API application code.

---

## 6. Implementing Idempotency Keys for Critical Write Operations

An operation is **idempotent** if performing it multiple times yields the same result as performing it once. 

**The Problem:** Network timeouts happen. If a client sends a `POST /payments` request, but the connection drops before receiving the response, the client doesn't know if the payment succeeded. If they retry, they might be charged twice.

**The Solution:** Use an **Idempotency Key**.

**How it works:**
1.  The client generates a unique ID (e.g., a UUID V4) and sends it in an HTTP header (e.g., `Idempotency-Key: <UUID>`).
2.  The API receives the request and checks the database:
    *   *If the key exists:* Return the cached response from the previous successful execution. Do NOT process the transaction again.
    *   *If the key does not exist:* Save the key to the DB (to lock it), process the transaction, and save the result alongside the key.

**Example Flow:**
```http
POST /api/v1/payments HTTP/1.1
Idempotency-Key: 8f192b0c-3b3a-4a6c-9c74-abc123456789
Content-Type: application/json

{
  "amount": 5000,
  "currency": "usd",
  "source": "tok_visa"
}
```

This ensures that critical operations (payments, sending emails, creating resources) are never duplicated due to client retries.
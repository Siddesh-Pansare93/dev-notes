# Secure Coding & API Security

Welcome to the Secure Coding & API Security roadmap! This topic covers the essential skills and mental models needed to design, build, and test secure APIs.

## Learning Roadmap

### Phase 1 — Security Mental Model
- Study OWASP API Security Top 10
- Understand the threat modeling process (STRIDE framework)
- Read about common attack vectors: injection, IDOR, broken auth, SSRF

### Phase 2 — Authentication & Authorization
- Deep-dive OAuth 2.0 + OpenID Connect (OIDC) — flows, token types, scopes
- Implement RBAC and ABAC — role-based vs attribute-based access control
- Never roll custom auth — learn why and what to use instead
- Practice: secure a NestJS/Express API with OAuth 2.0 + JWT best practices

### Phase 3 — Secure API Design
- Input validation & output encoding — validate every incoming payload strictly
- Avoid sensitive data in URLs, use HTTPS everywhere, set proper CORS policies
- Rate limiting, API gateways, WAF — centralized policy enforcement
- Implement idempotency keys for critical write operations

### Phase 4 — Security Testing in CI/CD
- SAST tools: integrate semgrep or SonarQube into your GitHub Actions pipeline
- DAST tools: OWASP ZAP for active scanning of running APIs
- Write security-focused unit/integration tests: auth bypass, injection attempts
- Enable audit logging and structured security event logs

## Best Resources
- OWASP API Security Project (free, essential reading)
- PortSwigger Web Security Academy (free, hands-on labs)
- digitalapi.ai security best practices guide

# Security Testing

This section covers how to move beyond writing secure code and start *verifying* it automatically — integrating security checks into your CI/CD pipeline and writing tests that specifically probe for vulnerabilities. It's for developers who understand API security fundamentals and are ready to enforce them at scale.

## Table of Contents

- [Security Testing & CI/CD Integration](./01_security_testing_cicd.md)
  - Static Application Security Testing (SAST) with Semgrep
  - Dynamic Application Security Testing (DAST) with OWASP ZAP
  - Security-focused unit and integration tests
  - Structured audit logging

## Learning Path

### Beginner
If you're new to security testing, start here to understand the core concepts:
- Read [Security Testing & CI/CD Integration](./01_security_testing_cicd.md) — sections 1 and 2 (SAST and DAST overview)

### Intermediate
Once you understand automated scanning, add test coverage for specific attack vectors:
- [Security Testing & CI/CD Integration](./01_security_testing_cicd.md) — section 3: writing authentication bypass and injection tests

### Advanced
Close the loop by ensuring you can detect and trace incidents in production:
- [Security Testing & CI/CD Integration](./01_security_testing_cicd.md) — section 4: structured audit logging for SIEMs and incident response

## What You'll Learn

- How to integrate **Semgrep** into GitHub Actions to block vulnerable code from being merged via pull requests
- How to automate **OWASP ZAP** (DAST) to actively probe running API endpoints for runtime weaknesses
- How to write **security-focused tests** that verify your app fails safely — covering authentication bypass, IDOR, SQL injection, and other common attack patterns
- How to implement **structured JSON audit logging** with winston so security events are machine-readable and SIEM-ready
- The difference between SAST (code analysis) and DAST (live runtime scanning) and when each catches different classes of bugs
- Why "shifting left" with DevSecOps catches vulnerabilities earlier and cheaper than finding them post-deployment

## Prerequisites

Before starting this section, you should be comfortable with:
- Basic API security concepts — authentication, authorization, input validation, and common attack types (OWASP Top 10)
- Writing a simple CI/CD workflow with GitHub Actions (or a similar pipeline tool)
- Node.js/Express fundamentals, including writing unit tests with Jest and Supertest
- Using Docker or running a local application server (helpful for the DAST section)

If you haven't covered the earlier phases of this API security series, review those first — this section builds directly on secure coding practices established there.

## How to Use This Guide

1. **Run the tools locally first.** Before wiring Semgrep or ZAP into your pipeline, install and run them against a local project so you understand what the output looks like.
2. **Don't skip the test examples.** The Jest/Supertest snippets in section 3 are templates you can copy directly into your own projects — adapt them to your actual routes and auth tokens.
3. **Pair SAST and DAST.** Neither tool catches everything alone. SAST finds hardcoded secrets and dangerous function calls at the code level; DAST catches missing security headers and runtime configuration flaws that only appear when the app is running.
4. **Treat audit logs as a first-class feature.** Add structured logging from the start, not as an afterthought — retrofitting it onto a large codebase is painful. The `logSecurityEvent` helper in section 4 is small but immediately useful.
5. **Fail the build on high-severity findings.** The OWASP ZAP config uses `fail_action: true` — keep this on. A security scan that never fails gives a false sense of safety.

Security testing is not a gate you pass through once — it's a discipline you build into every release cycle. Ship with confidence.

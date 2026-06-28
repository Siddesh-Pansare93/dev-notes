# Secure API Design

This section covers the architectural and implementation-level strategies required to build APIs that are hardened against real-world attacks. It's aimed at backend developers and API engineers who want to move beyond basic auth and apply security at the design layer itself.

## Table of Contents

- [Secure API Design & Implementation](./01_secure_api_design.md)
  - Input Validation & Output Encoding
  - Avoiding Sensitive Data in URLs
  - HTTPS Everywhere (TLS, HSTS, Secure Cookies)
  - Proper CORS Policies
  - Rate Limiting, API Gateways, and WAF
  - Idempotency Keys for Critical Write Operations

## Learning Path

### Beginner
If you're new to API security or just starting to think defensively:
1. **HTTPS Everywhere** — understand why plaintext HTTP is never acceptable and how to enforce secure transport
2. **Avoiding Sensitive Data in URLs** — a simple but commonly missed rule that prevents credential leakage via logs and browser history
3. **Input Validation & Output Encoding** — the foundational layer for stopping injection attacks and XSS

### Intermediate
Once you're comfortable with the basics, layer in controls for abuse and reliability:
4. **Proper CORS Policies** — move past the dangerous `*` wildcard and configure trusted-origin policies correctly
5. **Rate Limiting, API Gateways, and WAF** — protect your API from brute-force, DoS, and common exploit payloads at the network layer

### Advanced
For engineers building payment systems, financial APIs, or any high-stakes write endpoints:
6. **Idempotency Keys** — design retry-safe APIs that never duplicate critical operations like payments or resource creation

## What You'll Learn

- How to validate all inbound API data using allow-listing (positive validation) rather than blocklists
- Why URLs are an unsafe channel for tokens, passwords, and PII — and where to put them instead
- How to configure TLS 1.2/1.3, HSTS, and Secure cookie flags to enforce encrypted transport end-to-end
- How to write a CORS policy that restricts origins, methods, and headers to exactly what your frontend needs
- How to implement per-IP rate limiting in Express and when to reach for an API Gateway or WAF instead
- How idempotency keys work and how to implement them so retrying a failed payment never double-charges a user

## Prerequisites

Before diving in, you should be comfortable with:
- Building REST APIs (any language — examples use Node.js/Express but concepts apply universally)
- Basic HTTP mechanics: methods, headers, status codes, request/response lifecycle
- A general sense of what authentication and authorization mean (covered in earlier sections of this course)

## How to Use This Guide

1. **Read sequentially on your first pass.** The topics build on each other — transport security sets the stage for everything that follows.
2. **Run the code examples locally.** The Node.js snippets are short enough to drop into a test project and verify yourself in minutes.
3. **Map each concept to an attack.** Each section names the threat it defends against (SQLi, XSS, CSRF, DoS, duplicate transactions). Understanding the attack makes the defense memorable.
4. **Apply the checklist mentally to APIs you already own.** After reading each section, ask: does my current API do this? A gap is a task for your backlog.
5. **Revisit the Idempotency Keys section** any time you're designing a write endpoint that involves money, emails, or resource creation — the pattern is easy to miss under deadline pressure.

Secure design is not a feature you add at the end — it's a habit you build one API at a time. Start with the basics, apply them consistently, and the advanced patterns will feel natural.

# Authentication & Authorization

This section covers the industry-standard techniques for proving who a user is and what they are allowed to do — the two pillars every secure API depends on. It is aimed at developers building or securing backend APIs who want to move beyond ad-hoc solutions and adopt proven patterns.

## Table of Contents

- [01 — Authentication & Authorization Deep Dive](./01_authentication_authorization.md)
  - Why you should never roll your own auth
  - OAuth 2.0 & OpenID Connect (OIDC) — tokens, flows, and scopes
  - RBAC vs. ABAC — choosing the right access control model
  - Practical: securing an Express API with JWT middleware

## Learning Path

**Beginner**
Start here if you are new to API security or have only used username/password flows before.
1. Read the "Never Roll Your Own Crypto" section in `01_authentication_authorization.md` to understand why battle-tested solutions matter
2. Study the Core Token Types table (Access Token, ID Token, Refresh Token) to build a clear mental model

**Intermediate**
You know the basics of JWTs but want to understand modern flows and delegation.
1. Work through the OAuth 2.0 & OIDC section — focus on the Authorization Code Flow with PKCE sequence diagram
2. Read the RBAC section and map it to a real project you have worked on

**Advanced**
You are designing authorization for a multi-service or enterprise system.
1. Deep-dive into the ABAC section and policy engine diagram
2. Study the Practical Express example — trace every middleware step and understand RS256 asymmetric signing, audience verification, and scope enforcement

## What You'll Learn

- The difference between **authentication** (who you are) and **authorization** (what you can do)
- Why building a custom auth system is a security anti-pattern and which Identity Providers (Auth0, Okta, Keycloak, AWS Cognito) to use instead
- How **OAuth 2.0** works as a delegation framework and how **OpenID Connect** adds an identity layer on top of it
- The three token types — **Access Token**, **ID Token**, and **Refresh Token** — and when each is appropriate
- The Authorization Code Flow with **PKCE** — the gold standard for web apps, SPAs, and mobile apps
- The **Client Credentials Flow** for machine-to-machine (M2M) communication
- **Role-Based Access Control (RBAC)** — simple, role-to-permission mapping for most apps
- **Attribute-Based Access Control (ABAC)** — granular, policy-driven decisions based on user, resource, action, and environment attributes
- How to implement **JWT validation middleware** in Express using `express-oauth2-jwt-bearer`
- Security fundamentals: RS256 asymmetric signing, audience (`aud`) and issuer (`iss`) verification, and scope enforcement at the route level

## Prerequisites

Before diving in, you should be comfortable with:
- Basic HTTP request/response cycle and REST APIs
- What JSON Web Tokens (JWTs) are and their three-part structure (header, payload, signature)
- Node.js / Express fundamentals (for following the practical code example)
- General understanding of what a backend API does and how it handles requests

If you are unsure about JWTs, a quick read of [jwt.io/introduction](https://jwt.io/introduction) will bring you up to speed in under ten minutes.

## How to Use This Guide

1. **Read linearly first.** The single file in this section is structured as a progressive tutorial — the concepts build on each other, so read it top to bottom at least once before jumping around.
2. **Run the code example.** Copy the Express snippet into a project, wire it to a free Auth0 tenant, and watch the middleware reject requests with missing or malformed tokens — seeing the 401 errors firsthand cements the concept.
3. **Draw the flows yourself.** Redraw the PKCE sequence diagram and the RBAC/ABAC flowcharts from memory. This is the fastest way to make the flows stick.
4. **Map RBAC and ABAC to your own work.** Think of a real feature you have built — what roles exist? What attributes would you need for finer-grained control? This turns abstract theory into practical intuition.
5. **Use the summary as a checklist.** Before shipping any authenticated API endpoint, run through the best practices at the end of the file: asymmetric signing, audience check, issuer check, scope enforcement.

Security is not a feature you add at the end — build the right habits now and they will save you from serious vulnerabilities later. You've got this.

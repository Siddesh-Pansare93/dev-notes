# API Security Mental Model

Before writing a single line of secure code, you need to think like an attacker. This section builds the foundational mindset every developer needs — covering how to model threats systematically, which vulnerabilities are most dangerous in the real world, and how to recognize and fix them in code.

## Table of Contents

- [Security Mental Model](./01_security_mental_model.md)
  - Threat Modeling with STRIDE
  - OWASP API Security Top 10
  - Deep Dive: BOLA / IDOR
  - Deep Dive: Broken Authentication
  - Deep Dive: Injection (SQL, NoSQL, Command)
  - Deep Dive: Server-Side Request Forgery (SSRF)

## Learning Path

### Beginner
1. Read [Security Mental Model](./01_security_mental_model.md) — start with the STRIDE framework overview and the OWASP Top 10 list to get a high-level map of the threat landscape.

### Intermediate
2. Re-read the attack vector deep dives (BOLA, Broken Authentication, Injection, SSRF) — study the vulnerable vs. secure code examples side-by-side and understand *why* each fix works.

### Advanced
3. Apply the STRIDE checklist to a real API you are building or working on. For each endpoint, ask: who can spoof this? how could data be tampered? are actions logged? what can leak? can it be DDoSed? can a user escalate privileges?

## What You'll Learn

- How to use the **STRIDE** framework to systematically identify threats during the design phase — before any code is written
- What the **OWASP API Security Top 10** vulnerabilities are and why they matter for backend developers
- How **BOLA (Broken Object Level Authorization) / IDOR** attacks work and how to enforce object-level ownership checks in code
- Why authentication systems fail and how to avoid the most common implementation mistakes
- How **SQL injection** and **NoSQL injection** exploits work, and why parameterized queries are non-negotiable
- How **SSRF** lets attackers tunnel through your server to reach internal infrastructure, and how to shut that down with allowlists and egress controls
- The core principle of **defensive pessimism**: treat all input as malicious until proven otherwise

## Prerequisites

- Basic understanding of HTTP and REST APIs (what requests, responses, and endpoints are)
- Familiarity with at least one backend language (JavaScript/Node.js examples are used throughout)
- Some exposure to databases and SQL is helpful but not required

## How to Use This Guide

1. **Read the STRIDE section first** — the six threat categories give you a reusable checklist that applies to any system, not just APIs. Memorize the acronym; you will use it constantly.
2. **Study the code examples carefully** — each attack vector shows a vulnerable snippet and a secure fix. Do not just skim the fix; understand the exact line that closes the vulnerability.
3. **Map every example to your own code** — after reading about IDOR, open a project you own and ask: are there any endpoints where I query by a user-supplied ID without verifying ownership?
4. **Use the OWASP Top 10 as a review checklist** — before shipping any new API feature, run through the list and confirm you have addressed each category.
5. **Revisit this section after finishing the rest of the API Security track** — the mental model here becomes much sharper once you have seen concrete authentication patterns (Phase 2), secure design principles (Phase 3), and testing techniques (Phase 4).

Security is a habit, not a feature — the mindset you build here will pay dividends in every project you touch from here on.

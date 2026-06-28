# Blockchain Fundamentals

A ground-up introduction to how blockchains work — written for developers who want to understand the technology before writing a single line of Solidity. This section builds every core concept from first principles, using plain-English analogies, diagrams, and self-check quizzes so you can reason confidently about the systems you'll eventually build on.

## Table of Contents

### Part 1 — The Foundation

1. [What Is a Blockchain?](./01-what-is-blockchain.md) — the trust problem, ledgers, decentralization, and immutability
2. [How Blocks Work](./02-how-blocks-work.md) — block anatomy, hashing, the chain structure, and Merkle trees
3. [Cryptography Basics](./03-cryptography-basics.md) — hash functions, digital signatures, and public/private key pairs

### Part 2 — How Networks Agree

4. [Consensus Mechanisms](./04-consensus-mechanisms.md) — Proof of Work, Proof of Stake, DPoS, PoA, finality, and The Merge
5. [Ethereum Explained](./05-ethereum-explained.md) — the EVM, world state, accounts, and what makes Ethereum a "world computer"

### Part 3 — Users and Transactions

6. [Wallets and Keys](./06-wallets-and-keys.md) — key generation, seed phrases, custodial vs. non-custodial, MetaMask
7. [Transactions](./07-transactions.md) — transaction lifecycle from mempool to confirmed block

### Part 4 — Programming the Blockchain

8. [Smart Contracts Introduction](./08-smart-contracts-intro.md) — what smart contracts are, the ABI, deployment flow, and real-world use cases
9. [Gas and Fees](./09-gas-and-fees.md) — gas units, gas price, base fee, priority fee, and writing gas-efficient code
10. [The Web3 Ecosystem](./10-web3-ecosystem.md) — DeFi, NFTs, DAOs, Layer 2 scaling, oracles, and where it all connects

---

## Learning Path

### Beginner — "I have never touched crypto before"

Work through Part 1 in order before anything else. By the end of chapter 3 you will have a solid mental model of what a blockchain is and why cryptography underpins everything.

1. [What Is a Blockchain?](./01-what-is-blockchain.md)
2. [How Blocks Work](./02-how-blocks-work.md)
3. [Cryptography Basics](./03-cryptography-basics.md)

### Intermediate — "I understand what a blockchain is, but not how it actually works"

Pick up at Part 2. Consensus mechanisms and Ethereum-specific architecture are where blockchain stops being abstract and starts being something you can reason about technically.

4. [Consensus Mechanisms](./04-consensus-mechanisms.md)
5. [Ethereum Explained](./05-ethereum-explained.md)
6. [Wallets and Keys](./06-wallets-and-keys.md)
7. [Transactions](./07-transactions.md)

### Advanced — "I want to start building on the blockchain"

Part 4 is where conceptual knowledge meets developer practice. Read chapters 8–10 once you are comfortable with Parts 1–3.

8. [Smart Contracts Introduction](./08-smart-contracts-intro.md)
9. [Gas and Fees](./09-gas-and-fees.md)
10. [The Web3 Ecosystem](./10-web3-ecosystem.md)

---

## What You'll Learn

- Why blockchain was invented and the specific problem it solves (trust between parties who don't know each other)
- How blocks are structured and cryptographically chained so that tampering is immediately detectable
- The role of hash functions and digital signatures in keeping the network honest
- How Proof of Work and Proof of Stake differ, why Ethereum switched, and what "The Merge" actually changed
- How the Ethereum Virtual Machine (EVM) executes code across thousands of nodes simultaneously
- What wallets and private keys really are under the hood, and why "losing your seed phrase" means losing your funds permanently
- The full lifecycle of a transaction — from signing to mempool to confirmed block
- What smart contracts are, how they're deployed, and their core properties (deterministic, transparent, immutable, trustless, permissionless)
- How gas pricing works and how to avoid writing contracts that are expensive to use
- How DeFi protocols, NFTs, DAOs, oracles, and Layer 2 networks fit into the broader ecosystem

---

## Prerequisites

- Comfort reading technical content — no blockchain background required
- Familiarity with basic programming concepts (variables, functions, data structures) helps but is not strictly necessary for Parts 1–3
- A general sense of how the internet works (clients, servers, HTTP) will make the decentralization concepts land faster

If you are completely new to programming, start with the Python or TypeScript sections of this knowledge base first.

---

## How to Use This Guide

1. **Read linearly if you are starting from zero.** Each chapter builds on the previous one. The payoff of chapter 8 (smart contracts) depends on understanding chapters 1–7.
2. **Use the quizzes.** Every chapter ends with 2–3 questions with hidden answers. Try to answer from memory before revealing — this is where the concepts actually stick.
3. **Don't skip the analogies.** The vending machine, Byzantine generals, and library book examples are not filler. They are the fastest path to intuition.
4. **Return to earlier chapters when something feels unclear later.** Consensus, gas, and immutability are concepts you will encounter again and again — re-reading chapter 1 after chapter 8 often unlocks new understanding.
5. **Treat the diagrams as first-class content.** The Mermaid sequence and flow diagrams encode relationships that take paragraphs to describe in prose.

---

Blockchain thinking is a genuine paradigm shift — the concepts feel strange at first because they are genuinely different from traditional software. Push through the early chapters and the whole picture will snap into place.

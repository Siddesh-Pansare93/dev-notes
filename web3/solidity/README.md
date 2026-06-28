# Solidity & Smart Contracts

A complete guide to writing, securing, and deploying smart contracts on Ethereum and EVM-compatible blockchains — from your first `Hello World` contract to production-grade DeFi protocols, NFTs, and DAOs.

## Table of Contents

### Part 1 — Language Foundations
- [01 — Introduction to Solidity](./01-introduction.md)
- [02 — Data Types](./02-data-types.md)
- [03 — Variables](./03-variables.md)
- [04 — Functions](./04-functions.md)
- [05 — Control Flow](./05-control-flow.md)

### Part 2 — Core Data Structures
- [06 — Arrays and Mappings](./06-arrays-and-mappings.md)
- [07 — Structs and Enums](./07-structs-and-enums.md)
- [08 — Events](./08-events.md)

### Part 3 — Object-Oriented Patterns
- [09 — Modifiers](./09-modifiers.md)
- [10 — Inheritance](./10-inheritance.md)
- [11 — Interfaces and Abstract Contracts](./11-interfaces-and-abstract.md)
- [12 — Libraries](./12-libraries.md)

### Part 4 — Production-Grade Solidity
- [13 — Error Handling](./13-error-handling.md)
- [14 — Gas Optimization](./14-gas-optimization.md)
- [15 — Security](./15-security.md)
- [16 — Design Patterns](./16-design-patterns.md)

### Part 5 — Building Real Projects
- [17 — Real World Projects](./17-real-world-projects.md)

---

## Learning Path

### Beginner — Write your first working contract
Start here if you have never written Solidity before. By the end of this track you will understand how contracts work, know the core types and syntax, and be able to deploy on Remix.

1. Chapter 01 — Introduction (EVM, Remix, Hello World, pragma)
2. Chapter 02 — Data Types
3. Chapter 03 — Variables (state, local, constants, immutables)
4. Chapter 04 — Functions (visibility, view/pure, payable, fallback)
5. Chapter 05 — Control Flow (if/else, loops, break/continue)

### Intermediate — Write contracts you would actually ship
Add the data structures and OOP patterns that power real applications.

6. Chapter 06 — Arrays and Mappings
7. Chapter 07 — Structs and Enums
8. Chapter 08 — Events (emit, indexed parameters, off-chain querying)
9. Chapter 09 — Modifiers (access control, reusable guards)
10. Chapter 10 — Inheritance (is, super, multiple inheritance)
11. Chapter 11 — Interfaces and Abstract Contracts
12. Chapter 12 — Libraries (SafeMath, using-for pattern)
13. Chapter 13 — Error Handling (require, revert, assert, custom errors)

### Advanced — Write contracts you would put real money into
The chapters that separate smart contract developers from smart contract engineers.

14. Chapter 14 — Gas Optimization (SSTORE/SLOAD costs, storage packing, calldata, unchecked)
15. Chapter 15 — Security (reentrancy, overflow, front-running, DoS, flash loans, CEI pattern)
16. Chapter 16 — Design Patterns (Factory, Proxy, Pull Payment, Commit-Reveal)
17. Chapter 17 — Real World Projects (ERC-20, ERC-721 NFT, Staking, DAO Governance with Hardhat)

---

## What You'll Learn

- How Solidity compiles to EVM bytecode and what the ABI is used for
- All primitive and reference types: `uint`, `address`, `bytes`, `string`, `mapping`, arrays, structs, enums
- The difference between `storage`, `memory`, and `calldata` — and why it matters for gas
- Writing functions with correct visibility (`public`, `private`, `internal`, `external`) and mutability (`view`, `pure`, `payable`)
- Building reusable access control with custom modifiers and OpenZeppelin's `Ownable` and `AccessControl`
- Inheritance chains, interface-driven design, and embedded vs. linked libraries
- Emitting and querying events for off-chain indexing and frontend UIs
- Handling errors gracefully with `require`, `revert`, `assert`, and gas-efficient custom errors
- Twelve gas optimization techniques including storage slot packing, `unchecked` arithmetic, and `calldata` over `memory`
- Every major Solidity vulnerability: reentrancy, integer overflow, `tx.origin` phishing, timestamp manipulation, weak randomness, unbounded loops, flash loan attacks, and unchecked call return values
- The Checks-Effects-Interactions (CEI) pattern and how to build a complete security pre-deployment checklist
- Design patterns that scale: Factory, Proxy, Commit-Reveal, Pull-over-Push
- Four production contracts built end-to-end: an ERC-20 token, an ERC-721 NFT with royalties and reveal mechanics, a DeFi staking contract, and a DAO with on-chain governance and proposal execution
- Professional tooling: Hardhat, Ethers.js, OpenZeppelin contracts, Slither, and testnet deployment to Sepolia

---

## Prerequisites

- Comfortable with at least one programming language that uses curly-brace syntax (JavaScript, TypeScript, Java, C++, Go — any of these transfer well)
- Basic understanding of what a blockchain is: transactions, blocks, wallets, and the idea of a public ledger
- Familiarity with the command line for running npm and Hardhat scripts (only needed for Part 5 — the first four parts work entirely in the browser via Remix)
- No prior blockchain development experience required

---

## How to Use This Guide

1. **Start in Remix, stay in Remix until Chapter 13.** Every example through error handling can be compiled and deployed in the browser at [remix.ethereum.org](https://remix.ethereum.org) — no local setup needed. Do not let tooling slow your momentum early on.

2. **Type the code, do not copy-paste.** The muscle memory of typing `mapping(address => uint256)` and `emit Transfer(from, to, amount)` is not trivial — it is how the syntax becomes intuitive. Especially for the first ten chapters.

3. **Take the quizzes before moving on.** Each chapter ends with quiz questions that surface exactly the misconceptions that cause real bugs. If you cannot answer them confidently, re-read the section rather than moving forward.

4. **Read Chapter 15 (Security) twice.** Once as a learner, and once after you finish Chapter 17 with your own contracts in front of you. The reentrancy patterns and CEI rules look very different when you are looking at code you wrote yourself.

5. **Deploy to Sepolia before calling anything production-ready.** Chapter 17 walks you through the full Hardhat + Sepolia deployment flow. Running your contracts against a real test network — not just a Remix VM — reveals timing issues, gas edge cases, and interaction bugs that local simulation never catches.

---

Good luck, and remember: every DeFi protocol, NFT collection, and on-chain governance system you interact with today was written by someone who started exactly where you are now.

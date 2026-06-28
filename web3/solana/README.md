# Solana Development

A deep-dive series for developers who want to build real applications on Solana — from understanding the core architecture and account model, to writing Anchor programs, launching SPL tokens, building NFT projects, and shipping a complete DeFi staking protocol.

## Table of Contents

### Part 1 — Foundations
1. [What Is Solana and How Is It Different from Ethereum](./01-what-is-solana.md)
2. [Solana Architecture — 8 Core Innovations](./02-solana-architecture.md)
3. [The Accounts Model](./03-accounts-model.md)

### Part 2 — On-Chain Development
4. [Programs — Solana Smart Contracts in Rust](./04-programs.md)
5. [Anchor Framework](./05-anchor-framework.md)

### Part 3 — Tokens and NFTs
6. [SPL Tokens](./06-spl-tokens.md)
7. [NFTs on Solana](./07-nfts-solana.md)

### Part 4 — Client and DeFi
8. [Client Development](./08-client-development.md)
9. [DeFi Fundamentals](./09-defi-fundamentals.md)

### Part 5 — Capstone Project
10. [Project: Token Staking Program](./10-project-staking-program.md)

## Learning Path

### Beginner — Start Here
Read chapters 1 through 3 in order. Chapter 1 gives you the full mental model of why Solana exists and how it compares to Ethereum. Chapter 2 walks through the 8 architectural innovations (Proof of History, Sealevel, Gulf Stream, etc.). Chapter 3 covers the accounts model — the single most important concept for writing Solana programs. You cannot skip this foundation.

**Recommended order:** Chapter 1 → Chapter 2 → Chapter 3

### Intermediate — Writing Programs
Once you understand accounts, move to chapters 4 and 5. Chapter 4 teaches you native Rust programs from scratch: the entrypoint, instruction routing, AccountInfo, security checks, CPI, and compute units. Chapter 5 introduces the Anchor framework, which generates most boilerplate automatically. Chapters 6 and 7 cover SPL tokens and NFTs — you will use these in almost every Solana project.

**Recommended order:** Chapter 4 → Chapter 5 → Chapter 6 → Chapter 7

### Advanced — Full-Stack and DeFi
Chapter 8 covers client-side development: connecting wallets, building transactions in TypeScript, and reading on-chain state. Chapter 9 introduces DeFi patterns on Solana — DEXes, AMMs, liquidity pools, and composability via CPI. Chapter 10 is a complete production-style capstone: a custom SPL token plus a time-weighted staking program with a React + Phantom wallet frontend.

**Recommended order:** Chapter 8 → Chapter 9 → Chapter 10

## What You'll Learn

- How Solana achieves ~65,000 theoretical TPS using Proof of History, parallel execution (Sealevel), and pipelining — and the honest trade-offs that come with it
- The Solana account model: why programs are stateless, how state lives in separate accounts, and how rent works
- Writing native Rust programs from scratch: entrypoint, instruction parsing, AccountInfo validation, and the three security commandments (owner check, signer check, key verification)
- How to use Program Derived Addresses (PDAs) as program-owned signers — the pattern behind every serious Solana protocol
- Cross-Program Invocation (CPI) using both `invoke` and `invoke_signed`, and how DeFi protocols compose on top of each other
- Building with the Anchor framework: accounts validation via macros, auto-generated TypeScript clients, and IDL-based tooling
- Creating and managing SPL tokens: mints, associated token accounts, mint authority, and freeze authority
- Minting and managing NFTs using the Metaplex standard
- Client-side development with `@solana/web3.js` and Anchor: building transactions, reading on-chain state, and integrating Phantom wallet
- DeFi fundamentals: AMM mechanics, liquidity pools, staking patterns, and reward calculations
- Building and deploying a full staking protocol end-to-end, including a React frontend and a complete Anchor program with security checks

## Prerequisites

- **JavaScript or TypeScript** — client-side code throughout the series uses TypeScript with `@solana/web3.js`
- **Basic Rust** — not expert-level, but familiarity with ownership, enums, structs, and pattern matching will save significant time; chapters 4 and 5 explain the Solana-specific Rust as they go
- **Blockchain fundamentals** — you should know what a wallet, private key, transaction, and block are; prior Ethereum experience is helpful but not required
- **Node.js tooling** — npm, ts-node, and running scripts from the terminal

## How to Use This Guide

1. **Run the code as you read.** Every chapter includes working scripts and programs. Set up a devnet environment early (Solana CLI, Phantom wallet, `solana airdrop`) and test each example as you go — the concepts only click when you see real transactions on-chain.
2. **Do not skip the accounts model.** Chapter 3 is the mental model that unlocks everything else. If something in chapters 4–10 does not make sense, the answer is almost always in chapter 3.
3. **Learn native Rust before Anchor.** Chapter 4 teaches native programs before Anchor is introduced. This sequence is intentional — Anchor hides complexity you need to understand to debug issues and reason about security.
4. **Take the security warnings seriously.** Every chapter that touches account validation includes real exploit patterns (missing signer checks, missing owner checks, arbitrary CPI). These are not theoretical — they have drained real funds from production programs.
5. **Treat chapter 10 as a template.** The staking project is structured the way a real production program is structured: PDAs for all state, checked arithmetic everywhere, a funded vault, TypeScript tests, and a frontend. Fork it as the starting point for your own projects.

Build something real. Solana's speed and fee structure make on-chain patterns possible that are simply not economical on other chains — take advantage of that.

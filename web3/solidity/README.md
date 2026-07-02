# Solidity & Smart Contracts

Socho ek second ke liye — tumne itne saal Node.js aur TypeScript mein backend likha hai, jahan server crash ho jaaye toh restart kar do, database mein galat data chala jaaye toh migration likh ke fix kar do. Ab ek aisi duniya imagine karo jahan tumhara code deploy hone ke baad **kabhi edit nahi ho sakta**, aur agar usmein bug hai toh log ka real paisa (crypto) chala jaayega, permanently. Yeh hai smart contracts ki duniya — aur Solidity woh language hai jisse Ethereum aur EVM-compatible blockchains (Polygon, BSC, Arbitrum, waghera) pe yeh contracts likhe jaate hain.

Yeh guide tumhe zero se le jaayegi — pehle `Hello World` contract se lekar production-grade DeFi protocols, NFTs, aur DAOs tak.

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

### Beginner — Apna pehla working contract likho
Agar tumne kabhi Solidity nahi likhi, toh yahan se shuru karo. Is track ke end tak tumhe pata chal jaayega ki contracts kaise kaam karte hain, core types aur syntax samajh aa jaayenge, aur Remix pe deploy karna aa jaayega.

1. Chapter 01 — Introduction (EVM, Remix, Hello World, pragma)
2. Chapter 02 — Data Types
3. Chapter 03 — Variables (state, local, constants, immutables)
4. Chapter 04 — Functions (visibility, view/pure, payable, fallback)
5. Chapter 05 — Control Flow (if/else, loops, break/continue)

### Intermediate — Aise contracts likho jo tum actually ship karoge
Ab woh data structures aur OOP patterns seekhte hain jo real applications ko power dete hain.

6. Chapter 06 — Arrays and Mappings
7. Chapter 07 — Structs and Enums
8. Chapter 08 — Events (emit, indexed parameters, off-chain querying)
9. Chapter 09 — Modifiers (access control, reusable guards)
10. Chapter 10 — Inheritance (is, super, multiple inheritance)
11. Chapter 11 — Interfaces and Abstract Contracts
12. Chapter 12 — Libraries (SafeMath, using-for pattern)
13. Chapter 13 — Error Handling (require, revert, assert, custom errors)

### Advanced — Aise contracts likho jinme tum real paisa daal sako
Yeh woh chapters hain jo "smart contract developer" aur "smart contract engineer" mein farak karte hain.

14. Chapter 14 — Gas Optimization (SSTORE/SLOAD costs, storage packing, calldata, unchecked)
15. Chapter 15 — Security (reentrancy, overflow, front-running, DoS, flash loans, CEI pattern)
16. Chapter 16 — Design Patterns (Factory, Proxy, Pull Payment, Commit-Reveal)
17. Chapter 17 — Real World Projects (ERC-20, ERC-721 NFT, Staking, DAO Governance with Hardhat)

---

## Tum Kya Seekhoge

Kyun zaruri hai yeh sab samajhna? Kyunki blockchain pe "chalta hai" wala approach nahi chalta — ek bug live production mein millions of dollars le doob sakta hai. Toh yeh raha poora roadmap:

- Solidity EVM bytecode mein kaise compile hoti hai, aur ABI kis kaam aata hai
- Saare primitive aur reference types: `uint`, `address`, `bytes`, `string`, `mapping`, arrays, structs, enums
- `storage`, `memory`, aur `calldata` mein farak — aur gas ke liye yeh kyun matter karta hai (socho jaise Zomato order ka data database mein save karna vs sirf temporary cart mein rakhna)
- Functions ko sahi visibility (`public`, `private`, `internal`, `external`) aur mutability (`view`, `pure`, `payable`) ke saath likhna
- Custom modifiers aur OpenZeppelin ke `Ownable` aur `AccessControl` se reusable access control banana
- Inheritance chains, interface-driven design, aur embedded vs. linked libraries
- Events emit karna aur query karna — off-chain indexing aur frontend UIs ke liye (jaise UPI transaction ka notification aana)
- `require`, `revert`, `assert`, aur gas-efficient custom errors se errors gracefully handle karna
- Barah gas optimization techniques — storage slot packing, `unchecked` arithmetic, aur `memory` ke bajaye `calldata` use karna
- Solidity ki har major vulnerability: reentrancy, integer overflow, `tx.origin` phishing, timestamp manipulation, weak randomness, unbounded loops, flash loan attacks, aur unchecked call return values
- Checks-Effects-Interactions (CEI) pattern, aur ek complete security pre-deployment checklist kaise banaayein
- Design patterns jo scale karte hain: Factory, Proxy, Commit-Reveal, Pull-over-Push
- Chaar production contracts end-to-end banaoge: ek ERC-20 token, royalties aur reveal mechanics wala ERC-721 NFT, ek DeFi staking contract, aur on-chain governance + proposal execution wala DAO
- Professional tooling: Hardhat, Ethers.js, OpenZeppelin contracts, Slither, aur Sepolia testnet pe deployment

---

## Prerequisites

Kya pehle se aana chahiye?

- Kam se kam ek curly-brace syntax wali language ka comfort ho (JavaScript, TypeScript, Java, C++, Go — inme se koi bhi chalega, saara knowledge transfer ho jaata hai)
- Blockchain kya hoti hai iska basic idea — transactions, blocks, wallets, aur public ledger ka concept
- Command line se comfortable ho npm aur Hardhat scripts chalane ke liye (yeh sirf Part 5 ke liye chahiye — pehle chaar parts poori tarah browser mein Remix ke through ho jaate hain)
- Pehle se blockchain development ka experience zaruri nahi hai

---

## Is Guide Ko Kaise Use Karo

1. **Remix mein shuru karo, Chapter 13 tak Remix mein hi raho.** Error handling tak har example browser mein [remix.ethereum.org](https://remix.ethereum.org) pe compile aur deploy ho sakta hai — koi local setup nahi chahiye. Shuru mein tooling ke chakkar mein apna momentum mat todo.

2. **Code type karo, copy-paste mat karo.** `mapping(address => uint256)` aur `emit Transfer(from, to, amount)` jaisi lines apne haath se type karne ki muscle memory chhoti baat nahi hai — isi se syntax intuitive banta hai. Especially pehle das chapters ke liye.

3. **Aage badhne se pehle quizzes zaroor do.** Har chapter ke end mein quiz questions hain jo exactly wahi misconceptions saamne laate hain jo real bugs ki wajah bante hain. Agar confidently answer nahi kar paate, toh aage badhne ke bajaye section dobara padho.

4. **Chapter 15 (Security) do baar padho.** Ek baar seekhne ke liye, aur ek baar Chapter 17 khatam karne ke baad — jab tumhare saamne tumhare khud ke likhe contracts hon. Reentrancy patterns aur CEI rules bilkul alag lagenge jab tum apna khud ka code dekh rahe hoge.

5. **Kisi bhi cheez ko "production-ready" bolne se pehle Sepolia pe deploy karo.** Chapter 17 tumhe poora Hardhat + Sepolia deployment flow sikhayega. Apne contracts ko ek real test network pe chalana — sirf Remix VM pe nahi — timing issues, gas edge cases, aur interaction bugs saamne laata hai jo local simulation kabhi nahi pakad paata.

---

Good luck, aur yaad rakho: jo bhi DeFi protocol, NFT collection, aur on-chain governance system tum aaj use karte ho, woh kisi aise insaan ne likha tha jo exactly wahin se shuru hua tha jahan tum abhi ho.

## Key Takeaways

> [!tip]
> - Solidity smart contracts likhne ki language hai — deploy hone ke baad code immutable ho jaata hai, isliye galtiyon ki cost bahut zyada hai
> - Yeh guide 5 parts mein bata hai: language foundations, data structures, OOP patterns, production-grade practices, aur real projects
> - Beginner track Remix (browser-based) mein hoti hai, advanced track Hardhat + Sepolia testnet tak jaati hai
> - Security (Chapter 15) sabse important chapter hai — kam se kam do baar padhna hai
> - End mein 4 real production contracts banaoge: ERC-20, ERC-721 NFT, Staking, aur DAO Governance

# Solana Development

Ek deep-dive series un developers ke liye jo Solana pe real applications banana chahte hain — core architecture aur account model samajhne se lekar, Anchor programs likhna, SPL tokens launch karna, NFT projects banana, aur ek complete DeFi staking protocol ship karna, sab kuch cover hoga.

Socho isko aise — jaise tum Zomato ka backend seekh rahe ho step by step: pehle samjho system kaam kaise karta hai, phir menu (data) kaise store hota hai, phir order placing (transactions) likhna seekho, aur finally poora ek restaurant-payout system (staking protocol) khud bana ke dikhao.

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

Kis order mein padhna hai? Chalo batate hain.

### Beginner — Yahan Se Start Karo
Chapter 1 se 3 tak order mein padho. Chapter 1 tumhe poora mental model deta hai ki Solana exist kyun karta hai aur Ethereum se kaise different hai. Chapter 2 mein 8 architectural innovations cover hoti hain (Proof of History, Sealevel, Gulf Stream, waghera). Chapter 3 accounts model cover karta hai — Solana programs likhne ke liye sabse important concept. Ye foundation skip mat karna, warna aage sab confusing lagega.

**Recommended order:** Chapter 1 → Chapter 2 → Chapter 3

### Intermediate — Programs Likhna
Ek baar accounts samajh aa jaaye, toh chapter 4 aur 5 pe jao. Chapter 4 tumhe native Rust programs sikhata hai scratch se: entrypoint, instruction routing, AccountInfo, security checks, CPI, aur compute units. Chapter 5 Anchor framework introduce karta hai, jo zyada tar boilerplate khud generate kar deta hai. Chapter 6 aur 7 SPL tokens aur NFTs cover karte hain — inko tum almost har Solana project mein use karoge.

**Recommended order:** Chapter 4 → Chapter 5 → Chapter 6 → Chapter 7

### Advanced — Full-Stack aur DeFi
Chapter 8 client-side development cover karta hai: wallets connect karna, TypeScript mein transactions banana, aur on-chain state padhna. Chapter 9 Solana pe DeFi patterns introduce karta hai — DEXes, AMMs, liquidity pools, aur CPI ke through composability. Chapter 10 ek complete production-style capstone hai: ek custom SPL token plus time-weighted staking program, saath mein React + Phantom wallet frontend.

**Recommended order:** Chapter 8 → Chapter 9 → Chapter 10

## Kya Seekhoge

- Solana ~65,000 theoretical TPS kaise achieve karta hai — Proof of History, parallel execution (Sealevel), aur pipelining ka use karke — aur wo honest trade-offs bhi jo iske saath aate hain
- Solana account model: programs stateless kyun hote hain, state alag accounts mein kaise rehta hai, aur rent kaise kaam karta hai
- Scratch se native Rust programs likhna: entrypoint, instruction parsing, AccountInfo validation, aur teen security commandments (owner check, signer check, key verification)
- Program Derived Addresses (PDAs) ko program-owned signers ki tarah kaise use karein — ye pattern har serious Solana protocol ke peeche hota hai
- `invoke` aur `invoke_signed` dono use karke Cross-Program Invocation (CPI), aur DeFi protocols ek dusre ke upar kaise compose hote hain
- Anchor framework ke saath build karna: macros se accounts validation, auto-generated TypeScript clients, aur IDL-based tooling
- SPL tokens create aur manage karna: mints, associated token accounts, mint authority, aur freeze authority
- Metaplex standard use karke NFTs mint aur manage karna
- `@solana/web3.js` aur Anchor ke saath client-side development: transactions banana, on-chain state padhna, aur Phantom wallet integrate karna
- DeFi fundamentals: AMM mechanics, liquidity pools, staking patterns, aur reward calculations
- End-to-end ek poora staking protocol build aur deploy karna, React frontend aur security checks wale complete Anchor program ke saath

## Prerequisites

Kya pata hona chahiye padhna shuru karne se pehle?

- **JavaScript ya TypeScript** — poori series mein client-side code TypeScript aur `@solana/web3.js` use karta hai
- **Basic Rust** — expert-level nahi chahiye, lekin ownership, enums, structs, aur pattern matching ki familiarity time bachaayegi; chapter 4 aur 5 Solana-specific Rust ko explain karte chalenge
- **Blockchain fundamentals** — tumhe pata hona chahiye wallet, private key, transaction, aur block kya hote hain; pehle se Ethereum experience helpful hai lekin zaruri nahi
- **Node.js tooling** — npm, ts-node, aur terminal se scripts run karna

## Is Guide Ko Kaise Use Karein

1. **Code padhte waqt run bhi karo.** Har chapter mein working scripts aur programs hain. Devnet environment jaldi setup kar lo (Solana CLI, Phantom wallet, `solana airdrop`) aur har example ko chalate hue test karo — concepts tabhi click karte hain jab tumko real transactions on-chain dikhte hain. Bilkul waise jaise UPI transaction ka demo dekhne se zyada, khud paisa bhejke test karne pe samajh aata hai.
2. **Accounts model skip mat karo.** Chapter 3 wo mental model hai jo baaki sab kuch unlock karta hai. Agar chapter 4-10 mein kuch samajh na aaye, toh answer almost hamesha chapter 3 mein hota hai.
3. **Anchor se pehle native Rust seekho.** Chapter 4 native programs sikhata hai Anchor introduce hone se pehle. Ye sequence intentional hai — Anchor complexity ko hide karta hai jise tumhe samajhna zaruri hai issues debug karne aur security reason karne ke liye.
4. **Security warnings ko seriously lo.** Har chapter jo account validation touch karta hai, usme real exploit patterns hote hain (missing signer checks, missing owner checks, arbitrary CPI). Ye theoretical nahi hain — inhone production programs se real funds drain kiye hain. Bilkul waise jaise agar tumhare payment gateway mein signature verify na ho, toh koi bhi fake request bhejke paisa nikaal sakta hai.
5. **Chapter 10 ko template maano.** Staking project bilkul waise structured hai jaise ek real production program hota hai: har state ke liye PDAs, har jagah checked arithmetic, ek funded vault, TypeScript tests, aur ek frontend. Ise fork karo apne khud ke projects ke starting point ke taur pe.

Kuch real banao. Solana ki speed aur fee structure aise on-chain patterns possible banate hain jo doosre chains pe economical hi nahi hain — iska fayda uthao.

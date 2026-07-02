# ⛽ Gas Optimization in Solidity

> **Chapter 14 — Professional, production-ready smart contracts likhne ke liye zaruri knowledge.**

---

## 🧭 Kya Seekhoge Is Chapter Mein

- Ethereum pe gas costs ek first-class engineering concern kyun hain
- EVM different operations ke liye gas kaise charge karta hai
- Barah (12) practical optimization techniques, before/after examples ke saath
- Storage slot packing kaise kaam karta hai (diagrams ke saath)
- Real tooling se gas usage kaise measure karein

---

## 💸 Gas Optimization Kyun Zaruri Hai?

Tumhara smart contract jo bhi instruction execute karta hai, uska **gas** lagta hai. Ye gas ETH mein pay karta hai jo function call kar raha hai. Matlab agar tumne inefficient code likha, to seedha seedha tum apne users ka **paisa** kharch karwa rahe ho.

Ye web server ki tarah nahi hai jaha ek slow endpoint sirf user ko irritate karta hai. On-chain inefficiency ka matlab hai — har transaction pe direct, real-money cost.

Socho Zomato ka checkout page slow chale — bura lagega, lekin paisa extra nahi kategaa. Lekin blockchain pe agar tumhara function inefficient hai, to har user literally zyada ETH kharch karega. Isliye din 1 se hi optimization tumhare dimaag mein hona chahiye:

| Concern | Explanation |
|---|---|
| **User cost** | Har SSTORE (storage write) hazaron gas kharch kar sakta hai. High ETH prices pe, ek badly likha function ek call mein $20–$50 tak kharch karwa sakta hai. |
| **Contract competitiveness** | DeFi protocols fees pe compete karte hain. Agar tumhara DEX Uniswap se zyada gas leta hai per swap, users Uniswap chale jayenge. |
| **Block gas limit** | Blocks ki gas cap hoti hai. Bloated functions high-activity scenarios mein fail ho sakte hain ya batch operations impossible ban sakte hain. |
| **Deployment cost** | Bada bytecode = deploy karne mein zyada gas. Ye ek baar hi pay hota hai, lekin factory patterns mein important hai. |

---

## 🔬 EVM Gas Costs Samjho

Ethereum Virtual Machine (EVM) har opcode ko ek gas cost assign karta hai. Key insight ye hai ki **saare operations equal nahi hain**. Neeche most se least expensive tak ek rough hierarchy hai:

```
SSTORE (storage write)   ~20,000 gas  ← BAHUT expensive
SLOAD  (storage read)    ~2,100 gas   ← Expensive
Memory operations        ~3 gas/word  ← Sasta
Arithmetic / logic       ~3–5 gas     ← Bahut sasta
```

### Storage Hi Bottleneck Hai

Ethereum ka persistent storage (wo key-value store jo `mapping` aur state variables ke peeche hota hai) duniya ke har full node pe store hota hai. Isme likhna expensive hai kyunki poore network ko naye state pe forever agree karna padta hai. Isi liye **gas optimization ka golden rule hai: storage reads aur writes ko minimize karo**.

Dusri taraf, memory sirf ek transaction ki duration ke liye exist karta hai aur baad mein wipe ho jaata hai. Memory pe read/write karna storage se kahin zyada sasta hai — jaise apne phone ki RAM vs cloud storage. RAM fast aur temporary, cloud storage slow lekin permanent.

---

## 🛠️ Barah (12) Optimization Techniques

### 1. Standalone Variables Ke Liye `uint256` Use Karo, Chote Types Nahi

Ye zyada beginners ko surprise karta hai. EVM native tarike se 256-bit (32-byte) slots pe operate karta hai. Jab tum ek standalone variable mein `uint8` ya `uint16` use karte ho, EVM ko bits mask karne padte hain us chote type ko simulate karne ke liye — jisse arithmetic ka gas thoda zyada lagta hai.

**Exception:** Chote types abhi bhi structs ke andar slot packing ke liye valuable hain (neeche cover kiya hai).

```solidity
// Standalone variables ke liye thoda less efficient
uint8 public counter;   // EVM ise 256 bits tak pad kar deta hai anyway

// Standalone variables ke liye preferred
uint256 public counter; // Koi masking overhead nahi
```

### 2. Struct Variables Ko Pack Karo (Slot Packing)

Har storage slot exactly **32 bytes** ka hota hai. Agar tum struct ya contract level pe variables declare karte ho, Solidity unhe sequentially slots mein pack karta hai. Ek `uint256` poora slot bhar deta hai. Lekin ek `uint128` sirf aadha bharta hai — matlab do `uint128` ek hi slot share kar sakte hain, jisse tumhara storage cost aadha ho jaata hai.

Socho slot ek Swiggy delivery bag jaisa hai jisme sirf 32kg saaman aa sakta hai. Agar tum har item ke liye alag bag bhejte ho (chahe wo 1kg ka ho), to bahut sare bags waste honge. Better hai ki chote items ek bag mein combine kar do.

```solidity
// BAD: 4 storage slots use ho rahe hain
struct UnpackedUser {
    uint8 age;          // slot 0 (31 bytes waste)
    bool active;        // slot 1 (31 bytes waste)
    uint128 balance;    // slot 2 (16 bytes waste)
    address wallet;     // slot 3 (12 bytes waste)
}

// GOOD: 2 storage slots use ho rahe hain
struct PackedUser {
    address wallet;     // slot 0: 20 bytes
    uint128 balance;    // slot 0: 16 bytes remaining → perfectly fit!

    uint8 age;          // slot 1: 1 byte
    bool active;        // slot 1: 1 byte (30 bytes remaining future fields ke liye)
}
```

**Key rule:** Order matter karta hai. Solidity left se right (struct mein top se bottom) pack karta hai. Hamesha chote types ko group karo aur bade types (`uint256`, `address`) ko boundaries pe rakho.

#### Visual: Storage Slot Packing

```
UnpackedUser (4 slots = 128 bytes storage):
┌──────────────────────────────────────────────────────────────────┐
│ Slot 0 │ age (1B) │░░░░░░░░░░░░░░░░░░░░░░ WASTED 31B ░░░░░░░░░│
├──────────────────────────────────────────────────────────────────┤
│ Slot 1 │ active (1B) │░░░░░░░░░░░░░░░░░░░░ WASTED 31B ░░░░░░░░│
├──────────────────────────────────────────────────────────────────┤
│ Slot 2 │ balance (16B) │░░░░░░░░ WASTED 16B ░░░░░░░░│
├──────────────────────────────────────────────────────────────────┤
│ Slot 3 │ wallet (20B) │░░░░░░ WASTED 12B ░░░░░░│
└──────────────────────────────────────────────────────────────────┘

PackedUser (2 slots = 64 bytes storage):
┌──────────────────────────────────────────────────────────────────┐
│ Slot 0 │ wallet (20B) │ balance (16B)                  │← FULL! │
├──────────────────────────────────────────────────────────────────┤
│ Slot 1 │ age (1B) │ active (1B) │░░░░ 30B free ░░░░░░░░░░░░░░░│
└──────────────────────────────────────────────────────────────────┘
```

Ye sabse high-impact optimization hai jo available hai. Ek packed slot read karna sirf ek SLOAD hai. Packing ke bina, wahi cheez 4 SLOADs lagegi.

> [!tip]
> Struct define karte waqt hamesha socho: "kaunse fields ek saath fit ho sakte hain 32 bytes ke andar?"

### 3. External Function Parameters Ke Liye `memory` Ki Jagah `calldata` Use Karo

Jab ek external function array ya bytes parameter leta hai, tumhare paas choice hoti hai: `memory` ya `calldata`.

- `memory`: EVM poora input memory mein copy karta hai. Us copy ka paisa tum bharte ho.
- `calldata`: Data seedha transaction input se read hota hai. Koi copy nahi, koi extra cost nahi.

```solidity
// BAD: array ko memory mein copy karta hai
function sumValues(uint256[] memory values) external pure returns (uint256 total) { }

// GOOD: seedha calldata se read karta hai, koi copy nahi
function sumValues(uint256[] calldata values) external pure returns (uint256 total) { }
```

Jab bhi tumhe function ke andar parameter modify nahi karna, `calldata` use karo. Ye ek free optimization hai.

### 4. Loops Ke Andar Storage Variables Ko Local Variable Mein Cache Karo

Jab bhi tum loop ke andar ek state variable read karte ho, ek SLOAD ka paisa lagta hai. Agar loop 100 baar chalta hai, to 100 SLOADs ka bill aata hai. Isliye pehle ek local variable mein cache kar lo.

```solidity
// BAD: arr.length har iteration mein storage se read hota hai
function badLoop(uint256[] storage arr) internal {
    for (uint256 i = 0; i < arr.length; i++) {
        // Har single iteration mein SLOAD
    }
}

// GOOD: ek SLOAD, phir stack se reads
function goodLoop(uint256[] storage arr) internal {
    uint256 length = arr.length;  // yahan ek SLOAD
    for (uint256 i = 0; i < length; i++) {
        // 'length' ko stack se read karta hai — basically free
    }
}
```

Ye rule kisi bhi state variable pe apply hota hai jise tum ek function ke andar multiple baar access karte ho.

### 5. `immutable` Aur `constant` Use Karo

Jo variables deployment ke baad kabhi change nahi hote, unhe storage bilkul use nahi karna chahiye.

- `constant`: Value compile time pe pata hoti hai. Seedha bytecode mein inline ho jaati hai. Zero SLOAD cost.
- `immutable`: Value constructor mein set hoti hai aur kabhi change nahi hoti. Ye bhi bytecode mein store hoti hai. Zero SLOAD cost.

```solidity
// Ek storage slot use karta hai — un values ke liye wasteful jo kabhi change nahi hoti
address public owner;

// Constructor mein ek baar set, uske baad zero storage cost
address public immutable owner;

// Compile time pe known, zero storage cost
uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18;
```

> [!tip]
> Agar koi variable "set once, never touched again" type ka hai — jaise owner address ya max supply — to turant `immutable` ya `constant` ka use socho.

### 6. Short-Circuit Logic (Pehle Sasta Check Lagao)

Solidity mein (aur zyada languages mein) `&&` aur `||` short-circuit karte hain: agar pehla condition result decide kar deta hai, to doosra evaluate hi nahi hota. Isliye apna sabse sasta aur most-likely-to-fail check pehle rakho.

```solidity
// BAD: msg.value 0 ho tab bhi expensive storage read pehle hota hai
function deposit() external payable {
    require(whitelist[msg.sender] && msg.value > 0);
    //      ^^^^^^^^^^^^^^^^^^^^ SLOAD pehle hota hai
}

// GOOD: sasta check (msg.value) pehle chalta hai, fail hone pe SLOAD avoid ho jaata hai
function deposit() external payable {
    require(msg.value > 0 && whitelist[msg.sender]);
    //      ^^^^^^^^^^^^ free stack check — SLOAD sirf tab jab ye pass ho
}
```

### 7. On-Chain String Operations Se Bacho

Solidity mein strings expensive hain. Ye dynamically-sized hote hain, bytes mein store hote hain, aur koi bhi manipulation (concatenation, comparison) costly hota hai. Jaha possible ho:

- Chote fixed strings ke liye `string` ki jagah `bytes32` use karo
- String formatting off-chain karo aur sirf result store karo
- State mein strings store karne ki jagah event logs use karo

```solidity
// BAD: on-chain ek variable-length string store karta hai
string public tokenName = "MyGovernanceToken";

// GOOD: bytes32 ek fixed 32-byte slot hai, koi dynamic allocation nahi
bytes32 public constant TOKEN_NAME = "MyGovernanceToken";
```

### 8. Historical Data Ke Liye Storage Ki Jagah Events Use Karo

Storage un data ke liye hai jo tumhara contract on-chain read karna chahta hai. Agar data sirf off-chain indexing ke liye chahiye (transaction history, audit trails), to event emit karo. Events transaction receipt log mein store hote hain — inka cost storage writes ka ek fraction hota hai, aur contracts inhe read nahi kar sakte, jo zyada situations mein theek hi hai.

Ye bilkul aisa hai jaise Zomato apne order history ko ek fast lookup database mein na rakh ke sirf analytics logs mein rakhe — jab zaruri ho, off-chain query kar lo.

```solidity
// BAD: history on-chain store karna extremely expensive hai
struct Transfer { address from; address to; uint256 amount; }
Transfer[] public transferHistory;

// GOOD: iski jagah ek event emit karo — sasta, off-chain indexable
event Transfer(address indexed from, address indexed to, uint256 amount);
```

### 9. Custom Errors vs. String Revert Messages

Solidity 0.8.4 se pehle, `require` ek string message leta tha. Wo string bytecode mein store hoti thi aur deployment gas kharch karti thi. Custom errors, jo 0.8.4 mein introduce hue, ek 4-byte selector use karte hain — jo bahut chota aur sasta hai.

```solidity
// BAD: string bytecode mein baked hai, deploy aur revert dono mein gas kharch karti hai
require(msg.sender == owner, "Ownable: caller is not the owner");

// GOOD: 4-byte selector, minimal bytecode, sasta revert
error NotOwner();
if (msg.sender != owner) revert NotOwner();
```

Custom errors parameters bhi carry kar sakte hain (richer debugging ke liye), bina extra deployment cost ke:

```solidity
error InsufficientBalance(uint256 requested, uint256 available);
if (amount > balance) revert InsufficientBalance(amount, balance);
```

### 10. Safe Arithmetic Ke Liye `unchecked {}` Use Karo (Solidity 0.8+)

Solidity 0.8 ne automatic overflow/underflow protection add kiya. Ab har arithmetic operation ka ek implicit bounds check hota hai. Ye safety ke liye great hai, lekin thoda extra gas kharch karta hai. Jab tum mathematically prove kar sakte ho ki overflow impossible hai, to `unchecked` se ye check skip kar sakte ho.

```solidity
// Standard loop: i++ har iteration mein overflow check karta hai
for (uint256 i = 0; i < length; i++) { }

// Unchecked loop: i pe overflow impossible hai kyunki i < length hamesha
for (uint256 i = 0; i < length; ) {
    // ... loop body ...
    unchecked { ++i; }  // ++i, i++ se thoda sasta bhi hota hai
}
```

`unchecked` sirf tab use karo jab tumhe pakka pata ho ki operation overflow nahi kar sakta. Kabhi bhi user-supplied values pe bina validation ke use mat karo.

> [!warning]
> `unchecked` ek scalpel hai, hathoda nahi. Galat jagah use kiya to silent overflow bugs aa sakte hain — jo debug karna nightmare hota hai.

### 11. Redundant SSTOREs Se Bacho

Storage mein likhna sabse expensive operation hai. Agar value already same hai, to kabhi bhi storage mein dubara mat likho.

```solidity
// BAD: value already 'true' ho tab bhi storage mein likhta hai
function pause() external onlyOwner {
    paused = true;  // already paused ho tab bhi ~20,000 gas lagta hai
}

// GOOD: pehle check karo, agar zarurat nahi to write skip karo
function pause() external onlyOwner {
    if (!paused) paused = true;  // SLOAD (2,100) + conditional SSTORE
}
```

Wo patterns bhi avoid karo jaha ek temporary value likhi jaati hai aur phir same transaction mein overwrite ho jaati hai.

### 12. Lookups Ke Liye Arrays Ki Jagah Mappings Use Karo

Agar tumhe check karna hai "ye value exist karti hai kya?" ya "is key ki value kya hai?", to mapping almost hamesha array se sasta padta hai.

```solidity
// BAD: O(n) scan of storage — large arrays ke liye extremely expensive
address[] public admins;
function isAdmin(address user) public view returns (bool) {
    for (uint256 i = 0; i < admins.length; i++) {
        if (admins[i] == user) return true;
    }
    return false;
}

// GOOD: O(1) lookup — sirf ek SLOAD
mapping(address => bool) public isAdmin;
```

Arrays tab bhi appropriate hain jab tumhe ordered, iterable data chahiye. Lekin unhe kabhi lookup table ki tarah use mat karo.

---

## 🔧 Full Before / After Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ============================================================
// BAD — unoptimized
// ============================================================
contract UnoptimizedToken {
    // Ye har ek pura 32-byte slot le raha hai - wasteful!
    uint8 public decimals = 18;      // slot 0 (31 bytes waste)
    bool public paused = false;       // slot 1 (31 bytes waste)
    uint128 public maxSupply;         // slot 2 (16 bytes waste)
    address public owner;             // slot 3 (12 bytes waste)

    function addToArray(uint256[] storage arr, uint256 value) internal {
        for (uint256 i = 0; i < arr.length; i++) {
            // BAD: arr.length har iteration mein storage se read hota hai!
            if (arr[i] == value) {
                return;
            }
        }
        arr.push(value);
    }
}

// ============================================================
// GOOD — optimized
// ============================================================
contract OptimizedToken {
    // 4 ki jagah 2 slots mein packed!
    address public owner;             // slot 0: 20 bytes
    uint128 public maxSupply;         // slot 0: 16 bytes remaining → fit!

    uint8 public decimals = 18;       // slot 1: 1 byte
    bool public paused = false;       // slot 1: 1 byte
    // (slot 1 mein future vars ke liye 30 bytes remaining)

    // String message ki jagah custom error
    error AlreadyExists();

    function addToArrayOptimized(uint256[] storage arr, uint256 value) internal {
        uint256 length = arr.length;  // GOOD: length cache karo — ek SLOAD
        for (uint256 i = 0; i < length;) {
            if (arr[i] == value) revert AlreadyExists();
            unchecked { ++i; }        // GOOD: overflow check skip karo (yaha safe hai)
        }
        arr.push(value);
    }

    // memory ki jagah calldata — koi copy cost nahi
    function sumValues(uint256[] calldata values) external pure returns (uint256 total) {
        uint256 len = values.length;
        for (uint256 i; i < len;) {
            unchecked {
                total += values[i];
                ++i;
            }
        }
    }
}
```

---

## 📊 Gas Cost Comparison Table

| Technique | Before (approx.) | After (approx.) | Savings |
|---|---|---|---|
| Struct slot packing (4 vars) | 4 × 20,000 = 80,000 gas | 2 × 20,000 = 40,000 gas | ~50% |
| Loop: storage length vs cached | 100 × 2,100 = 210,000 gas | 1 × 2,100 = 2,100 gas | ~99% |
| `calldata` vs `memory` (100-item array) | ~4,000 gas | ~1,200 gas | ~70% |
| `unchecked` increment | ~22 gas/iter | ~5 gas/iter | ~77% |
| Custom error vs string revert | ~1,500 gas | ~200 gas | ~87% |
| `constant` vs state variable read | 2,100 gas (SLOAD) | 3 gas (stack) | ~99% |
| Mapping lookup vs array scan (1000 items) | ~2,100,000 gas | ~2,100 gas | ~99.9% |

> [!info]
> Gas costs EVM version aur optimizer settings ke hisaab se vary karte hain. Ye figures illustrative approximations hain, Berlin/London EVM opcodes ke hisaab se.

---

## ⚙️ Compiler Optimizer Settings

Solidity compiler ka ek built-in optimizer hota hai jo gas costs significantly reduce kar sakta hai. Ise apne `hardhat.config.js` ya `foundry.toml` mein configure karo.

### Hardhat

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200   // is number of calls ke liye optimize karo har function ka
      }
    }
  }
};
```

`runs` parameter ek tradeoff hai:
- **Low `runs` (jaise 1):** Chote bytecode size ke liye optimize karta hai. Achha hai agar tum bahut instances deploy karte ho aur har ek rarely call hota hai.
- **High `runs` (jaise 1000000):** Execution gas ke liye optimize karta hai. Frequently called contracts (jaise ek DEX) ke liye achha hai.
- **200** conventional default hai, dono ko balance karta hai.

### Foundry

```toml
# foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200
```

---

## 📏 Gas Measure Karna: Tooling

Bina measure kiye optimizations likhna sirf guesswork hai. In tools se real numbers nikalo.

### Hardhat Gas Reporter

Plugin install karo:

```bash
npm install --save-dev hardhat-gas-reporter
```

Apne config mein add karo:

```javascript
require("hardhat-gas-reporter");

module.exports = {
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: "YOUR_API_KEY"  // optional: USD cost dikhata hai
  }
};
```

Apne tests run karo aur ek table milega:

```
·-----------------------------|---------------------------|-------------|-----------------------------·
|  Contract                   ·  Method                   ·  Gas        ·  Cost (USD)                │
··························---|···························|·············|·····························
|  OptimizedToken             ·  addToArrayOptimized      ·      45,200 ·            $0.11            │
|  UnoptimizedToken           ·  addToArray               ·     213,400 ·            $0.53            │
·-----------------------------|---------------------------|-------------|-----------------------------·
```

### Foundry Gas Snapshots

Foundry mein built-in gas tracking hoti hai. Run karo:

```bash
forge snapshot
```

Ye ek `.gas-snapshot` file banata hai. Changes ke baad dubara run karo aur compare karo:

```bash
forge snapshot --diff
```

Example diff output:

```
test_addToArray()           gas: 213400 (-167800) [-44%]
test_sumValues()            gas:  12300  (-8100)  [-40%]
```

Ye workflow — code likho, snapshot lo, optimize karo, diff dekho — gas regressions track karne ka professional tarika hai.

---

## 💡 Key Takeaways

- **Storage hi dushman hai.** Har SLOAD ka cost ~2,100 gas, har SSTORE ka ~20,000. Dono ko minimize karo.
- **Apne structs pack karo.** Fields ko reorder karke 32-byte slots fill karna storage costs ko 50–75% tak kaat sakta hai.
- **Loops ke andar storage reads cache karo.** Loop ke andar `arr.length` ko storage se read karna beginners ki sabse common aur costly mistake hai.
- **`calldata` free hai.** Kisi bhi external function parameter ke liye use karo jo tum modify nahi kar rahe.
- **`constant` aur `immutable` SLOADs poori tarah eliminate karte hain.** Har us variable ke liye use karo jo change nahi hona chahiye.
- **Custom errors string revert messages se sasta aur zyada expressive hote hain.**
- **Real tooling se measure karo.** Kabhi blindly optimize mat karo — Hardhat Gas Reporter ya Foundry snapshots se confirm karo ki tumhare changes actually kaam kar rahe hain.
- **`unchecked` ek scalpel hai, hathoda nahi.** Sirf usi arithmetic pe apply karo jise tum mathematically safe prove kar sakte ho.

---

## ❓ Quiz

Aage badhne se pehle apni understanding test karo.

**Question 1**

Tumhare paas ye struct hai. Ye kitne storage slots consume karta hai, aur tum ise kaise optimize karoge?

```solidity
struct Config {
    bool featureEnabled;   // 1 byte
    uint256 maxAmount;     // 32 bytes
    address feeRecipient;  // 20 bytes
    uint8 version;         // 1 byte
}
```

<details>
<summary>Answer</summary>

Jaisa likha hai: **3 slots**.
- Slot 0: `featureEnabled` (1 byte) + 31 bytes waste
- Slot 1: `maxAmount` (32 bytes) — pura slot
- Slot 2: `feeRecipient` (20 bytes) + `version` (1 byte) = 21 bytes, 11 bytes waste

Chote types ko group karke **2 slots** mein optimize kiya:

```solidity
struct Config {
    address feeRecipient;  // slot 0: 20 bytes
    uint8 version;         // slot 0: 1 byte  } 21 bytes used
    bool featureEnabled;   // slot 0: 1 byte  } slot 0 mein
    // slot 0 mein 10 bytes free
    uint256 maxAmount;     // slot 1: 32 bytes — pura slot
}
```

</details>

---

**Question 2**

Is function mein kya galat hai, aur tum ise kaise fix karoge?

```solidity
function processAll(uint256[] storage items) internal {
    for (uint256 i = 0; i < items.length; i++) {
        process(items[i]);
    }
}
```

<details>
<summary>Answer</summary>

Do issues hain:

1. `items.length` har loop iteration mein storage se read hota hai — har baar ek SLOAD ka cost lagta hai.
2. `i++` mein overflow check hota hai (Solidity 0.8+ mein implicit) — jo `items.length` se bounded loop counter ke liye unnecessary hai.

Fixed:

```solidity
function processAll(uint256[] storage items) internal {
    uint256 len = items.length;  // ek SLOAD, phir stack pe cached
    for (uint256 i = 0; i < len;) {
        process(items[i]);
        unchecked { ++i; }  // safe: i < len overflow nahi hone deta
    }
}
```

</details>

---

**Question 3**

Tumhara contract protocol version store karta hai, jo deployment ke time set hota hai aur kabhi change nahi hota. Abhi tumhare paas `uint256 public version;` hai jo constructor mein set hota hai. Ise kya change karoge, aur kyun?

<details>
<summary>Answer</summary>

Ise `uint256 public immutable version;` mein change karo.

Kyunki `immutable` variables deployment time pe contract bytecode mein inline ho jaate hain. Inhe read karna ~3 gas (ek stack read) lagta hai, ~2,100 gas (ek SLOAD) ki jagah. Chunki value constructor chalne ke baad kabhi change nahi hoti, isliye storage slot occupy karne ki koi zarurat nahi.

Agar version compile time pe pata hota (jaise hamesha `1`), to tum `constant` bhi use kar sakte the:

```solidity
uint256 public constant VERSION = 1;
```

`constant` aur bhi sasta hai: ye literally compile time pe substitute ho jaata hai, isliye runtime cost zero hai.

</details>

---

*Agla Chapter: Security Patterns and Common Vulnerabilities →*

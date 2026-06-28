# ⛽ Gas Optimization in Solidity

> **Chapter 14 — Essential knowledge for writing professional, production-ready smart contracts.**

---

## 🧭 What You'll Learn

- Why gas costs are a first-class engineering concern on Ethereum
- How the EVM charges gas for different operations
- Twelve practical optimization techniques with before/after examples
- How storage slot packing works (with diagrams)
- How to measure gas usage with real tooling

---

## 💸 Why Gas Optimization Matters

Every instruction your smart contract executes costs **gas**. Gas is paid in ETH by whoever calls the function. When you write inefficient code on Ethereum, you are literally **making your users spend more money**.

This is not like optimizing a web server where a slow endpoint just annoys the user. On-chain inefficiency has a direct, real-money cost attached to every transaction.

Here is why optimization should be on your mind from day one:

| Concern | Explanation |
|---|---|
| **User cost** | Every SSTORE (storage write) can cost thousands of gas. At high ETH prices, a poorly written function can cost $20–$50 per call. |
| **Contract competitiveness** | DeFi protocols compete on fees. If your DEX costs more gas per swap than Uniswap, users will go to Uniswap. |
| **Block gas limit** | Blocks have a gas cap. Bloated functions may fail in high-activity scenarios or make batch operations impossible. |
| **Deployment cost** | Larger bytecode = more gas to deploy. This is paid once, but matters for factory patterns. |

---

## 🔬 Understanding EVM Gas Costs

The Ethereum Virtual Machine (EVM) assigns a gas cost to every opcode. The key insight is that **not all operations are equal**. Here is a rough hierarchy from most to least expensive:

```
SSTORE (storage write)   ~20,000 gas  ← VERY expensive
SLOAD  (storage read)    ~2,100 gas   ← Expensive
Memory operations        ~3 gas/word  ← Cheap
Arithmetic / logic       ~3–5 gas     ← Very cheap
```

### Storage is the Bottleneck

Ethereum's persistent storage (the key-value store behind `mapping` and state variables) is stored on every full node on the planet. Writing to it is expensive because the network must agree on the new state forever. This is why **the golden rule of gas optimization is: minimize storage reads and writes**.

Memory, on the other hand, exists only for the duration of a single transaction and is wiped afterward. Reading and writing to memory is orders of magnitude cheaper than touching storage.

---

## 🛠️ Twelve Optimization Techniques

### 1. Use `uint256` Over Smaller Integer Types

This surprises most beginners. The EVM operates on 256-bit (32-byte) slots natively. When you use a `uint8` or `uint16` in a standalone variable, the EVM must mask bits to simulate the smaller type — which costs slightly more gas for arithmetic.

**Exception:** Smaller types are still valuable inside structs for slot packing (covered below).

```solidity
// Slightly less efficient for standalone variables
uint8 public counter;   // EVM pads this to 256 bits anyway

// Preferred for standalone variables
uint256 public counter; // No masking overhead
```

### 2. Pack Struct Variables (Slot Packing)

Each storage slot is exactly **32 bytes**. If you declare variables in a struct or at contract level, Solidity packs them sequentially into slots. A `uint256` fills an entire slot. But a `uint128` only fills half — meaning two `uint128`s can share one slot, cutting your storage cost in half.

```solidity
// BAD: 4 storage slots used
struct UnpackedUser {
    uint8 age;          // slot 0 (31 bytes wasted)
    bool active;        // slot 1 (31 bytes wasted)
    uint128 balance;    // slot 2 (16 bytes wasted)
    address wallet;     // slot 3 (12 bytes wasted)
}

// GOOD: 2 storage slots used
struct PackedUser {
    address wallet;     // slot 0: 20 bytes
    uint128 balance;    // slot 0: 16 bytes remaining → fits perfectly!

    uint8 age;          // slot 1: 1 byte
    bool active;        // slot 1: 1 byte (30 bytes remaining for future fields)
}
```

**Key rule:** Order matters. Solidity packs from left to right (top to bottom in a struct). Always group small types together and place larger types (`uint256`, `address`) at boundaries.

#### Visual: Storage Slot Packing

```
UnpackedUser (4 slots = 128 bytes of storage):
┌──────────────────────────────────────────────────────────────────┐
│ Slot 0 │ age (1B) │░░░░░░░░░░░░░░░░░░░░░░ WASTED 31B ░░░░░░░░░│
├──────────────────────────────────────────────────────────────────┤
│ Slot 1 │ active (1B) │░░░░░░░░░░░░░░░░░░░░ WASTED 31B ░░░░░░░░│
├──────────────────────────────────────────────────────────────────┤
│ Slot 2 │ balance (16B) │░░░░░░░░ WASTED 16B ░░░░░░░░│
├──────────────────────────────────────────────────────────────────┤
│ Slot 3 │ wallet (20B) │░░░░░░ WASTED 12B ░░░░░░│
└──────────────────────────────────────────────────────────────────┘

PackedUser (2 slots = 64 bytes of storage):
┌──────────────────────────────────────────────────────────────────┐
│ Slot 0 │ wallet (20B) │ balance (16B)                  │← FULL! │
├──────────────────────────────────────────────────────────────────┤
│ Slot 1 │ age (1B) │ active (1B) │░░░░ 30B free ░░░░░░░░░░░░░░░│
└──────────────────────────────────────────────────────────────────┘
```

This is one of the highest-impact optimizations available. Reading a packed slot is one SLOAD. Without packing, that is four SLOADs.

### 3. Use `calldata` Instead of `memory` for External Function Parameters

When an external function receives an array or bytes parameter, you have a choice: `memory` or `calldata`.

- `memory`: The EVM copies the entire input into memory. You pay for the copy.
- `calldata`: The data is read directly from the transaction input. No copy, no extra cost.

```solidity
// BAD: copies the array into memory
function sumValues(uint256[] memory values) external pure returns (uint256 total) { }

// GOOD: reads directly from calldata, no copy
function sumValues(uint256[] calldata values) external pure returns (uint256 total) { }
```

Use `calldata` any time you do not need to modify the parameter inside the function. It is a free optimization.

### 4. Cache Storage Variables in Local Variables Inside Loops

Every time you read a state variable inside a loop, you pay an SLOAD. If the loop runs 100 times, you pay 100 SLOADs. Cache it once in a local variable first.

```solidity
// BAD: arr.length is read from storage on every iteration
function badLoop(uint256[] storage arr) internal {
    for (uint256 i = 0; i < arr.length; i++) {
        // SLOAD every single iteration
    }
}

// GOOD: one SLOAD, then reads from the stack
function goodLoop(uint256[] storage arr) internal {
    uint256 length = arr.length;  // one SLOAD here
    for (uint256 i = 0; i < length; i++) {
        // reads 'length' from the stack — essentially free
    }
}
```

This also applies to any state variable you access multiple times in a single function.

### 5. Use `immutable` and `constant`

Variables that never change after deployment should not use storage at all.

- `constant`: Value is known at compile time. Inlined directly into bytecode. Zero SLOAD cost.
- `immutable`: Value is set in the constructor and never changes. Also stored in bytecode. Zero SLOAD cost.

```solidity
// Uses a storage slot — wasteful for values that never change
address public owner;

// Set once in constructor, zero storage cost thereafter
address public immutable owner;

// Known at compile time, zero storage cost
uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18;
```

### 6. Short-Circuit Logic (Put Cheap Checks First)

In Solidity (and most languages), `&&` and `||` short-circuit: if the first condition determines the result, the second is never evaluated. Place your cheapest and most likely to fail checks first.

```solidity
// BAD: expensive storage read happens even if msg.value is 0
function deposit() external payable {
    require(whitelist[msg.sender] && msg.value > 0);
    //      ^^^^^^^^^^^^^^^^^^^^ SLOAD happens first
}

// GOOD: cheap check (msg.value) runs first, SLOAD avoided if it fails
function deposit() external payable {
    require(msg.value > 0 && whitelist[msg.sender]);
    //      ^^^^^^^^^^^^ free stack check — SLOAD only if this passes
}
```

### 7. Avoid On-Chain String Operations

Strings in Solidity are expensive. They are dynamically-sized, stored as bytes, and any manipulation (concatenation, comparison) is costly. Where possible:

- Use `bytes32` instead of `string` for short fixed strings
- Do string formatting off-chain and only store the result
- Use event logs rather than storing strings in state

```solidity
// BAD: stores a variable-length string on-chain
string public tokenName = "MyGovernanceToken";

// GOOD: bytes32 is a fixed 32-byte slot, no dynamic allocation
bytes32 public constant TOKEN_NAME = "MyGovernanceToken";
```

### 8. Use Events Instead of Storage for Historical Data

Storage is for data your contract needs to read on-chain. If you only need data for off-chain indexing (transaction history, audit trails), emit an event instead. Events are stored in the transaction receipt log — they cost a fraction of storage writes and cannot be read by contracts, which is usually fine.

```solidity
// BAD: storing history on-chain is extremely expensive
struct Transfer { address from; address to; uint256 amount; }
Transfer[] public transferHistory;

// GOOD: emit an event instead — cheap, indexable off-chain
event Transfer(address indexed from, address indexed to, uint256 amount);
```

### 9. Custom Errors vs. String Revert Messages

Before Solidity 0.8.4, `require` took a string message. That string is stored in the bytecode and costs deployment gas. Custom errors, introduced in 0.8.4, use a 4-byte selector — far smaller and cheaper.

```solidity
// BAD: string is baked into bytecode, costs gas to deploy and revert
require(msg.sender == owner, "Ownable: caller is not the owner");

// GOOD: 4-byte selector, minimal bytecode, cheaper revert
error NotOwner();
if (msg.sender != owner) revert NotOwner();
```

Custom errors can also carry parameters (for richer debugging) at no extra deployment cost:

```solidity
error InsufficientBalance(uint256 requested, uint256 available);
if (amount > balance) revert InsufficientBalance(amount, balance);
```

### 10. Use `unchecked {}` for Safe Arithmetic (Solidity 0.8+)

Solidity 0.8 added automatic overflow/underflow protection. Every arithmetic operation now has an implicit bounds check. This is great for safety but costs a small amount of extra gas. When you can mathematically prove overflow is impossible, you can skip the check with `unchecked`.

```solidity
// Standard loop: i++ has an overflow check each iteration
for (uint256 i = 0; i < length; i++) { }

// Unchecked loop: overflow on i is impossible since i < length
for (uint256 i = 0; i < length; ) {
    // ... loop body ...
    unchecked { ++i; }  // ++i is also slightly cheaper than i++
}
```

Only use `unchecked` when you are certain the operation cannot overflow. Never use it on user-supplied values without validation.

### 11. Avoid Redundant SSTOREs

Writing to storage is the most expensive operation. Never write to storage if the value has not changed.

```solidity
// BAD: writes to storage even if the value is already 'true'
function pause() external onlyOwner {
    paused = true;  // costs ~20,000 gas even if already paused
}

// GOOD: check first, skip the write if unnecessary
function pause() external onlyOwner {
    if (!paused) paused = true;  // SLOAD (2,100) + conditional SSTORE
}
```

Also avoid patterns that write a temporary value and then overwrite it in the same transaction.

### 12. Use Mappings Over Arrays for Lookups

If you need to check "does this value exist?" or "what is the value for this key?", a mapping is almost always cheaper than iterating over an array.

```solidity
// BAD: O(n) scan of storage — extremely expensive for large arrays
address[] public admins;
function isAdmin(address user) public view returns (bool) {
    for (uint256 i = 0; i < admins.length; i++) {
        if (admins[i] == user) return true;
    }
    return false;
}

// GOOD: O(1) lookup — one SLOAD
mapping(address => bool) public isAdmin;
```

Arrays are still appropriate when you need ordered, iterable data. But never use them as a lookup table.

---

## 🔧 Full Before / After Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ============================================================
// BAD — unoptimized
// ============================================================
contract UnoptimizedToken {
    // These each take a full 32-byte slot - wasteful!
    uint8 public decimals = 18;      // slot 0 (wastes 31 bytes)
    bool public paused = false;       // slot 1 (wastes 31 bytes)
    uint128 public maxSupply;         // slot 2 (wastes 16 bytes)
    address public owner;             // slot 3 (wastes 12 bytes)

    function addToArray(uint256[] storage arr, uint256 value) internal {
        for (uint256 i = 0; i < arr.length; i++) {
            // BAD: reads arr.length from storage on every iteration!
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
    // Packed into 2 slots instead of 4!
    address public owner;             // slot 0: 20 bytes
    uint128 public maxSupply;         // slot 0: 16 bytes remaining → fits!

    uint8 public decimals = 18;       // slot 1: 1 byte
    bool public paused = false;       // slot 1: 1 byte
    // (30 bytes remaining in slot 1 for future vars)

    // Custom error instead of string message
    error AlreadyExists();

    function addToArrayOptimized(uint256[] storage arr, uint256 value) internal {
        uint256 length = arr.length;  // GOOD: cache length — one SLOAD
        for (uint256 i = 0; i < length;) {
            if (arr[i] == value) revert AlreadyExists();
            unchecked { ++i; }        // GOOD: skip overflow check (safe here)
        }
        arr.push(value);
    }

    // calldata instead of memory — no copy cost
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

> Note: Gas costs vary by EVM version and optimizer settings. These figures are illustrative approximations based on Berlin/London EVM opcodes.

---

## ⚙️ Compiler Optimizer Settings

The Solidity compiler has a built-in optimizer that can significantly reduce gas costs. Configure it in your `hardhat.config.js` or `foundry.toml`.

### Hardhat

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200   // optimize for this many calls to each function
      }
    }
  }
};
```

The `runs` parameter is a tradeoff:
- **Low `runs` (e.g., 1):** Optimize for small bytecode size. Good if you deploy many instances and each is called rarely.
- **High `runs` (e.g., 1000000):** Optimize for execution gas. Good for frequently called contracts (like a DEX).
- **200** is the conventional default, balancing both.

### Foundry

```toml
# foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200
```

---

## 📏 Measuring Gas: Tooling

Writing optimizations without measuring is guesswork. Use these tools to get real numbers.

### Hardhat Gas Reporter

Install the plugin:

```bash
npm install --save-dev hardhat-gas-reporter
```

Add to your config:

```javascript
require("hardhat-gas-reporter");

module.exports = {
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: "YOUR_API_KEY"  // optional: shows USD cost
  }
};
```

Run your tests and get a table like:

```
·-----------------------------|---------------------------|-------------|-----------------------------·
|  Contract                   ·  Method                   ·  Gas        ·  Cost (USD)                │
··························---|···························|·············|·····························
|  OptimizedToken             ·  addToArrayOptimized      ·      45,200 ·            $0.11            │
|  UnoptimizedToken           ·  addToArray               ·     213,400 ·            $0.53            │
·-----------------------------|---------------------------|-------------|-----------------------------·
```

### Foundry Gas Snapshots

Foundry has built-in gas tracking. Run:

```bash
forge snapshot
```

This creates a `.gas-snapshot` file. Run it again after changes and compare:

```bash
forge snapshot --diff
```

Example diff output:

```
test_addToArray()           gas: 213400 (-167800) [-44%]
test_sumValues()            gas:  12300  (-8100)  [-40%]
```

This workflow — write code, snapshot, optimize, diff — is the professional way to track gas regressions.

---

## 💡 Key Takeaways

- **Storage is the enemy.** Every SLOAD costs ~2,100 gas. Every SSTORE costs ~20,000. Minimize both.
- **Pack your structs.** Reordering fields to fill 32-byte slots can cut storage costs by 50–75%.
- **Cache storage reads in loops.** Reading `arr.length` from storage inside a loop is one of the most common and costly beginner mistakes.
- **`calldata` is free.** Use it for any external function parameter you do not modify.
- **`constant` and `immutable` eliminate SLOADs entirely.** Use them for every variable that does not need to change.
- **Custom errors are both cheaper and more expressive** than string revert messages.
- **Measure with real tooling.** Never optimize blindly — use Hardhat Gas Reporter or Foundry snapshots to confirm your changes actually help.
- **`unchecked` is a scalpel, not a hammer.** Only apply it to arithmetic you can mathematically verify is safe.

---

## ❓ Quiz

Test your understanding before moving on.

**Question 1**

You have the following struct. How many storage slots does it consume, and how would you optimize it?

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

As written: **3 slots**.
- Slot 0: `featureEnabled` (1 byte) + 31 bytes wasted
- Slot 1: `maxAmount` (32 bytes) — full slot
- Slot 2: `feeRecipient` (20 bytes) + `version` (1 byte) = 21 bytes, 11 bytes wasted

Optimized to **2 slots** by grouping small types:

```solidity
struct Config {
    address feeRecipient;  // slot 0: 20 bytes
    uint8 version;         // slot 0: 1 byte  } 21 bytes used
    bool featureEnabled;   // slot 0: 1 byte  } in slot 0
    // 10 bytes free in slot 0
    uint256 maxAmount;     // slot 1: 32 bytes — full slot
}
```

</details>

---

**Question 2**

What is wrong with this function, and how would you fix it?

```solidity
function processAll(uint256[] storage items) internal {
    for (uint256 i = 0; i < items.length; i++) {
        process(items[i]);
    }
}
```

<details>
<summary>Answer</summary>

Two issues:

1. `items.length` is read from storage on every loop iteration — costs an SLOAD each time.
2. `i++` has an overflow check (implicit in Solidity 0.8+) — unnecessary for a loop counter bounded by `items.length`.

Fixed:

```solidity
function processAll(uint256[] storage items) internal {
    uint256 len = items.length;  // one SLOAD, then cached on the stack
    for (uint256 i = 0; i < len;) {
        process(items[i]);
        unchecked { ++i; }  // safe: i < len ensures no overflow
    }
}
```

</details>

---

**Question 3**

Your contract stores the protocol version, which is set at deployment and never changes. You currently have `uint256 public version;` set in the constructor. What should you change it to, and why?

<details>
<summary>Answer</summary>

Change it to `uint256 public immutable version;`.

Because `immutable` variables are inlined into the contract bytecode at deployment time. Reading them costs ~3 gas (a stack read) instead of ~2,100 gas (an SLOAD). Since the value never changes after the constructor runs, there is no reason to occupy a storage slot.

If the version were known at compile time (e.g., always `1`), you could also use `constant`:

```solidity
uint256 public constant VERSION = 1;
```

`constant` is even cheaper: it is literally substituted at compile time, so there is zero runtime cost.

</details>

---

*Next Chapter: Security Patterns and Common Vulnerabilities →*

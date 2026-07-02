# 🔧 Functions in Solidity

> **Chapter 4** | Solidity for Smart Contract Developers
> Difficulty: Beginner | Estimated reading time: 20–25 minutes

---

## 📖 Introduction

Functions kisi bhi smart contract ki backbone hoti hain. Yeh define karte hain ki tumhara contract *kya kar sakta hai* — tokens transfer karna ho, interest calculate karna ho, ya NFTs mint karni ho. JavaScript ya Python ke functions se Solidity ke functions thode alag hain — inke saath extra metadata bhi aata hai jo Ethereum Virtual Machine (EVM) ko chahiye hota hai: visibility rules, state mutation permissions, aur ETH handle karne ki capability.

Is chapter ke end tak tum:
- Full Solidity syntax use karke functions likh paoge
- Sahi visibility aur mutability modifier choose kar paoge
- Function ke andar ETH handle kar paoge
- `constructor`, `receive`, aur `fallback` jaise special functions samajh paoge
- Jaan paoge function selector kya hota hai aur yeh kyun important hai

---

## 1. 🧱 Function Syntax

Har Solidity function is skeleton ko follow karta hai:

```solidity
function functionName(parameterTypes parameterNames)
    visibility
    mutability
    returns (returnTypes)
{
    // body
}
```

Yeh raha ek minimal working example jisme sab pieces ek saath dikhte hain:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FunctionDemo {
    uint256 private balance;

    constructor(uint256 _initialBalance) {
        balance = _initialBalance;
    }

    function deposit() public payable {
        balance += msg.value;
    }

    receive() external payable {
        balance += msg.value;
    }

    function getBalance() public view returns (uint256) {
        return balance;
    }

    function calculate(uint256 a, uint256 b)
        public
        pure
        returns (uint256 sum, uint256 product)
    {
        sum = a + b;
        product = a * b;
    }
}
```

Har keyword yahan soch samajh ke daala gaya hai. Chalo ek ek karke sabko samajhte hain.

---

## 2. 👁️ Visibility Modifiers

Visibility control karti hai *kaun* function ko call kar sakta hai. Iske chaar options hote hain.

### 2.1 `public`

Koi bhi ise call kar sakta hai — external accounts (EOAs), doosre contracts, ya khud yeh contract bhi.

```solidity
contract Token {
    uint256 public totalSupply = 1_000_000;

    // Readable from outside AND callable from inside
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
}
```

> Note: Jab tum kisi *state variable* ko `public` mark karte ho, Solidity automatically uske liye ek free getter function bana deta hai. `uint256 public totalSupply` likhna waise hi hai jaise tum `function totalSupply() external view returns (uint256)` bhi likh rahe ho.

### 2.2 `private`

Sirf wahi contract ise call kar sakta hai jisme yeh define hua hai. Yahan tak ki child contracts jo inherit karte hain woh bhi nahi.

```solidity
contract Vault {
    uint256 private secretPin = 1234;

    // Only this contract can call _checkPin
    function _checkPin(uint256 pin) private view returns (bool) {
        return pin == secretPin;
    }

    function unlock(uint256 pin) public view returns (string memory) {
        if (_checkPin(pin)) return "Access granted";
        return "Access denied";
    }
}
```

`private` use karo un internal helper logic ke liye jo kabhi bhi expose ya override nahi hone chahiye.

### 2.3 `internal`

Contract khud aur uske saare inheriting contracts ise call kar sakte hain. State variables ke liye yeh default visibility hoti hai.

```solidity
contract Animal {
    string internal species;

    function _setSpecies(string memory _species) internal {
        species = _species;
    }
}

contract Dog is Animal {
    constructor() {
        _setSpecies("Canis lupus familiaris"); // OK — Dog inherits Animal
    }

    function getSpecies() public view returns (string memory) {
        return species; // also accessible because species is internal
    }
}
```

`internal` use karo us logic ke liye jo tum chahte ho child contracts reuse karein, par public expose na ho.

### 2.4 `external`

Sirf contract ke *bahar se* hi call kiya ja sakta hai. Andar se direct call nahi kar sakte — uske liye `this.functionName()` use karna padega, jo extra gas kharch karta hai.

```solidity
contract Oracle {
    uint256 private price;

    // Only external callers (other contracts or wallets) can call this
    function updatePrice(uint256 _price) external {
        price = _price;
    }

    function getPrice() external view returns (uint256) {
        return price;
    }
}
```

`external` functions `public` se thode zyada gas-efficient hote hain jab argument bade arrays ho, kyunki unke arguments `memory` mein copy hone ke bajaye `calldata` mein hi reh jaate hain.

### Visibility Quick-Reference Table

Socho ye Swiggy ke access levels jaise hain — customer, delivery partner, restaurant, aur internal Swiggy team ka apna access alag alag hota hai.

| Visibility | Same Contract | Derived Contract | Other Contracts | External Wallets |
|------------|:-------------:|:----------------:|:---------------:|:----------------:|
| `public`   | Yes           | Yes              | Yes             | Yes              |
| `private`  | Yes           | No               | No              | No               |
| `internal` | Yes           | Yes              | No              | No               |
| `external` | No*           | No*              | Yes             | Yes              |

*Internally `this.fn()` se call ho sakta hai — par isme extra gas lagta hai.

---

## 3. ⚡ State Mutability Modifiers

Mutability control karti hai ki function blockchain state ke saath *kya* kar sakta hai.

### 3.1 Default (koi keyword nahi)

Jis function pe koi mutability modifier nahi hoti, woh state ko *read aur write* dono kar sakta hai. Aise transactions gas kharch karte hain.

```solidity
contract Counter {
    uint256 public count;

    // Reads and writes state — costs gas
    function increment() public {
        count += 1;
    }
}
```

### 3.2 `view`

Yeh promise karta hai ki function sirf state *read* karega, kabhi modify nahi karega. Agar tum `view` function ko externally call karo (off-chain, jaise ethers.js se), toh zero gas lagta hai. Par agar isko doosre contract se transaction ke andar call kiya jaaye, toh gas lagta hai.

```solidity
contract BankAccount {
    uint256 private balance = 500;
    uint256 private interestRate = 5; // percent

    function getBalance() public view returns (uint256) {
        return balance;
    }

    // Reads balance and interestRate, does not write anything
    function projectedBalance(uint256 years) public view returns (uint256) {
        return balance + (balance * interestRate * years) / 100;
    }
}
```

Agar tum galti se `view` function ke andar state ko write karne ki koshish karo, compiler error de dega.

### 3.3 `pure`

Yeh promise karta hai ki function *na toh state read karega, na write*. Yeh sirf apne parameters ke saath kaam karta hai. `view` ki tarah, `pure` calls bhi externally free hoti hain.

```solidity
contract MathLib {
    // No state access at all — purely computation
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }

    function factorial(uint256 n) public pure returns (uint256 result) {
        result = 1;
        for (uint256 i = 2; i <= n; i++) {
            result *= i;
        }
    }
}
```

### 3.4 `payable`

Isse function ETH receive kar sakta hai. Agar yeh keyword nahi hai, aur koi function ko ETH bhejta hai, toh transaction revert ho jaayega.

```solidity
contract CrowdFund {
    mapping(address => uint256) public contributions;
    uint256 public totalRaised;

    function contribute() public payable {
        require(msg.value > 0, "Must send ETH");
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
    }

    function getContribution(address contributor) public view returns (uint256) {
        return contributions[contributor];
    }
}
```

`msg.value` mein woh wei amount hota hai jo call ke saath bheja gaya — yeh sirf `payable` functions ke andar hi accessible hota hai.

> [!tip]
> Socho `payable` ko UPI QR code jaisa — jab tak QR "payment accept karo" ke liye set nahi hai, koi bhi tumhe paise nahi bhej sakta. Waise hi bina `payable` ke function ETH accept nahi karega.

### Mutability + Visibility Matrix

| Mutability | Reads State | Writes State | Receives ETH | External Gas Cost |
|------------|:-----------:|:------------:|:------------:|:-----------------:|
| (default)  | Yes         | Yes          | No           | Gas required      |
| `view`     | Yes         | No           | No           | Free (off-chain)  |
| `pure`     | No          | No           | No           | Free (off-chain)  |
| `payable`  | Yes         | Yes          | **Yes**      | Gas required      |

---

## 4. 📦 Parameters and Return Values

### 4.1 Multiple Return Values

Solidity ek `returns` tuple mein multiple values return karne deta hai.

```solidity
contract Calculator {
    function divmod(uint256 a, uint256 b)
        public
        pure
        returns (uint256 quotient, uint256 remainder)
    {
        quotient = a / b;
        remainder = a % b;
    }
}
```

Caller result ko destructure kar sakta hai:

```solidity
(uint256 q, uint256 r) = calc.divmod(17, 5);
// q = 3, r = 2
```

### 4.2 Named Return Variables

Kya hota hai? Return variables ko naam dene se tum unhe directly assign kar sakte ho bina ek `return` statement likhe (implicit return). Yehi style opening example ke `calculate()` mein use hua tha.

```solidity
function minMax(uint256[] memory arr)
    public
    pure
    returns (uint256 min, uint256 max)
{
    min = arr[0];
    max = arr[0];
    for (uint256 i = 1; i < arr.length; i++) {
        if (arr[i] < min) min = arr[i];
        if (arr[i] > max) max = arr[i];
    }
    // Implicit return: min and max are already set
}
```

Tum chaho toh explicit `return (min, max);` bhi likh sakte ho — dono style compile ho jaate hain.

### 4.3 `memory` vs `calldata` for Reference Types

Jab function koi reference type (string, bytes, arrays, structs) receive karta hai, tumhe batana padta hai ki woh data kahan store hoga.

Isko Swiggy order ki tarah socho — `calldata` matlab restaurant ka original menu jise tum edit nahi kar sakte (read-only, sirf dekh sakte ho), `memory` matlab tumne menu ki photocopy nikaali hai jisko tum apne hisaab se mark kar sakte ho, aur `storage` matlab Swiggy ke database mein permanently save hone wala order.

| Location    | Kaun set karta hai | Mutable? | Gas Cost  | Typical use                    |
|-------------|---------------------|----------|-----------|-------------------------------|
| `calldata`  | Caller ka payload    | No       | Sabse sasta | `external` input params     |
| `memory`    | EVM allocate karta hai | Yes    | Moderate  | `public`/`internal` params     |
| `storage`   | Blockchain            | Yes      | Mehenga   | State variables                |

```solidity
contract StringDemo {
    // external + calldata: cheapest, read-only
    function lengthExternal(string calldata s) external pure returns (uint256) {
        return bytes(s).length;
    }

    // public + memory: slight copy overhead, but callable internally
    function lengthPublic(string memory s) public pure returns (uint256) {
        return bytes(s).length;
    }

    // Internal helper that mutates its copy
    function toUpperFirst(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        if (b[0] >= 0x61 && b[0] <= 0x7A) {
            b[0] -= 0x20; // lowercase → uppercase
        }
        return string(b);
    }
}
```

**Rule of thumb:** `external` functions ke liye `calldata` use karo, aur `public`/`internal`/`private` functions ke liye `memory`.

---

## 5. ✨ Special Functions

### 5.1 `constructor()`

Yeh sirf ek baar chalta hai — deployment ke time. Isse state variables initialise karte hain aur ownership set karte hain.

```solidity
contract Owned {
    address public owner;
    string public name;

    constructor(string memory _name) {
        owner = msg.sender; // deployer's address
        name = _name;
    }
}
```

- Deployer jo bhi parameters deployment ke time pass kare, woh le sakta hai.
- Iska koi visibility modifier nahi hota (modern Solidity mein yeh implicitly `public` hota hai).
- Deployment ke baad dobara call nahi ho sakta.

### 5.2 `receive()`

Ek special, parameter-less function jo plain ETH transfers handle karta hai — matlab jab call ke saath *koi calldata na ho*.

```solidity
contract EtherBox {
    uint256 public received;

    receive() external payable {
        received += msg.value;
        emit EtherReceived(msg.sender, msg.value);
    }

    event EtherReceived(address sender, uint256 amount);
}
```

`receive()` ke rules:
- Isse `external payable` hi hona chahiye.
- No parameters, no return value.
- `.transfer()` ya `.send()` se trigger hone par sirf 2300 gas milta hai (bas ek event log karne jitna, aur zyada kuch nahi).

### 5.3 `fallback()`

Ek catch-all function jo tab trigger hota hai jab:
1. ETH calldata ke saath bheja gaya hai jo kisi bhi function se match nahi karta, **ya**
2. Koi aisa function call kiya gaya jo contract mein exist hi nahi karta, **ya**
3. ETH bina calldata ke bheja gaya hai aur *koi* `receive()` define nahi hai.

```solidity
contract Proxy {
    address public implementation;

    constructor(address _impl) {
        implementation = _impl;
    }

    // Forwards all unknown calls to the implementation contract
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
```

### 5.4 `receive()` vs `fallback()` — The Decision Tree

```mermaid
flowchart TD
    A["ETH transfer / external call arrives"] --> B{Has calldata?}
    B -- No calldata --> C{receive() defined?}
    C -- Yes --> D["receive() is called"]
    C -- No --> E{fallback() defined?}
    E -- Yes --> F["fallback() is called"]
    E -- No --> G["Transaction REVERTS"]
    B -- Has calldata --> H{Matches a function selector?}
    H -- Yes --> I["Matched function is called"]
    H -- No --> J{fallback() defined?}
    J -- Yes --> K["fallback() is called"]
    J -- No --> L["Transaction REVERTS"]
```

> [!info]
> Plain ETH (bina data ke) sabse pehle `receive()` ko hit karta hai. Unknown calls ya ETH jiske saath unrecognised data ho, woh `fallback()` ko hit karta hai.

---

## 6. 🔄 Function Overloading

Solidity ek hi naam ke multiple functions allow karta hai, bas unke *parameter types* alag hone chahiye. Compiler argument types dekh ke sahi wala choose kar leta hai — bilkul waise jaise Zomato app pe "search" ek hi button hai par tumne restaurant naam se search kiya ya cuisine se, app internally alag logic chalata hai.

```solidity
contract Converter {
    // Overload 1: convert a single uint
    function toBytes(uint256 value) public pure returns (bytes memory) {
        return abi.encode(value);
    }

    // Overload 2: convert a string
    function toBytes(string memory value) public pure returns (bytes memory) {
        return bytes(value);
    }

    // Overload 3: convert an address
    function toBytes(address value) public pure returns (bytes memory) {
        return abi.encode(value);
    }
}
```

`toBytes(42)` call karne se pehla wala invoke hoga. `toBytes("hello")` call karne se doosra wala. Sirf return type se overloads ko distinguish nahi kiya ja sakta — parameter types hi alag hone chahiye.

---

## 7. 🔑 Function Selectors

Har public/external function ki apni ek **function selector** hoti hai — uske *canonical signature* ke keccak-256 hash ke pehle 4 bytes.

**Canonical signature** = `functionName(type1,type2,...)` — koi spaces nahi, koi argument names nahi.

Isko soch socho jaise IRCTC PNR number hota hai — ek unique code jisse system turant pehchaan leta hai ki tumhara kaunsa booking/request hai. Waise hi selector se EVM turant pehchaan leta hai ki kaunsa function call karna hai.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SelectorDemo {
    // Selector = bytes4(keccak256("transfer(address,uint256)"))
    //          = 0xa9059cbb
    function transfer(address to, uint256 amount) public returns (bool) {
        // ...
        return true;
    }

    // Compute the selector on-chain (useful for debugging)
    function getSelector() public pure returns (bytes4) {
        return bytes4(keccak256("transfer(address,uint256)"));
    }

    // Manual low-level call using a selector
    function callTransfer(address target, address to, uint256 amount)
        public
        returns (bool success)
    {
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("transfer(address,uint256)")),
            to,
            amount
        );
        (success, ) = target.call(data);
    }
}
```

Jab tumhara wallet transaction bhejta hai, `data` field ke pehle 4 bytes hi selector hote hain — isi se EVM ko pata chalta hai ki call kaunse function ko route karni hai.

> Kisi bhi function ka selector [4byte.directory](https://www.4byte.directory/) pe check kar sakte ho.

---

## 8. 📞 Internal vs External Calls

### Internal Calls (JUMP opcode)

Jab ek function *usi contract ke andar* doosre function ko naam se directly call karta hai, EVM ek simple `JUMP` instruction use karta hai. Koi naya execution context nahi banta, `msg.sender` ya `msg.value` bhi change nahi hote.

```solidity
contract InternalCallDemo {
    uint256 public result;

    function _double(uint256 x) internal pure returns (uint256) {
        return x * 2;
    }

    function compute(uint256 x) public {
        result = _double(x); // internal call — cheap JUMP
    }
}
```

### External Calls (CALL / STATICCALL opcode)

Doosre contract ko call karna — ya apne khud ke contract ko `this.fn()` se call karna — ek naya message call create karta hai. Naya execution context start hota hai, `msg.sender` calling contract ka address ban jaata hai, aur gas alag se meter hota hai.

Isko aise socho — jaise tum Zomato app se khud order kar rahe ho (internal call, tumhara hi session hai), vs jab Zomato kisi third-party payment gateway (Razorpay/Paytm) ko call karta hai — woh ek naya, separate transaction context hai jisme identity aur risk dono change ho jaate hain.

```solidity
interface IOracle {
    function getPrice() external view returns (uint256);
}

contract PriceConsumer {
    IOracle public oracle;

    constructor(address _oracle) {
        oracle = IOracle(_oracle);
    }

    function fetchPrice() public view returns (uint256) {
        // External call — creates a new message context
        return oracle.getPrice();
    }
}
```

### Key differences summarised

| Property              | Internal Call        | External Call               |
|-----------------------|----------------------|-----------------------------|
| EVM opcode            | `JUMP`               | `CALL` / `STATICCALL`       |
| New execution context | No                   | Yes                         |
| `msg.sender` changes  | No                   | Yes (becomes caller contract)|
| Gas overhead          | Minimal              | ~2100 gas base + execution  |
| Can call `private`    | Yes                  | No                          |
| Reentrancy risk       | No                   | Yes — apply checks-effects-interactions |

> [!warning]
> External calls ke saath hamesha checks-effects-interactions pattern follow karo — pehle apni conditions check karo, phir apni state update karo, aur sabse aakhir mein external call karo. Nahi toh reentrancy attack ho sakta hai (jaise koi malicious contract tumhare withdraw function ko baar baar call karke saara balance nikaal le, isse pehle ki tumhara balance update ho).

---

## 9. 🧩 Putting It All Together — Full Example

Ab tak jo bhi seekha, sabko ek saath ek chhote se "bank" contract mein dekhte hain:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SimpleBank — demonstrates all function concepts in one contract
contract SimpleBank {
    address public owner;
    mapping(address => uint256) private balances;
    uint256 public totalDeposited;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    // ─── Special Functions ────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    /// Plain ETH sent with no data is treated as a deposit
    receive() external payable {
        _recordDeposit(msg.sender, msg.value);
    }

    /// Unknown function calls are rejected
    fallback() external payable {
        revert("SimpleBank: unknown function");
    }

    // ─── Public / External Interface ─────────────────────────────────────

    /// Deposit ETH by calling this function
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        _recordDeposit(msg.sender, msg.value);
    }

    /// Withdraw up to your balance
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;          // Effects before interaction
        totalDeposited -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    /// Read balance — free off-chain, costs gas inside a transaction
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    /// Named returns + pure computation (gas-free off-chain)
    function feeEstimate(uint256 amount, uint256 basisPoints)
        external
        pure
        returns (uint256 fee, uint256 net)
    {
        fee = (amount * basisPoints) / 10_000;
        net = amount - fee;
    }

    // ─── Overloaded helpers ───────────────────────────────────────────────

    /// Overload 1: check balance by address
    function isAbove(address user, uint256 threshold) public view returns (bool) {
        return balances[user] > threshold;
    }

    /// Overload 2: check a raw amount (no state read — pure)
    function isAbove(uint256 amount, uint256 threshold) public pure returns (bool) {
        return amount > threshold;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    /// Shared logic called by both deposit() and receive()
    function _recordDeposit(address user, uint256 amount) internal {
        balances[user] += amount;
        totalDeposited += amount;
        emit Deposited(user, amount);
    }

    // ─── Owner-only ───────────────────────────────────────────────────────

    function emergencyWithdraw() external {
        require(msg.sender == owner, "Not owner");
        uint256 contractBalance = address(this).balance;
        (bool ok, ) = owner.call{value: contractBalance}("");
        require(ok, "Transfer failed");
    }
}
```

Yeh ek chhota sa CRED wallet jaisa system hai — deposit karo, withdraw karo, balance check karo, aur owner ke paas hi emergency access hai.

---

## 🗝️ Key Takeaways

1. **Visibility** (`public`, `private`, `internal`, `external`) decide karti hai *kaun* function ko call kar sakta hai. Interface functions ke liye `external` use karo, shared helpers ke liye `internal`, aur implementation details ke liye `private`.

2. **Mutability** (`view`, `pure`, `payable`, ya default) batati hai ki *function kya karne ki permission rakhta hai*. `view` aur `pure` functions off-chain call karne pe free hote hain. ETH receive karne ke liye `payable` zaruri hai.

3. **`constructor`** deploy time pe ek baar chalta hai. **`receive`** plain ETH transfers handle karta hai. **`fallback`** unknown calls ke liye catch-all hai.

4. **`calldata`** read-only hai aur `external` function parameters ke liye sasta padta hai. **`memory`** mutable hai aur `public`/`internal` parameters ke liye use hota hai.

5. **Function selectors** `keccak256(signature)` ke pehle 4 bytes hote hain. EVM inhi se har external call ko route karta hai.

6. **Internal calls** sasti `JUMP` instructions hoti hain. **External calls** naya message context banate hain, `msg.sender` change karte hain, aur inme reentrancy risk hota hai — hamesha checks-effects-interactions pattern apply karo.

---

## 📝 Quiz

**Q1.** Tumhare paas ek function hai jo sirf apne parameter aur local variables use karke Fibonacci number calculate karta hai. Sahi mutability modifier kya hoga?

<details>
<summary>Show answer</summary>

`pure` — na koi state read ho rahi hai, na write.

</details>

---

**Q2.** Ek user tumhare contract address pe seedhe 1 ETH bhejta hai, bina koi transaction data ke. Tumhare contract mein `receive()` aur `fallback()` dono define hain. Kaunsa function trigger hoga?

<details>
<summary>Show answer</summary>

`receive()` — jab bhi `receive()` define ho, plain ETH (bina calldata ke) hamesha sabse pehle usi ko hit karta hai.

</details>

---

**Q3.** `keccak256("balanceOf(address)")` ke pehle 4 bytes kya hain? (Remix ya kisi bhi Solidity REPL mein khud calculate kar sakte ho.)

<details>
<summary>Show answer</summary>

`0x70a08231` — yeh ERC-20 ka `balanceOf` selector hai, Ethereum pe sabse common selectors mein se ek.

</details>

---

*Next chapter: Modifiers and Error Handling — robust, reusable guard logic likhna.*

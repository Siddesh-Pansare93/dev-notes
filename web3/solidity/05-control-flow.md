# 🔀 Control Flow in Solidity

> **Chapter 5** | Solidity for Smart Contract Developers
> Difficulty: Beginner | Estimated Reading Time: ~20 minutes

Control flow matlab tumhara program decide kaise karta hai **aage kya karna hai**. Solidity mein tumhe familiar cheezein milengi — `if`, `for`, `while` — bilkul JavaScript jaisi dikhne wali. Lekin yahan blockchain-specific limitations hain jo agar ignore kiye toh seedha tumhare paise (asli paise, ETH ke roop mein) doob sakte hain. Is chapter mein Solidity ke saare control flow tools cover karenge, aur wo saari gotchas bhi jo JavaScript, Python ya kisi bhi high-level language se aane wale devs ko trip karati hain.

---

## 🧠 Shuru Karne Se Pehle: Gas Ki Reality

Socho Ethereum ek IRCTC ka server hai — har request (yaani har line of code) ka ek cost hai jo tumhe **gas** ke form mein pay karna padta hai Ethereum network ko. Loops sabse bada source hain unexpected gas bills ka, aur kabhi kabhi transaction fail bhi ho jaata hai bas gas khatam hone ki wajah se. Yeh baat poore chapter mein dimaag mein rakhna — loops wale section mein isko dobara detail se dekhenge.

---

## 🔢 Comparison Operators

Conditionals likhne se pehle values ko compare karna aana chahiye. Solidity mein standard set available hai:

| Operator | Matlab                | Example         |
|----------|------------------------|-----------------|
| `==`     | Barabar hai            | `x == 10`       |
| `!=`     | Barabar nahi hai       | `x != 0`        |
| `<`      | Chota hai              | `x < 100`       |
| `>`      | Bada hai               | `x > 0`         |
| `<=`     | Chota ya barabar       | `x <= limit`    |
| `>=`     | Bada ya barabar        | `x >= minimum`  |

```solidity
uint256 balance = 50;
bool canWithdraw = balance >= 10;  // true
bool isZero = balance == 0;        // false
```

---

## ⚙️ Logical Operators

Multiple conditions ko combine karne ke liye logical operators use karte hain:

| Operator | Matlab | Example                    |
|----------|--------|-----------------------------|
| `&&`     | AND    | `x > 0 && x < 100`        |
| `\|\|`   | OR     | `x == 0 \|\| x > 1000`    |
| `!`      | NOT    | `!isActive`                |

### Short-Circuit Evaluation

Kya hota hai jab Solidity `&&` aur `||` evaluate karta hai? Ek **short-circuit logic** follow karta hai:

- `A && B` ke liye: agar `A` `false` hai, toh `B` **kabhi evaluate hi nahi hoga**.
- `A || B` ke liye: agar `A` `true` hai, toh `B` **kabhi evaluate hi nahi hoga**.

Yeh gas efficiency ke liye matter karta hai. Sabse sasta ya sabse zyada likely resolve hone wala condition pehle rakho — bilkul Swiggy pe pehle "cash hai kya" check karo, phir hi "restaurant open hai kya" ka expensive database call maro:

```solidity
// Good: sasta check pehle, expensive check tabhi jab zarurat ho
if (isActive && expensiveCheck()) { ... }

// Wasteful: expensiveCheck() chalega even jab !isActive ho
if (expensiveCheck() && isActive) { ... }
```

---

## ⚠️ Solidity-Specific: No Floating Point

Solidity mein **floating point numbers hote hi nahi hain**. Koi `float`, `double`, ya `decimal` type available nahi hai. Sab kuch integer hai.

Iska matlab: **integer division truncate ho jaata hai** — remainder poora hi drop ho jaata hai:

```solidity
uint256 a = 7;
uint256 b = 2;
uint256 result = a / b;  // result 3 hoga, 3.5 NAHI

uint256 percent = (75 * 100) / 200;  // 37, 37.5 nahi
```

**Best practice:** Divide karne se pehle multiply karo, taaki precision bachi rahe:

```solidity
// Galat order — precision loss
uint256 bad  = (1 / 3) * 300;  // 0! (integer math mein 1/3 = 0)

// Sahi order — pehle multiply
uint256 good = (1 * 300) / 3;  // 100
```

---

## 🔀 if / else if / else Statements

Sabse fundamental control flow. Syntax bilkul JavaScript ya C jaisa hai:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GradeChecker {
    function getGrade(uint256 score) public pure returns (string memory) {
        if (score >= 90) {
            return "A";
        } else if (score >= 80) {
            return "B";
        } else if (score >= 70) {
            return "C";
        } else if (score >= 60) {
            return "D";
        } else {
            return "F";
        }
    }
}
```

**Yaad rakhne wale rules:**
- Curly braces `{}` single-line bodies ke liye optional hain, lekin hamesha use karo — braces skip karna bugs ka common source hai.
- Conditions ka result `bool` hi hona chahiye. Solidity JavaScript ya C ki tarah non-zero integers ko truthy nahi maanta.

```solidity
uint256 x = 1;
if (x) { }        // COMPILE ERROR — x bool nahi hai
if (x != 0) { }   // Sahi
```

> [!warning]
> Yeh sabse common mistake hai jo JS devs karte hain shuru mein — `if (x)` likh dete hain expecting ki non-zero truthy chalega. Solidity mein nahi chalega, compiler seedha error dega.

---

## ❓ Ternary Operator

Simple `if/else` ko compact tarike se likhne ka tareeka, jab tumhe seedha value chahiye ho:

```solidity
// syntax: condition ? valueIfTrue : valueIfFalse
uint256 fee = isVIP ? 0 : 100;

string memory label = (balance > 1000) ? "whale" : "regular";
```

Simple assignments ke liye ternary use karo. Agar logic thoda complex ho raha hai, toh readability ke liye full `if/else` block use karna better hai.

---

## 🔁 for Loops

`for` loop Solidity mein iteration ka workhorse hai. Syntax:

```solidity
for (initialization; condition; update) {
    // body
}
```

### Basic Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ControlFlow {
    uint256[] public numbers;

    function addNumbers(uint256 count) public {
        for (uint256 i = 0; i < count; i++) {
            numbers.push(i);
        }
    }

    function sumArray() public view returns (uint256 total) {
        for (uint256 i = 0; i < numbers.length; i++) {
            total += numbers[i];
        }
    }

    function findFirst(uint256 target) public view returns (int256 index) {
        for (uint256 i = 0; i < numbers.length; i++) {
            if (numbers[i] == target) {
                return int256(i);
            }
        }
        return -1;  // nahi mila
    }
}
```

### Common Patterns

```solidity
// Countdown
for (uint256 i = 10; i > 0; i--) {
    // i jaayega 10, 9, 8 ... 1
}

// 2 ke step mein
for (uint256 i = 0; i < 100; i += 2) {
    // sirf even numbers
}

// Gas bachane ke liye array length cache karo
uint256 len = myArray.length;
for (uint256 i = 0; i < len; i++) {
    // loop ke andar .length read karna har baar storage se dobara read karta hai
}
```

### for Loops Mein Gas Ka Hisaab

Har iteration gas kharch karta hai. Agar tumhara array unbounded grow karta hai, toh jo `sumArray()` function aaj kaam kar raha hai, agle mahine jab array mein 10,000 elements ho jaayenge, tab **gas khatam hoke revert ho sakta hai**:

- `array.length` ko loop ke bahar cache karo (bar bar storage read se bachta hai).
- Loop counters ke liye `uint256` prefer karo — yeh EVM ke native word size se match karta hai.
- Tight loops ke andar storage mein likhna avoid karo; memory mein accumulate karo aur ek hi baar likho.

---

## 🔄 while Loops

`while` tab use karo jab tumhe pehle se pata na ho kitni baar loop chalega:

```solidity
function countDigits(uint256 number) public pure returns (uint256 count) {
    if (number == 0) return 1;
    while (number > 0) {
        count++;
        number /= 10;  // integer division last digit drop kar deta hai
    }
}
```

### Infinite Loop Ka Khatra

`while (true)` loop jisme exit hi nahi hai, woh saara gas kha jaayega aur revert ho jaayega. Hamesha confirm karo ki exit condition reachable hai:

```solidity
// KHATARNAAK — agar target kabhi na mile, hamesha chalega jab tak gas khatam na ho
while (numbers[i] != target) {
    i++;
}

// SAFE — bounds check add karo
while (i < numbers.length && numbers[i] != target) {
    i++;
}
```

Ethereum block gas limit (currently ~30 million gas) ek automatic kill switch ki tarah kaam karta hai — transaction revert ho jaata hai aur saare state changes wapas roll back ho jaate hain — lekin user ko phir bhi **revert hone tak jitna gas consume hua utna pay karna padta hai**. Gas limit ko safety net samajhkar bharosa mat karo.

---

## 🔃 do-while Loops

`do-while` loop body ko **kam se kam ek baar** zaroor run karta hai, phir condition check karta hai:

```solidity
uint256 i = 0;
do {
    i++;
} while (i < 5);
// ab i = 5
```

Practically, Solidity mein `do-while` kaafi rare use hota hai. Isko tab use karo jab tumhare logic ko condition check karne se pehle ek guaranteed execution chahiye ho — jaise ek value process karna phir decide karna ki repeat karna hai ya nahi.

---

## ⏭️ break aur continue

**`break`** loop ko turant exit kar deta hai:

```solidity
function hasValue(uint256[] memory arr, uint256 target) public pure returns (bool) {
    for (uint256 i = 0; i < arr.length; i++) {
        if (arr[i] == target) {
            return true;  // early exit via return
        }
    }
    return false;
}

// break explicitly use karna
for (uint256 i = 0; i < arr.length; i++) {
    if (arr[i] == target) {
        found = true;
        break;  // looping band, seedha for block ke baad jump
    }
}
```

**`continue`** current iteration ka baaki part skip karke agle iteration pe chala jaata hai:

```solidity
function sumEvenOnly(uint256[] memory arr) public pure returns (uint256 total) {
    for (uint256 i = 0; i < arr.length; i++) {
        if (arr[i] % 2 != 0) {
            continue;  // odd numbers skip karo
        }
        total += arr[i];
    }
}
```

Dono hi loop bodies ko clean rakhne aur deeply nested `if` blocks se bachne mein useful hain.

---

## 📋 Arrays Pe Loops: Patterns Aur Best Practices

| Pattern | Kab Use Karein | Notes |
|---------|-----------------|-------|
| Simple iteration | Saare elements read karne ke liye | `.length` cache karo; loop ke andar writes avoid karo |
| `return` se early exit | Search / pehla match dhundhna | Jab match jaldi mil jaaye toh sabse gas-efficient |
| `continue` se filter | Subset sum/process karna | Nested `if` se cleaner |
| Reverse iteration | End se safe removal | Index shifting ke issues se bachata hai |

```solidity
// Reverse iteration — last element delete karne ke liye safe
for (uint256 i = arr.length; i > 0; i--) {
    uint256 element = arr[i - 1];
    // element process karo
}
```

**Forward-iterate karte waqt array ki length kabhi modify mat karo** — isse off-by-one bugs create hote hain.

---

## ⛽ Long Loops Kyun Fail Hote Hain: Block Gas Limit

Har Ethereum block ka ek gas limit hota hai (~30 million gas). Ek single transaction isse exceed nahi kar sakta. Agar tumhara loop body 5,000 gas kharch karta hai aur array mein 10,000 elements hain, toh tumhe 50 million gas chahiye — **ek transaction mein impossible**.

Transaction revert ho jaata hai. Users ko koi result nahi milta aur phir bhi gas fees pay karni padti hai. Yeh ek real production failure mode hai, koi theoretical concern nahi.

**Rule:** User-supplied ya hamesha badhte data pe ek hi transaction mein kabhi unbounded loop mat likho.

---

## 🗺️ Mapping Iteration Problem

Solidity mappings (`mapping(address => uint256)`) hash tables hote hain. Arrays ke unlike, inke paas **keys ki koi internal list nahi hoti**. EVM values ko deterministic storage slots mein store karta hai, lekin unko enumerate karne ka koi tareeka provide nahi karta.

```solidity
mapping(address => uint256) public balances;

// YEH IMPOSSIBLE HAI — natively aise nahi kar sakte:
// for each key in balances { ... }
```

Kyun? Kyunki mapping sirf yeh jaanta hai ki ek key se value kaise nikaalna hai. Yeh kuch bhi track nahi karta ki konsi keys use hui hain. "Mujhe saari keys do" poochna aisa hai jaise ek hash table se kaho apne aap ko reverse-enumerate kare — woh information wahan exist hi nahi karti.

**Workaround:** Mapping ke saath ek alag array maintain karo jisme keys track hon — bilkul Zomato jaise apne restaurants ka mapping (ID → details) rakhta hai, saath hi ek list bhi rakhta hai ki "kaunse restaurant IDs exist karte hain":

```solidity
mapping(address => uint256) public balances;
address[] public holders;   // track karo kisne balance rakha hai

function deposit() public payable {
    if (balances[msg.sender] == 0) {
        holders.push(msg.sender);  // naye holder ko register karo
    }
    balances[msg.sender] += msg.value;
}

// Ab holders[] pe iterate karke balances[holder] lookup kar sakte ho
```

Is pattern se har new key pe storage cost badhta hai, lekin iteration possible ho jaata hai.

---

## 📄 Pattern: Large Datasets Ke Liye Pagination / Chunking

Jab tumhe ek transaction mein fit hone se zyada data process karna ho, toh usko pages mein todo — bilkul jaise Flipkart apna product listing ek saath nahi dikhata, page by page dikhata hai:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PaginatedProcessor {
    address[] public holders;
    mapping(address => uint256) public balances;

    /// @notice holders ka ek slice process karo. Badhte offset ke saath baar baar call karo.
    /// @param offset  Starting index (pehle page ke liye 0)
    /// @param limit   Har call mein kitne items process karne hain (jaise 100)
    function processPage(uint256 offset, uint256 limit)
        public
        returns (uint256 processed)
    {
        uint256 end = offset + limit;
        if (end > holders.length) {
            end = holders.length;  // actual length tak clamp karo
        }

        for (uint256 i = offset; i < end; i++) {
            address holder = holders[i];
            // balances[holder] ke saath kuch karo
            processed++;
        }
    }

    /// @notice Kitne holders exist karte hain — caller isse pata karta hai kab rukna hai.
    function totalHolders() public view returns (uint256) {
        return holders.length;
    }
}
```

Caller (koi script, UI, ya doosra contract) pehle `processPage(0, 100)` call karega, phir `processPage(100, 100)`, aur aise hi tab tak jab tak `offset >= totalHolders()` na ho jaaye. Har call block gas limit ke andar hi rehta hai.

> [!tip]
> Yeh exact wahi pattern hai jo IRCTC ya kisi bhi bade platform ka "load more" / pagination API use karta hai — ek saath sab kuch fetch mat karo, chunks mein karo.

---

## ✅ Key Takeaways

1. **Conditions `bool` hone chahiye** — Solidity integers ko true/false mein coerce nahi karta.
2. **Floating point hota hi nahi** — integer division truncate hoti hai; precision ke liye multiply karo phir divide.
3. **Short-circuit evaluation** — `&&` aur `||` mein sasta ya likely-to-resolve condition pehle rakho.
4. **Har iteration gas kharch karta hai** — `array.length` cache karo, loops ke andar storage writes avoid karo.
5. **Unbounded loops fail hote hain** — agar array hamesha badh sakta hai, toh tumhara loop kabhi na kabhi block gas limit hit karega aur revert hoga.
6. **Mappings natively iterate nahi ho sakti** — keys ko parallel array mein track karo.
7. **Pagination use karo** — bade datasets ke liye, multiple transactions mein fixed-size chunks mein process karo.
8. **`break` aur `continue`** loop logic clean karte hain aur early exit se gas bhi bacha sakte hain.

---

## 📝 Quiz

**Question 1:** Yeh expression kya evaluate hoga, aur kyun?

```solidity
uint256 result = (1 / 3) * 300;
```

<details>
<summary>Answer</summary>

`result` `0` hoga. Integer division left-to-right hoti hai: `1 / 3` evaluate hota hai `0` (truncated), phir `0 * 300 = 0`. Fix yeh hai ki pehle multiply karo: `(1 * 300) / 3 = 100`.

</details>

---

**Question 2:** Tumhare paas `mapping(address => uint256) public scores` hai jisme 5,000 entries hain. Tumhe highest score dhundhna hai. Neeche diye approach mein kya galat hai, aur kaise fix karoge?

```solidity
function highestScore() public view returns (uint256 max) {
    for (uint256 i = 0; i < scores.length; i++) { ... }
}
```

<details>
<summary>Answer</summary>

Do problems hain: (1) Mappings ki koi `.length` property nahi hoti — yeh compile hi nahi hoga. (2) Agar ho bhi jaata, toh 5,000 entries iterate karna block gas limit exceed kar sakta hai. Fix: ek parallel `address[] public participants` array maintain karo aur max score ko off-chain track karo, ya ek paginated on-chain function banao jo `scores[participants[i]]` read kare.

</details>

---

**Question 3:** Neeche diye loop mein, logic sahi hone ke bawajood transaction kis condition mein revert hoga?

```solidity
function distributeRewards(address[] memory recipients) public {
    for (uint256 i = 0; i < recipients.length; i++) {
        balances[recipients[i]] += 100;
    }
}
```

<details>
<summary>Answer</summary>

Agar `recipients` itna bada ho ki total gas consumption block gas limit (~30 million gas) se zyada ho jaaye. Har iteration storage mein write karta hai (ek expensive operation, ~5,000–20,000 gas per write). Hazaaron recipients ke saath, transaction ka gas khatam ho jaata hai aur revert ho jaata hai — saare state changes roll back ho jaate hain aur caller ko phir bhi jitna gas use hua utna pay karna padta hai. Fix: paginated approach use karo ya off-chain batches mein process karo.

</details>

---

*Next Chapter: Functions and Modifiers in Solidity*

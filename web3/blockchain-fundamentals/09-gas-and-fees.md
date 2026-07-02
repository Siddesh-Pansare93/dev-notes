# ⛽ Gas and Fees on Ethereum

> **Level:** Beginner | **Chapter:** 09 | **Topic:** Blockchain Fundamentals

---

## 🎯 Kya Seekhoge Is Chapter Mein

Is chapter ke end tak tumhe samajh aa jayega ki Ethereum ka fee market kaise kaam karta hai, gas kyun exist karta hai, EIP-1559 ne game kaise badla, aur smart contracts likhte waqt gas optimization kyun itna zaruri hai.

---

## ⚙️ Gas Hai Kya?

Socho Ethereum ek bahut bada, distributed computer hai. Jab bhi tum us computer se kuch karwate ho — tokens bhejna, contract deploy karna, function call karna — usse actual computational kaam karna padta hai. **Gas woh unit hai jo us kaam ko measure karta hai.**

Ek achha analogy: Ethereum ko ek car samjho aur har operation ek road hai jispe tumhe drive karna hai. Gas fuel hai. Chhoti drive (simple ETH transfer) mein thoda fuel lagta hai. Lambi highway trip — jisme loops aur storage writes wale complex contract hain — bahut zyada fuel jalati hai.

EVM (Ethereum Virtual Machine) jo bhi operation execute karta hai, uska ek fixed gas cost hota hai jo Ethereum Yellow Paper mein defined hai. Do numbers add karna 3 gas leta hai. Storage se padhna 2100 gas leta hai. Storage mein likhna 20,000 gas leta hai.

### Sab Kuch Itna Precise Kyun Hai?

Kyunki Ethereum network ka har full node har transaction ko verify karne ke liye phir se execute (re-execute) karta hai. Gas cost deterministic hona chahiye — same operation ka cost hamesha same hona chahiye — taaki saare nodes bina ek dusre pe trust kiye result pe agree kar sakein.

---

## 🛡️ Gas Exist Kyun Karta Hai?

Gas do bade problems solve karta hai:

### 1. Infinite Loops Rokna (Halting Problem)

Agar cost mechanism na ho, toh koi bhi malicious actor infinite loop wala contract deploy kar sakta hai:

```solidity
// This would hang every node forever without gas limits
while (true) {
    // do nothing, forever
}
```

Kyunki har operation gas leta hai, aur har transaction ki ek **gas limit** hoti hai, infinite loops ka gas simply khatam ho jata hai aur transaction revert ho jata hai. Attacker apni fee kho deta hai. Network safe rehta hai.

### 2. Validators Ko Compensate Karna

Validators (pehle Proof of Work mein miners kehte the) real-world resources — hardware, electricity, capital — kharch karte hain transactions process karne aur network secure rakhne mein. Gas fees hi woh economic incentive hai jo unke liye honestly ye kaam karna worthwhile banata hai.

---

## 📐 Gas Price vs Gas Limit vs Gas Used

Ye teen terms almost har beginner ko confuse karte hain. Yahan clear breakdown hai:

| Term | Kya Hai | Kaun Set Karta Hai |
|---|---|---|
| **Gas Limit** | Maximum gas jo tum transaction ko consume karne ki permission dete ho | Tum (sender) |
| **Gas Price** | Ek unit gas ke liye tum kitna ETH pay karte ho (pre-EIP-1559 concept) | Tum (sender) |
| **Gas Used** | Actual gas jo transaction execute hone pe consume hua | EVM |

### Sabse Zaruri Rule

Agar `gas used`, `gas limit` se zyada ho jaye, toh transaction **revert** ho jata hai — saare state changes wapis roll back ho jate hain — lekin tumhe us point tak use hue gas ka payment karna hi padta hai. Failed computation ka refund nahi milta.

Agar `gas used`, `gas limit` se kam ho, toh sirf utna hi charge hota hai jitna actually use hua. Bacha hua gas refund ho jata hai.

---

## 🔄 EIP-1559: Fee Market Ki Revolution

August 2021 se pehle, Ethereum ek simple first-price auction use karta tha. Tum ek gas price broadcast karte the, miners sabse highest bids pick karte the, aur fees bilkul unpredictable hoti thi. Network congestion ke time, fees minutes mein 10x tak spike ho jati thi.

**EIP-1559** (London hard fork mein activate hua) ek bilkul different model laya — teen components ke saath.

### 1. Base Fee

Base fee ek algorithmically decide hui minimum price hai jo tumhara transaction block mein include karwane ke liye chahiye.

- **Protocol set karta hai**, users nahi
- **Burn (destroy) ho jata hai** — validators ko nahi jata
- Network demand ke hisab se **automatically adjust** hota hai:
  - Agar pichla block 50% se zyada full tha, base fee 12.5% tak increase hoga
  - Agar pichla block 50% se kam full tha, base fee 12.5% tak decrease hoga

Isse base fee short time horizons mein predictable ban jata hai. Wallets isse accurately estimate kar sakte hain, aur users ko guessing games nahi khelni padti.

> **Isse burn kyun karte hain?** Base fee burn karne se ETH ka supply time ke saath kam hota hai, jisse high-activity periods mein ETH deflationary ban jata hai. Ye validators ko apne khud ke zero-fee transactions include karke block fullness artificially inflate karne se bhi rokta hai.

### 2. Priority Fee (Tip)

Priority fee ek optional tip hai jo directly us validator ko jaata hai jo tumhara transaction include karta hai.

- **Tum set karte ho**, sender
- **Poora validator ko jaata hai**
- Congestion ke time validators ko incentivize karta hai ki woh tumhara transaction dusron se pehle prioritize karein

Kam congestion mein, 1 gwei tip aksar kaafi hota hai. Kisi hot NFT mint ke time, queue jump karne ke liye tumhe 100+ gwei tip dena pad sakta hai.

### 3. Max Fee

Kyunki tumhare transaction sign karne aur usko block mein include hone ke beech base fee change ho sakta hai, tum ek **max fee** set karte ho — ye absolute ceiling hai jo tum per unit gas dene ko ready ho.

Actual amount jo per unit gas pay hota hai, hamesha ye hota hai:

```
actual fee per gas = base fee + priority fee
```

Lekin ye kabhi bhi tumhari max fee se zyada nahi hoga. `Max fee` aur `base fee + priority fee` ke beech ka difference tumhe refund ho jata hai.

---

## 🧮 Transaction Cost Calculate Karna

Yahan complete formula hai:

```
Total Cost (ETH) = Gas Used × (Base Fee + Priority Fee)
```

### Worked Example

Maan lo tum ek ETH transfer bhej rahe ho:

- Gas used: 21,000 (simple ETH transfer ka standard cost)
- Base fee: 15 gwei
- Priority fee: 2 gwei

```
Total = 21,000 × (15 + 2) gwei
      = 21,000 × 17 gwei
      = 357,000 gwei
      = 0.000357 ETH
```

ETH price $3,000 hone par, ye lagbhag $1.07 ka padega.

### Gas Fee Calculation Flow

```mermaid
flowchart TD
    A([User Signs Transaction]) --> B{Set Parameters}
    B --> C[Gas Limit\ne.g. 100,000]
    B --> D[Max Fee\ne.g. 50 gwei]
    B --> E[Priority Fee / Tip\ne.g. 2 gwei]

    F([Network]) --> G[Base Fee\ne.g. 15 gwei\nalgorithmically set]

    G --> H{Check: Max Fee ≥ Base Fee + Priority Fee?}
    H -- No --> I([Transaction Rejected\nby Mempool])
    H -- Yes --> J([Transaction Included in Block])

    J --> K[EVM Executes Transaction]
    K --> L{Gas Used ≤ Gas Limit?}
    L -- No --> M([Transaction Reverts\nOut of Gas\nFee Still Charged])
    L -- Yes --> N[Calculate Actual Cost]

    N --> O["Gas Used × (Base Fee + Priority Fee)"]
    O --> P[Base Fee Portion → 🔥 Burned]
    O --> Q[Priority Fee Portion → Validator]
    N --> R[Unused Gas → Refunded to Sender]
```

---

## 💥 Transactions Kyun Fail Hote Hain: "Out of Gas"

Jab kisi transaction ka gas complete hone se pehle hi khatam ho jaye, toh EVM ek out-of-gas exception throw karta hai. Sab kuch revert ho jata hai — storage changes, token transfers, event emissions — jaise call kabhi hua hi nahi. Lekin us point tak consume hua gas refund nahi hota.

Common causes:

1. **Gas limit bahut kam set kiya gaya** — estimate galat tha ya contract logic anticipate se zyada expensive nikla
2. **Unexpected code paths** — transaction ne aisa branch hit kiya jo estimated path se kaafi zyada gas leta hai
3. **Dynamic loops** — ek loop jo kisi array par iterate karta hai jo gas estimate ke baad grow ho gaya
4. **Reentrancy guards aur checks** — estimate ke baad add ki gayi extra logic

Fix simple hai: `eth_estimateGas` use karo accurate estimate ke liye, aur ek chhota buffer (10–20%) add karo.

---

## 📊 Common EVM Operations Ke Gas Costs

| Opcode | Operation | Gas Cost |
|---|---|---|
| `ADD` | Integer addition | 3 |
| `MUL` | Integer multiplication | 5 |
| `DIV` | Integer division | 5 |
| `SHA3` | Keccak-256 hash | 30 + 6/word |
| `SLOAD` | Contract storage se padhna (cold) | 2,100 |
| `SLOAD` | Contract storage se padhna (warm) | 100 |
| `SSTORE` | Storage mein likhna (new value) | 20,000 |
| `SSTORE` | Existing storage slot update karna | 2,900 |
| `SSTORE` | Storage slot clear karna (refund eligible) | 2,900 |
| `CALL` | External contract call (cold address) | 2,600 |
| `LOG0` | Event emit karna (no topics) | 375 + 8/byte |
| `LOG3` | Event emit karna (3 topics) | 1,500 + 8/byte |
| `CREATE` | Naya contract deploy karna | 32,000 |
| `CODECOPY` | Code ko memory mein copy karna | 3 + 3/word |
| ETH Transfer | Simple ETH send (no data) | 21,000 (fixed) |

> **Cold vs Warm:** EIP-2929 ke baad se, kisi transaction mein pehli baar storage slot ya address access karna zyada costly hai (cold access). Same transaction mein baad ke accesses cheaper hote hain (warm access) kyunki data pehle se local cache mein hota hai.

Sabse expensive operations almost hamesha **storage writes (`SSTORE`)** hote hain. Ye smart contract gas optimization ke liye sabse important fact hai.

---

## 🔍 Gas Kaise Estimate Karein

### eth_estimateGas

Gas estimation ka standard JSON-RPC method hai jo current chain state ke against ek transaction simulate karta hai aur batata hai kitna gas consume hoga.

```javascript
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_KEY");

// Estimate gas for a simple ETH transfer
const estimate = await provider.estimateGas({
  from: "0xYourAddress",
  to: "0xRecipientAddress",
  value: ethers.parseEther("0.1"),
});

console.log(`Estimated gas: ${estimate.toString()}`);
// Output: Estimated gas: 21000

// Estimate gas for a contract call
const contract = new ethers.Contract(contractAddress, abi, provider);
const gasEstimate = await contract.someFunction.estimateGas(arg1, arg2);
console.log(`Contract call gas: ${gasEstimate.toString()}`);
```

### Gas Estimation Ke Practical Tips

- Production transactions ke liye estimate ke upar hamesha **10–20% ka buffer** add karo
- Dynamic loops wale contracts mein jo user-supplied data pe chalte hain, estimate wildly off ho sakta hai agar estimate time aur inclusion time ke beech on-chain state change ho jaye
- Testing ke time har function ka gas cost dekhne ke liye **Hardhat's gas reporter** (`hardhat-gas-reporter`) jaise tools use karo

---

## 🛠️ Smart Contract Developers Ke Liye Gas Optimization

Solidity mein gas optimization premature optimization nahi hai — ye ek core responsibility hai. High gas costs tumhare contract ko unusable bana dete hain. Yahan sabse impactful techniques hain:

### External Function Parameters Ke Liye `memory` Ki Jagah `calldata` Use Karo

```solidity
// Expensive: copies data to memory
function process(string memory data) external { ... }

// Cheaper: reads directly from calldata
function process(string calldata data) external { ... }
```

### Storage Variables Ko Pack Karo

EVM 32-byte storage slots padhta aur likhta hai. Agar tum ek `uint128` aur ek `uint128` alag-alag slots mein store karo, toh 40,000 gas dena padega. Unhe saath pack karo, toh ek slot write ke liye sirf 20,000 gas lagega.

```solidity
// Bad: two storage slots
uint256 public a;
uint256 public b;

// Good: one storage slot (both fit in 32 bytes)
uint128 public a;
uint128 public b;
```

### Storage Reads Ko Memory Mein Cache Karo

Har `SLOAD` ka cost 100–2,100 gas hota hai. Agar tum ek function mein same variable multiple baar read kar rahe ho, toh use cache kar lo.

```solidity
// Bad: three SLOADs
function bad() external {
    require(count > 0);
    emit Log(count);
    count -= 1;
}

// Good: one SLOAD
function good() external {
    uint256 _count = count; // single SLOAD
    require(_count > 0);
    emit Log(_count);
    count = _count - 1;
}
```

### `uint256` Ko Smaller Integers Se Zyada Use Karo (Mostly)

EVM natively 256-bit words par operate karta hai. Kisi function ke andar (struct ke andar nahi) `uint8` use karna aksar *zyada* gas leta hai, kyunki EVM ko chhote types simulate karne ke liye bits mask karne padte hain.

### Expensive Operations Ko Short-Circuit Karo

Cheap checks pehle laga ke jaldi revert kar do, expensive operations run karne se pehle.

```solidity
function withdraw(uint256 amount) external {
    require(amount > 0, "Zero amount");        // cheap
    require(balances[msg.sender] >= amount);    // one SLOAD, cheaper
    _complexCalculation();                      // expensive — only runs if above pass
}
```

---

## 🚀 Layer 2 Solutions Aur Sasta Gas

Ethereum mainnet roughly 15–30 transactions per second process karta hai, jisse block space ki demand consistently high rehti hai aur gas prices elevated rehte hain. **Layer 2 (L2) networks** ye problem solve karte hain — transactions mainnet ke bahar process karke, periodically compressed proofs ya data wapas mainnet pe post karke.

Isse aise samjho jaise Zomato ka main server (L1) sabhi orders directly handle karta hai, aur peak time mein slow ho jata hai. Agar tum kuch regional mini-servers (L2) laga do jo local orders handle karke sirf summary main server ko bhejein, toh main server ka load kam ho jata hai aur cheezein fast ho jati hain.

### L2 Gas Sasta Kyun Hai

| Factor | Mainnet (L1) | Layer 2 |
|---|---|---|
| Transactions per second | ~15–30 | 1,000–10,000+ |
| Block space competition | High | Low |
| L1 pe post hone wala data | Full transactions | Compressed batches |
| Typical gas cost | $1–$50+ | $0.001–$0.10 |

### Major L2 Categories

**Optimistic Rollups** (Optimism, Arbitrum): Transactions off-chain execute karte hain, compressed transaction data L1 pe post karte hain, aur assume karte hain ki transactions valid hain jab tak 7-day dispute window mein challenge na ho.

**ZK Rollups** (zkSync Era, Starknet, Polygon zkEVM): Transactions off-chain execute karte hain, ek cryptographic validity proof (ZK-SNARK ya ZK-STARK) generate karte hain, aur proof ko L1 pe post karte hain. Koi challenge period nahi chahiye — math instantly correctness prove kar deta hai.

**Ye Phir Bhi Kuch Gas Kyun Use Karte Hain**

L2 par bhi, tumhe gas dena padta hai — lekin ye L2 network ke apne fee mechanism mein hota hai aur mainnet costs ka ek fraction hota hai, kyunki block space ke liye competition bahut kam hoti hai aur data compression bahut aggressive hoti hai.

---

## 🔑 Key Takeaways

- **Gas** EVM par computational work ki unit hai. Har opcode ka ek fixed gas cost hota hai.
- Gas exist karta hai **infinite loops rokne** aur **validators ko unke kaam ke liye compensate karne** ke liye.
- **EIP-1559** ke under: base fee burn hoti hai aur algorithmically adjust hoti hai; priority fee (tip) validator ko jaati hai; max fee tumhari ceiling hai.
- **Transaction cost = Gas Used x (Base Fee + Priority Fee).**
- Jo transactions gas limit se zyada consume karte hain woh **revert ho jate hain aur gas phir bhi charge hota hai** — limits carefully set karo.
- **Storage writes (`SSTORE`) sabse expensive common operation hain** — ye Solidity developers ke liye sabse important gas fact hai.
- `eth_estimateGas` use karke gas estimate karo aur 10–20% ka buffer add karo.
- **Layer 2 networks** transactions batch karke aur block space competition kam karke gas costs reduce karte hain.

---

## 📝 Quiz

Apni samajh test karo:

**Question 1.** Tumne ek transaction ke liye 50,000 gas limit set kiya. EVM finish hone se pehle 60,000 gas use kar leta hai. Kya hoga?

- A) Transaction complete ho jayega aur tumhe 10,000 gas worth ETH refund milega
- B) Transaction revert ho jayega; saare state changes undo ho jayenge; tumse 60,000 gas charge hoga
- C) Transaction revert ho jayega; saare state changes undo ho jayenge; tumse 50,000 gas charge hoga
- D) Transaction pause ho jayega aur tumhare gas limit badhane ka wait karega

**Question 2.** EIP-1559 ke under, base fee kahan jaata hai?

- A) Validator ko jo transaction include karta hai
- B) Ethereum Foundation treasury ko
- C) Woh burn (destroy) ho jaata hai, ETH supply kam karte hue
- D) Validator aur next block ke proposer ke beech equally split ho jaata hai

**Question 3.** In mein se sabse expensive common EVM operation kaunsa hai?

- A) `ADD` — integer addition
- B) `SHA3` — keccak-256 hash
- C) `SSTORE` — contract storage mein naya value likhna
- D) `CALL` — external contract call karna

<details>
<summary>Answers</summary>

1. **C** — Transaction gas limit (50,000) par hi revert ho jaata hai, saare state changes undo karte hue. Tumse consume hue gas ka charge hota hai us point tak jahan execution rukta hai (50,000), 60,000 ka nahi, kyunki execution limit par hi ruk jata hai.
2. **C** — Base fee burn ho jaata hai. Ye EIP-1559 ka ek core design choice hai jisse high-activity periods mein ETH deflationary banta hai aur validators fee manipulate nahi kar paate.
3. **C** — Naye storage value ke liye `SSTORE` ka cost 20,000 gas hai. Ye arithmetic (3–5 gas) aur hashing (30+ gas) se kahin zyada hai. Storage writes minimize karna Solidity mein sabse high-impact gas optimization hai.

</details>

---

## 📚 Further Reading

- [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) — Appendix G: Fee Schedule (official opcode costs)
- [EIP-1559 Specification](https://eips.ethereum.org/EIPS/eip-1559)
- [EIP-2929: Gas cost increases for state access opcodes](https://eips.ethereum.org/EIPS/eip-2929)
- [Hardhat Gas Reporter](https://github.com/cgewecke/hardhat-gas-reporter)
- [ethgas.watch](https://ethgas.watch/) — Real-time gas price tracker

---

*Next Chapter: 10 - Smart Contract Accounts and EOAs*

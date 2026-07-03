# Instruction Cycle — Fetch, Decode, Execute

Socho tu Zomato pe order kar raha hai. Teri request kitchen tak jaati hai, kitchen order padhta hai ("2 butter naan, 1 dal makhani"), phir cook banata hai, phir dabbawala tere ghar tak deliver karta hai. Yeh cycle — **order lo → samjho → banao → deliver karo** — baar baar repeat hota hai, har order ke liye.

CPU bhi bilkul yehi karta hai, lekin har second mein **arbo (billions)** baar. Har ek instruction (jaise `ADD`, `MOV`, `LOAD`) ke liye CPU teen (ya char) steps follow karta hai:

1. **Fetch** — memory se instruction utha ke lao
2. **Decode** — samjho ki instruction karna kya chahta hai
3. **Execute** — actual kaam karo (ALU mein calculation, ya memory access)
4. **Store/Write-back** — result ko wapas register ya memory mein rakho

Isi loop ko **Instruction Cycle** (ya **Fetch-Decode-Execute Cycle**, kabhi "FDE Cycle" bhi bolte hain) kehte hain. Jab tak CPU ON hai, yeh loop kabhi nahi rukta — ek instruction khatam, agla fetch shuru. Jaise dabbawala apna delivery route baar baar repeat karta hai, poora din.

> [!info]
> Yeh concept **von Neumann architecture** se aata hai — jahan instructions aur data dono same memory mein rehte hain, aur CPU ek time pe ek instruction fetch karke process karta hai. Tera laptop, phone, sab isi model pe chalte hain (kuch exceptions ke saath, jaise pipelining — uska zikr aage aayega).

## Kyun zaruri hai yeh samajhna?

Tu Node.js mein likhta hai:

```js
let sum = a + b;
```

Yeh ek simple line hai, lekin CPU ke level pe yeh **dozens of fetch-decode-execute cycles** mein toot jaati hai — variable load karna, add karna, result store karna, sab alag-alag instructions hain. Jab tak tujhe yeh pata nahi ki CPU internally kaise kaam karta hai, "why is this code slow" jaise sawaalon ka jawab kabhi deep level pe nahi milega. Yeh chapter tujhe woh foundational layer degा.

---

## Pehle characters ko jaan lo — Registers

Instruction cycle samajhne se pehle, kuch **registers** (CPU ke andar chhoti, super-fast storage locations) jaan lo. Inhe socho jaise ek chef ki kitchen counter pe rakhi chhoti trays — bade fridge (RAM) mein saara raw material hai, lekin jab cook actively kaam kar raha hota hai, cheezein counter pe (registers mein) hoti hain kyunki wahan se uthana instant hai.

| Register | Full Form | Kaam kya hai |
|---|---|---|
| **PC** | Program Counter | Agli instruction ka memory address rakhta hai — "ab kaunsa order lena hai" |
| **IR** | Instruction Register | Jo instruction abhi fetch hui hai, use temporarily hold karta hai |
| **MAR** | Memory Address Register | Jis memory address ko access karna hai, uska address yahan rakha jaata hai |
| **MBR / MDR** | Memory Buffer/Data Register | Memory se jo data/instruction aaya (ya jaana hai), woh yahan hold hota hai |
| **Accumulator (AC)** | — | ALU ke calculations ka result yahan store hota hai (simple/classic CPUs mein) |
| **General Purpose Registers** | R0, R1, R2... | Modern CPUs mein multiple registers hote hain temporary values ke liye |
| **CIR** | Current Instruction Register | Kuch textbooks mein IR ko hi CIR bolte hain |

> [!tip]
> Registers RAM se **hazaron guna fast** hote hain kyunki yeh CPU chip ke andar hi bane hote hain — koi bus travel nahi karna padta. Ek typical CPU register access ~1 clock cycle leta hai, jabki RAM access ~100-300 clock cycles tak le sakta hai. Isi wajah se "load variable into register, then compute" pattern itna common hai — ismein aage **cache memory** aur **memory hierarchy** chapters mein aur depth milegi.

---

## Step 1: FETCH — Order utha ke lao

**Kya hota hai?**

CPU PC (Program Counter) mein dekhta hai ki agli instruction kahan (kis memory address pe) padi hai, us address ko MAR mein daalta hai, memory se woh instruction nikaalta hai, aur use IR (Instruction Register) mein rakh deta hai.

**Kyun zaruri hai?**

Bina fetch ke CPU ko pata hi nahi chalega ki karna kya hai — jaise waiter jab tak order slip (kitchen ka ticket) nahi utha ta, cook kuch bana nahi sakta.

**Step by step (micro-operations):**

```
1. MAR ← PC              ; PC mein jo address hai, use MAR mein copy karo
2. MBR ← Memory[MAR]     ; us address pe jo instruction padi hai, use MBR mein lao
3. IR  ← MBR              ; MBR se instruction ko IR mein shift karo
4. PC  ← PC + 1           ; PC ko agli instruction ke liye increment kardo
```

> [!info]
> Step 4 — `PC ← PC + 1` — bahut important hai. Yeh ensure karta hai ki CPU **automatically** agli instruction ki taraf badhta rahe, bina kisi manual intervention ke. Iska matlab yeh bhi hai ki agar koi instruction PC ko khud change kar de (jaise `JUMP` ya `if` condition ka branch), toh CPU normal sequence chhod ke kahin aur "jump" kar sakta hai — yehi loops aur conditionals ka underlying mechanism hai!

**Real-world analogy:** Railway reservation counter pe clerk sabse pehle queue mein agla token number dekhta hai (PC), us number wale form ko uthata hai (Memory access), aur apne saamne rakh leta hai padhne ke liye (IR). Phir queue counter ka number ek badha deta hai agle customer ke liye (PC + 1).

---

## Step 2: DECODE — Samjho order mein hai kya

**Kya hota hai?**

Ab IR mein jo binary instruction padi hai (jaise `10110000 00000101`), use **Control Unit (CU)** decode karta hai — matlab samajhta hai ki:
- Operation kya hai (ADD? SUB? LOAD? JUMP?) — yeh **opcode** (operation code) field se pata chalta hai
- Kaunse registers/memory locations involved hain — yeh **operand** fields se pata chalta hai
- Kaunsa addressing mode use ho raha hai (direct, indirect, immediate, etc. — iska poora detail **08-addressing-modes** chapter mein hai)

**Instruction ka format samjho:**

Ek typical simple instruction format aisa dikhta hai:

```
 ┌──────────────┬──────────────┬──────────────┐
 │   OPCODE     │   OPERAND 1  │   OPERAND 2  │
 │  (kya karna) │ (source reg) │ (dest/data)  │
 └──────────────┴──────────────┴──────────────┘
   e.g. 4 bits      6 bits          6 bits
```

Maan lo instruction hai: `0001 0010 0011` (16-bit ka simplified example)
- `0001` = opcode → CPU ke instruction set mein "0001 = ADD" define hai (yeh mapping **Instruction Set Architecture / ISA** decide karta hai)
- `0010` = Register R2 (ek operand)
- `0011` = Register R3 (dusra operand)

Toh Control Unit decode karke bolta hai: **"Ye ADD instruction hai, R2 aur R3 ko add karna hai."**

**Yeh kaam kaise hota hai physically?**

Control Unit ke andar ek chhoti circuit hoti hai jise **decoder** kehte hain (basically logic gates ka combination — jinka detail tu **03-boolean-algebra-and-logic-gates** aur **04-digital-circuits** chapters mein already dekh chuka hoga). Opcode bits decoder mein jaate hain, aur decoder appropriate **control signals** activate kar deta hai — jaise "ALU, addition mode on karo" ya "Register file se R2 aur R3 read karo".

> [!info]
> Modern CPUs mein (x86 jaise CISC processors) decode step kaafi complex hota hai — ek instruction ko multiple **micro-ops** mein todna padta hai. RISC processors (jaise ARM) mein decode simpler hota hai kyunki instructions fixed-length aur uniform hoti hain. Yeh trade-off **06-instruction-set-architecture** chapter mein already cover ho chuka hoga.

**Analogy:** Kitchen mein order slip padhne wala cook — "2 butter naan, 1 dal makhani" padh ke samajhta hai ki tandoor use karna hai (naan ke liye) aur gas stove use karna hai (dal ke liye). Yeh "samajhna" hi decode hai.

---

## Step 3: EXECUTE — Actual kaam karo

**Kya hota hai?**

Ab jo control signals decode step ne generate kiye, unke hisaab se actual operation perform hota hai. Yeh operation teen tarah ka ho sakta hai:

1. **ALU operation** — arithmetic ya logical calculation (ADD, SUB, AND, OR, compare, etc.) — **ALU (Arithmetic Logic Unit)** yeh kaam karta hai
2. **Memory access** — data ko memory se read karna (`LOAD`) ya memory mein likhna (`STORE`)
3. **Control transfer** — PC ko directly change karna (`JUMP`, `CALL`, `BRANCH`)

**ADD instruction ke case mein:**

```
ALU ke do inputs mein R2 aur R3 ki values daali jaati hain
ALU addition perform karta hai
Result temporarily ek internal ALU output register mein store hota hai
```

**Analogy:** Cook ab actually khana bana raha hai — tandoor mein naan daalta hai, gas pe dal chadhata hai. Yeh "banane" wala actual physical kaam hai, jo pehle "samajhne" (decode) ke baad hota hai.

---

## Step 4: STORE RESULT (Write-Back) — Deliver karo

**Kya hota hai?**

Execute step ka jo result nikla (jaise ADD ka sum), use uski final destination pe likha jaata hai — ya toh:
- Kisi register mein (`R2 ← R2 + R3` jaisa result R2 mein hi wapas store hona)
- Ya memory mein (agar instruction `STORE` type ki thi)

```
Destination Register/Memory ← ALU Output
```

Iske baad CPU wapas **Step 1 (Fetch)** pe chala jaata hai — agli instruction ke liye. Yeh loop chalta rehta hai jab tak power on hai ya CPU halt instruction na mile.

**Analogy:** Dabbawala final tiffin ko tere desk tak deliver kar deta hai. Order complete. Ab dabbawala wapas station jaake agla order uthayega.

---

## Poora Flow — ASCII Diagram

```
                     ┌─────────────────────────────────────┐
                     │                                       │
                     ▼                                       │
            ┌─────────────────┐                              │
            │   1. FETCH       │                              │
            │  MAR ← PC        │                              │
            │  MBR ← Mem[MAR]  │                              │
            │  IR  ← MBR       │                              │
            │  PC  ← PC + 1    │                              │
            └────────┬─────────┘                              │
                     │                                        │
                     ▼                                        │
            ┌─────────────────┐                               │
            │   2. DECODE      │                              │
            │  Opcode padho    │                              │
            │  Operands nikaalo│                              │
            │  Control signals │                              │
            │  generate karo   │                              │
            └────────┬─────────┘                              │
                     │                                        │
                     ▼                                        │
            ┌─────────────────┐                               │
            │   3. EXECUTE     │                              │
            │  ALU operation / │                              │
            │  Memory access / │                              │
            │  PC jump         │                              │
            └────────┬─────────┘                              │
                     │                                        │
                     ▼                                        │
            ┌─────────────────┐                               │
            │ 4. STORE RESULT  │                              │
            │  (Write-Back)    │                              │
            │  Register/Memory │                              │
            │  update          │                              │
            └────────┬─────────┘                              │
                     │                                        │
                     └────────────────────────────────────────┘
                          (agli instruction ke liye loop)
```

> [!tip]
> Kuch textbooks 3-step version padhate hain (Fetch → Decode → Execute, jahan "store" ko execute ka hi part maan lete hain), kuch 4-step (Fetch → Decode → Execute → Store separately). Dono correct hain — yeh sirf granularity ka farak hai. Concept same rehta hai.

---

## Machine Cycles vs Clock Cycles

Yahan thoda confusion hota hai naye logon ko, toh clear kar dete hain:

- **Clock Cycle**: CPU ke andar ek crystal oscillator (clock) hoti hai jo fixed frequency pe "tick-tick-tick" karti rehti hai. Ek tick = ek clock cycle. Agar tera CPU **3.5 GHz** hai, matlab woh **3.5 billion clock cycles per second** generate karta hai. Har tick pe kuch chhota operation ho sakta hai (jaise ek register se doosre mein value move karna).

- **Machine Cycle**: Ek machine cycle woh time hai jo CPU ko memory se ek baar read/write karne mein lagta hai — jaise fetch step poora karna ek machine cycle hai.

- **Instruction Cycle**: Poora Fetch-Decode-Execute-Store cycle, ek instruction ke liye. Ek instruction cycle mein **multiple machine cycles** ho sakte hain, aur ek machine cycle mein **multiple clock cycles** ho sakte hain.

```
Instruction Cycle
   │
   ├── Machine Cycle (Fetch)     → 2-4 clock cycles
   ├── Machine Cycle (Decode)    → 1 clock cycle (usually fast)
   ├── Machine Cycle (Execute)   → 1-many clock cycles (depends on operation)
   └── Machine Cycle (Store)     → 1-2 clock cycles
```

**CPI (Cycles Per Instruction)** ek important metric hai — average kitne clock cycles ek instruction complete hone mein lagte hain.
- Simple RISC instruction: CPI ≈ 1 (ya usse bhi kam, pipelining ki wajah se)
- Complex CISC instruction (jaise ek x86 instruction jo memory access + calculation dono karti ho): CPI 2-10 tak ja sakta hai

> [!warning]
> **Common misconception**: "Zyada GHz matlab hamesha zyada fast CPU." Yeh galat hai! GHz sirf batata hai clock kitni baar tick karta hai. Agar CPI zyada hai (matlab har instruction ko zyada ticks lagte hain), toh high GHz ka fayda kam ho jaata hai. Real performance formula hai:
> ```
> Time = (Instructions × CPI) / Clock Frequency
> ```
> Isi wajah se ek 3 GHz efficient CPU, ek 4 GHz inefficient CPU se fast ho sakta hai real-world tasks mein.

> [!info]
> Modern CPUs is basic cycle ko aur fast banane ke liye **pipelining** use karte hain — jahan ek instruction ka execute step chal raha hota hai, tab tak agli instruction ka fetch already shuru ho jaata hai (jaise ek assembly line mein). Iska poora detail **09-pipelining-and-ilp** chapter mein milega — yahan bas itna samajh lo ki basic non-pipelined cycle jo hum abhi padh rahe hain, woh foundation hai jispe pipelining build hoti hai.

---

## Fully Worked Trace Example: `ADD R1, R2, R3`

Chal ab ek real jaisa example step by step trace karte hain. Maan lo hume ek simple instruction execute karni hai:

```
ADD R1, R2, R3      ; matlab: R1 = R2 + R3
```

**Starting state (before instruction cycle begins):**

| Register | Value |
|---|---|
| PC | 100 |
| IR | (empty) |
| MAR | (empty) |
| MBR | (empty) |
| R1 | 0 |
| R2 | 15 |
| R3 | 25 |

Memory address `100` pe binary-encoded `ADD R1, R2, R3` instruction padi hui hai.

### Step 1: FETCH

```
MAR ← PC            → MAR = 100
MBR ← Memory[MAR]   → MBR = "ADD R1, R2, R3" (binary encoded)
IR  ← MBR           → IR  = "ADD R1, R2, R3"
PC  ← PC + 1        → PC  = 101
```

| Register | Value |
|---|---|
| PC | **101** |
| IR | **ADD R1, R2, R3** |
| MAR | 100 |
| MBR | ADD R1, R2, R3 |
| R1 | 0 |
| R2 | 15 |
| R3 | 25 |

Dekh — PC pehle hi agli instruction ki taraf badh gaya, chahe abhi humne current instruction ka kuch kiya bhi nahi. Yeh important hai — fetch complete hote hi PC apna kaam kar chuka hota hai.

### Step 2: DECODE

Control Unit IR ko padhta hai:
- Opcode = `ADD`
- Operand 1 (destination) = `R1`
- Operand 2 (source A) = `R2`
- Operand 3 (source B) = `R3`

Control signals generate hote hain: "ALU ko addition mode mein daalo, R2 aur R3 ko ALU inputs pe connect karo, output R1 ko bhejo."

Registers is step mein **change nahi hote** — yeh sirf samajhne (interpretation) ka step hai.

### Step 3: EXECUTE

```
ALU_input_1 ← R2     → ALU_input_1 = 15
ALU_input_2 ← R3     → ALU_input_2 = 25
ALU_output  ← ALU_input_1 + ALU_input_2   → ALU_output = 40
```

| Register | Value |
|---|---|
| PC | 101 |
| IR | ADD R1, R2, R3 |
| ALU Output (internal) | **40** |
| R1 | 0 *(abhi tak update nahi hua)* |
| R2 | 15 |
| R3 | 25 |

### Step 4: STORE RESULT (Write-Back)

```
R1 ← ALU_output      → R1 = 40
```

**Final state (instruction cycle complete):**

| Register | Value |
|---|---|
| PC | **101** |
| IR | ADD R1, R2, R3 |
| R1 | **40** ✅ (updated!) |
| R2 | 15 |
| R3 | 25 |

Ab CPU wapas Step 1 (Fetch) pe jaayega, PC = 101 use karke agli instruction memory address 101 se uthayega, aur poora cycle phir se chalega — agli instruction ke liye.

```
Timeline:
 t0: Fetch    → IR loaded, PC = 100 → 101
 t1: Decode   → "ADD R1,R2,R3" samjha gaya
 t2: Execute  → ALU: 15 + 25 = 40
 t3: Store    → R1 = 40
 t4: Fetch (next instruction begins, PC = 101 → 102...)
```

---

## Ek Zomato-style Poora Analogy (Recap)

| CPU Concept | Zomato Analogy |
|---|---|
| Program Counter (PC) | Next order token number jo counter pe display ho raha hai |
| Fetch | Order slip counter se uthana |
| Instruction Register (IR) | Order slip jo abhi chef ke saamne hai |
| Decode | Chef order slip padh ke samajh raha hai — "2 naan, 1 dal" |
| ALU / Execute | Chef actually cooking kar raha hai |
| Registers (R1, R2...) | Kitchen counter ki chhoti trays jahan ingredients temporarily rakhe hain |
| Store/Write-back | Cooked food ko packing counter pe rakhna, deliver ke liye ready |
| Clock | Kitchen ka wall clock jo tick-tick karke sabko sync mein rakhta hai |
| RAM | Bada godown/fridge jahan saara raw material stored hai |

---

## Common Misconceptions / Gotchas

> [!warning]
> **"CPU ek time pe sirf ek instruction process karta hai"** — yeh purane single-cycle CPUs ke liye sahi tha, lekin modern CPUs **pipelining** aur **superscalar execution** use karte hain jahan multiple instructions **simultaneously different stages** mein hote hain (ek fetch ho raha hai, doosra decode ho raha hai, teesra execute ho raha hai — sab ek hi time pe). Detail **09-pipelining-and-ilp** mein.

> [!warning]
> **"Decode step mein kuch time hi nahi lagta"** — Actually complex instruction sets (CISC, jaise x86) mein decode kaafi expensive step ho sakta hai, kabhi kabhi fetch se bhi zyada complex, kyunki instruction ki length hi variable hoti hai (1 se 15 bytes tak!). RISC (ARM) mein instructions fixed-length (jaise hamesha 4 bytes) hoti hain, isliye decode simpler aur faster hota hai.

> [!warning]
> **"PC hamesha sequentially +1 hi badhta hai"** — Normal case mein haan, lekin `JUMP`, `CALL`, `RET`, ya `if/else` jaise branch instructions PC ko directly kisi bhi address pe set kar sakte hain. Yehi mechanism hai jiski wajah se loops (`for`, `while`) aur function calls possible hote hain apni high-level code mein.

> [!info]
> **OS ka role kahan aata hai?** Jab CPU **interrupt** handle karta hai (jaise keyboard press, ya timer interrupt jo OS scheduler trigger karta hai), toh instruction cycle mein ek extra check add hota hai — har instruction cycle ke end mein CPU check karta hai "koi pending interrupt toh nahi?" Agar hai, toh current PC ko save karke, interrupt handler pe jump kar jaata hai. Iska detailed context-switching aur scheduling wala part tujhe **operating_systems** notes mein already mil chuka hoga (particularly process management aur interrupts wale sections) — yahan hum sirf itna samajh rahe hain ki yeh check hardware level instruction cycle ka hi ek extension hai.

---

## Key Takeaways

- Instruction Cycle = **Fetch → Decode → Execute → Store (Write-back)** — yeh loop CPU jab tak ON hai, non-stop chalta rehta hai.
- **PC (Program Counter)** hamesha agli instruction ka address rakhta hai, aur fetch complete hote hi automatically +1 ho jaata hai (branch instructions isse override kar sakti hain).
- **IR (Instruction Register)** current instruction ko temporarily hold karta hai jab tak decode aur execute complete na ho.
- **Fetch** = memory se instruction uthana (`MAR ← PC`, `MBR ← Memory[MAR]`, `IR ← MBR`, `PC ← PC+1`).
- **Decode** = Control Unit ke andar decoder circuit opcode ko padh ke control signals generate karta hai — batata hai kaunsa operation aur kaunse operands.
- **Execute** = ALU operation, memory access, ya PC jump — actual kaam yahan hota hai.
- **Store/Write-back** = result ko destination register ya memory mein final rakhna.
- **Clock cycle** ek single tick hai; **machine cycle** ek memory read/write ka time hai; **instruction cycle** poora Fetch-Decode-Execute-Store loop hai jisme multiple machine cycles ho sakte hain.
- **CPI (Cycles Per Instruction)** aur clock frequency dono milke real performance decide karte hain — sirf GHz dekh ke CPU speed judge mat karo.
- Modern CPUs is basic cycle ko **pipelining** se overlap karke fast banate hain — woh agla chapter hai.

# CPU Architecture Overview

Socho tum Zomato pe order kar rahe ho. Order aata hai, kitchen usse padhta hai (samajhta hai kya banana hai), phir ingredients nikaalta hai, cooking karta hai, aur final dish ready karke deta hai. CPU bhi bilkul aisa hi kaam karta hai — bas "dish" ki jagah "instruction" hota hai.

Ab tak humne dekha ki data kaise represent hota hai (binary, hex), aur logic gates se circuits kaise bante hain. Ab hum us "kitchen" ke andar chalte hain — CPU ke andar — aur dekhte hain ki wo asal mein kaam kaise karta hai.

> [!info]
> Ye chapter **high-level overview** hai — CPU ke parts kya hain, kyun hain, aur roughly kaise saath mein kaam karte hain. Instruction execute hone ka **step-by-step detailed cycle** (fetch-decode-execute) Chapter 7 mein cover hoga. Yahan hum sirf "characters" introduce kar rahe hain, unki "story" agle chapter mein aayegi.

## Kya hota hai CPU?

**CPU (Central Processing Unit)** computer ka "dimaag" hai — lekin ye analogy thodi misleading hai. Dimaag sochta hai, feel karta hai, decide karta hai. CPU aisa kuch nahi karta — wo sirf **bahut tezi se, bina galti kiye, simple instructions follow karta hai**: add karo, compare karo, memory se data lao, memory mein data rakho, kahin jump karo.

Socho ek **super-fast, super-obedient clerk** jo railway reservation counter pe baitha hai. Usse bola jaaye "form number 5 nikaalo, usme naam padho, agar naam 'Sharma' hai to counter 3 pe bhejo" — wo bina soche-samjhe exactly yahi karega, aur ye lakhon baar per second kar sakta hai. CPU bhi yahi hai — ek super-fast instruction-following clerk.

Har complex kaam jo tumhara Node.js app karta hai — HTTP request handle karna, JSON parse karna, database query — sab neeche jaake in simple instructions mein todk (break down) ho jaata hai, aur CPU unhe ek-ek karke execute karta hai.

### CPU ke 3 major components

```
┌───────────────────────────────────────────────────────────┐
│                           CPU                              │
│                                                              │
│   ┌────────────────┐   ┌──────────────────┐   ┌─────────┐  │
│   │  Control Unit  │   │       ALU        │   │Registers│  │
│   │   (CU)         │   │ (Arithmetic      │   │ (fast   │  │
│   │  "Manager" —   │   │  Logic Unit)     │   │ storage │  │
│   │  decides kya   │   │ "Worker" —       │   │ slots)  │  │
│   │  karna hai,    │   │ actual maths aur │   │         │  │
│   │  kab karna hai │   │ comparisons karta│   │         │  │
│   └────────────────┘   │ hai              │   └─────────┘  │
│                         └──────────────────┘                │
└───────────────────────────────────────────────────────────┘
```

Ek chhoti office ki tarah socho:
- **Control Unit (CU)** = Office Manager — decide karta hai kaunsa kaam kab hoga, kaunsi file kahan jaayegi, kisko kya order dena hai.
- **ALU** = Accountant — jab bhi koi calculation (jodna, ghatana, compare karna) karni ho, manager isi accountant ke paas bhejta hai.
- **Registers** = Manager ki mez pe rakhi chhoti drawers — jahan abhi use ho rahi files (data) turant haath mein rehti hain, poori almirah (RAM) tak jaane ki zaroorat nahi padti.

Chalo in teeno ko detail mein samajhte hain.

---

## 1. ALU — Arithmetic Logic Unit

### Kya hota hai?

ALU CPU ka wo hissa hai jo **actual "kaam"** karta hai — matlab **saari maths aur saare comparisons**. Jab bhi tumhare code mein `a + b`, `x > y`, `flag && condition`, `a << 2` jaisa kuch likha jaata hai, neeche jaake ye sab ALU tak pahunchta hai.

ALU do tarah ke operations karta hai:

| Type | Examples |
|---|---|
| **Arithmetic** | addition, subtraction, multiplication, division (kabhi-kabhi separate FPU/multiplier hota hai), increment, decrement |
| **Logic** | AND, OR, NOT, XOR, bitwise shift (left shift, right shift), comparison (equal, greater than, less than) |

Yaad hai Chapter 3 (Boolean Algebra & Logic Gates)? Wahan humne AND, OR, NOT, XOR gates seekhe the. ALU literally in **hi gates ko combine karke** bana hota hai — lakhon logic gates milke ek circuit banate hain jo "2 numbers do, add karke do" jaisa kaam kar sake. Ek **adder circuit** (jaise full-adder, jo humne pichhle chapter mein dekha) ALU ke andar hi hota hai.

### Kyun zaruri hai?

Bina ALU ke CPU sirf data ko idhar-udhar move kar sakta hai — koi "kaam" nahi kar sakta. Har app, har algorithm, har loop ke andar kahin na kahin comparison ya arithmetic chal raha hota hai. `for (let i = 0; i < arr.length; i++)` likhte waqt — wo `i < arr.length` comparison ALU hi kar raha hota hai, har single iteration mein.

### ALU ke inputs/outputs

```
        ┌─────────────────────┐
Input A ──▶│                     │
        │        ALU         │──▶ Result
Input B ──▶│                     │
        │                     │──▶ Status Flags
Op-code ──▶│  (add/sub/and/or/  │    (Zero? Carry?
 (kaunsa   │   cmp/shift...)   │     Negative? Overflow?)
 operation)│                     │
        └─────────────────────┘
```

- **Input A, Input B**: registers se aaye do numbers (operands)
- **Op-code**: Control Unit batata hai ki *kaunsa* operation karna hai (add? subtract? compare?)
- **Result**: answer, jo wapas kisi register mein store hota hai
- **Status Flags**: extra "side info" — jaise "result zero tha kya?", "overflow hua kya?" (ye Flags Register mein jaake store hote hain — neeche padhoge)

> [!tip]
> Real CPUs mein complex multiplication/division ke liye kabhi-kabhi separate hardware unit hota hai (jaise **FPU — Floating Point Unit** — decimal/float numbers ke liye), lekin conceptually wo bhi ALU family ka hi hissa maana jaata hai.

---

## 2. Control Unit (CU)

### Kya hota hai?

Control Unit CPU ka **"traffic police"** hai. Ye khud koi calculation nahi karta — iska kaam hai **coordinate karna**: kaunsa instruction abhi chal raha hai, use kya karna chahiye, data kahan se aana chahiye, result kahan jaana chahiye, kaunsa hardware component *kab* "on" hoga.

Socho ek **dabbawala coordinator** — wo khud tiffin nahi banata, khud deliver bhi nahi karta, lekin wo decide karta hai ki kaunsa dabba kis train mein jaayega, kaunsa dabbawala kis area mein deliver karega, aur sab timing se ho ye ensure karta hai. CU bhi CPU ke andar yahi role play karta hai.

CU ka kaam hai:
1. Memory se agla instruction **fetch** karna (le kar aana)
2. Us instruction ko **decode** karna (samajhna "iska matlab kya hai")
3. Baaki components (ALU, registers, memory) ko sahi **control signals** bhejna taaki instruction **execute** ho sake

```
                 ┌─────────────────────────────┐
                 │       Control Unit          │
                 │                              │
  Instruction ──▶│  1. Fetch    2. Decode      │
   (memory se)   │                              │
                 │  3. Signals bhejta hai:      │
                 │     - ALU ko "add karo"      │
                 │     - Registers ko "read/    │
                 │       write karo"            │
                 │     - Memory ko "data do/lo" │
                 └─────────────────────────────┘
                     │        │         │
                     ▼        ▼         ▼
                   ALU    Registers   Memory
```

### Kyun zaruri hai?

Bina CU ke, ALU aur registers bas "sleeping" parts hain — koi unhe batayega hi nahi ki kab kya karna hai. CU hi hai jo lakhon instructions ko sahi order mein, sahi timing pe chalata hai — bina CU ke koi bhi program ek bhi line execute nahi kar payega.

> [!info]
> Detailed **fetch → decode → execute** cycle (jisme CU ka sabse bada role hota hai) Chapter 7 mein poora explain hoga. Abhi bas itna samajh lo ki CU "orchestrator" hai.

---

## 3. Registers — CPU ki sabse fast storage

### Kya hote hain?

Registers CPU ke **andar** hi bane hote hain — chhote, super-fast storage slots, jinme bahut kam data (aajkal typically 32 ya 64 bits ek register mein) store ho sakta hai. Ye RAM se **sainkadon guna tez** hote hain, kyunki ye CPU chip ke andar hi physically located hote hain — data ko bahar jaana hi nahi padta.

**Analogy**: Socho tum kitchen mein khaana bana rahe ho.
- **Registers** = tumhare **haath mein** pakda hua chaku aur cutting board pe rakhi sabzi — turant use ho sakta hai
- **RAM** = kitchen ka **fridge** — thoda door hai, lene jaana padta hai, thoda time lagta hai
- **Hard disk/SSD** = **bazaar ka storeroom / godown** — bahut door, bahut saara samaan, lekin lene mein sabse zyada time

Registers is hierarchy ke sabse top pe hain — sabse chhote, sabse tez. (Poori memory hierarchy pyramid Chapter 12 mein detail se cover hogi.)

### Registers ke types

| Register | Kaam | Analogy |
|---|---|---|
| **General Purpose Registers (GPRs)** | Temporary data store karna — numbers, addresses, intermediate results — jo bhi program ko chahiye | Tumhari mez ki drawers — jo bhi chahiye temporarily rakh do |
| **Program Counter (PC)** | **Agla** kaunsa instruction execute hoga, uska memory address rakhta hai | Bookmark jo batata hai "kitaab mein tum kahan tak padh chuke ho" |
| **Instruction Register (IR)** | **Abhi** jo instruction fetch hua hai memory se, wo yahan temporarily store hota hai — decode hone tak | Waiter ka order-pad — abhi jo order liya hai, wo yahan likha hai jab tak kitchen ko batate nahi |
| **Stack Pointer (SP)** | Function calls, local variables ke liye use hone waale "stack" memory ka top address track karta hai | Tiffin boxes ka stack — sabse upar wala dabba kaunsa hai, uska pata |
| **Flags / Status Register** | Last operation ke baare mein chhoti-chhoti "yes/no" info rakhta hai: Zero? Carry? Negative? Overflow? | Restaurant ka "order status board" — "ready hai?", "extra spicy tha?", "bill overflow hua?" |

Chalo har ek ko thoda zoom karke dekhte hain:

**General Purpose Registers (GPRs)**
Ye "general" hain kyunki inhe program kisi bhi cheez ke liye use kar sakta hai — loop counter, temporary sum, memory address, kuch bhi. x86-64 (tumhare laptop ka common architecture) mein inhe naam diye gaye hain: `RAX`, `RBX`, `RCX`, `RDX`, etc. Modern CPUs mein typically 8-32 GPRs hote hain (architecture pe depend karta hai).

**Program Counter (PC)** — kabhi-kabhi "Instruction Pointer (IP)" bhi kehte hain
Ye register hamesha **agle instruction ka memory address** hold karta hai. Har instruction execute hone ke baad, PC apne aap **increment** ho jaata hai (agle instruction pe point karne ke liye) — jaise tum kitaab padhte waqt automatically agli line pe chale jaate ho. Jab koi `if` condition ya function call hota hai (jump/branch), tab PC ko manually **naye address pe set** kar diya jaata hai — jaise kitaab mein kisi doosre page pe jump karna.

**Instruction Register (IR)**
Jab CU memory se instruction fetch karta hai, wo pehle IR mein aata hai — phir CU use decode karta hai. Ye ek temporary "holding area" hai jab tak instruction samjha nahi jaata.

**Stack Pointer (SP)**
Jab tum JavaScript mein ek function doosre function ko call karte ho (`funcA()` calls `funcB()`), computer ko yaad rakhna padta hai ki `funcB` khatam hone ke baad wapas `funcA` mein kahan jaana hai, aur `funcA` ke local variables kahan the. Ye sab ek **stack** (memory ka ek special region) mein store hota hai, aur SP hamesha is stack ke "top" ka address rakhta hai. Recursion, function calls, local variables — sab iske bina impossible hai.

> [!tip]
> Agar kabhi "stack overflow" error dekha hai (infinite recursion se), wo literally isi Stack Pointer se related hai — stack ki fixed memory khatam ho jaati hai aur SP allowed boundary cross kar leta hai.

**Flags / Status Register**
Har ALU operation ke baad, kuch chhote bits set/unset hote hain:
- **Zero flag (Z)**: result zero tha kya?
- **Carry flag (C)**: addition mein carry generate hua kya (jaise 9+9=18, "1" carry hua)?
- **Negative/Sign flag (N)**: result negative tha kya?
- **Overflow flag (V)**: result register ki capacity se bada ho gaya kya?

Ye flags baad mein `if`/`while` jaise conditional jumps ke liye use hote hain. Jab tum likhte ho `if (a > b)`, neeche jaake CU pehle ALU se `a - b` compute karwata hai, phir flags check karta hai (Zero? Negative?), aur uske hisaab se decide karta hai ki jump karna hai ya nahi.

---

## Poora Datapath — Sab kuch ek saath

Ab teeno components ko ek diagram mein jodte hain — ye **simplified datapath** hai jo dikhata hai data kaise flow karta hai CPU ke andar:

```
                         ┌─────────────────────────────────┐
                         │            CONTROL UNIT           │
                         │  (decides what happens & when)    │
                         └───────────┬───────────┬──────────┘
                                     │ control    │ control
                                     │ signals    │ signals
                                     ▼            ▼
     ┌──────────────┐        ┌─────────────┐    ┌─────────┐
     │  Instruction  │◀──────▶│  Registers  │◀──▶│   ALU   │
     │  Register(IR) │        │ ┌─────────┐ │    │ (does   │
     └──────────────┘        │ │ GPRs    │ │    │ maths + │
     ┌──────────────┐        │ │ PC      │ │    │ logic)  │
     │Program Counter│───────▶│ │ SP      │ │◀──▶│         │
     │    (PC)       │        │ │ Flags   │ │    └─────────┘
     └──────────────┘        │ └─────────┘ │
                              └──────┬──────┘
                                     │ data (load/store)
                                     ▼
                         ┌─────────────────────────────────┐
                         │      MEMORY (RAM)  /  Bus         │
                         └─────────────────────────────────┘
```

High level pe flow kuch aisa hai:
1. **PC** batata hai agla instruction memory mein kahan hai.
2. **CU** us instruction ko memory se fetch karke **IR** mein daalta hai.
3. **CU** IR ko decode karta hai — samajhta hai "ye add karna hai" ya "ye compare karna hai" ya "ye memory se load karna hai".
4. Zaroorat ke hisaab se, data **Registers** se **ALU** mein jaata hai, calculation hoti hai.
5. Result wapas kisi **register** mein ya **memory** mein store hota hai.
6. **PC** agle instruction ke liye increment (ya jump) hota hai.
7. Repeat — lakhon-crore baar, per second.

Ye poora cycle (fetch → decode → execute) ek "instruction cycle" kehlata hai — full detail **Chapter 7** mein.

---

## Clock Speed — GHz ka matlab kya hai?

### Kya hota hai clock?

CPU ke andar ek **clock** hota hai — ek electronic signal jo constant rhythm mein "tick-tick-tick" karta rehta hai, bilkul metronome ki tarah jo music teacher tabla sikhate waqt use karta hai. Har "tick" (clock cycle) pe CPU ke andar kuch chhota kaam hota hai — jaise ek instruction ka ek chhota sa step.

**GHz (Gigahertz)** batata hai ki ye clock **kitni baar per second tick karta hai**:
- 1 Hz = 1 tick per second
- 1 GHz = 1 **billion** (100 crore) ticks per second
- Tumhara laptop shayad **3-5 GHz** pe chal raha hoga = **3-5 billion ticks per second**

```
Clock signal (simplified):

 High ─┐   ┌─┐   ┌─┐   ┌─┐   ┌─┐   ┌─
       │   │ │   │ │   │ │   │ │   │
 Low   └───┘ └───┘ └───┘ └───┘ └───┘
       │←1 cycle→│
       (3 GHz pe: 1 cycle = 0.33 nanosecond!)
```

### Kyun zaruri hai samajhna?

- **Higher GHz = faster clock = zyada operations per second** — but ye poori story nahi hai.
- Ek instruction complete hone ke liye **multiple clock cycles** lag sakte hain (fetch ek cycle, decode ek cycle, execute ek ya zyada cycles).
- Do alag CPUs same GHz pe ho sakte hain lekin **alag speed** de sakte hain — kyunki architecture, cores ki sankhya, cache size, pipelining (Chapter 9) sab milke real-world performance decide karte hain.

> [!warning]
> **Common misconception**: "Zyada GHz = hamesha faster computer." Ye galat hai! 3 GHz ka modern CPU 4 GHz ke 10-saal-purane CPU se kaafi zyada fast hoga, kyunki design (architecture) improve hui hai — har cycle mein zyada smart kaam ho raha hai. GHz sirf ek factor hai, poori kahani nahi.

### Real numbers ka sense

| Era | Typical Clock Speed |
|---|---|
| 1980s (early PCs) | 4-10 MHz |
| 1990s | 100-500 MHz |
| Early 2000s | 1-3 GHz |
| Aaj (2020s laptops/desktops) | 3-5.5 GHz (per core, "boost" clock ke saath) |

> [!info]
> ~2005 ke baad se single-core clock speed roughly **plateau** ho gaya hai (heat/power limits ki wajah se) — isiliye industry ne **multi-core** (Chapter 10) ki taraf shift kiya, na ki sirf GHz badhate rehna.

---

## Word Size — 32-bit vs 64-bit

### Kya hota hai "word size"?

**Word size** batata hai ki CPU **ek baar mein kitne bits ka data handle kar sakta hai** — registers kitne bits wide hain, address bus kitna wide hai, aur ek single instruction mein kitna data move ho sakta hai.

Socho ek **tiffin carrier**:
- 32-bit CPU = 32 chhote khaanon wala tiffin — ek baar mein 32 units khaana carry kar sakta hai
- 64-bit CPU = 64 khaanon wala bada tiffin — ek baar mein double khaana carry kar sakta hai

### Practical impact

| | 32-bit | 64-bit |
|---|---|---|
| Register size | 32 bits | 64 bits |
| Max value ek register mein | ~4.29 billion (2³²−1) | ~18.4 quintillion (2⁶⁴−1) |
| Max addressable RAM (theoretical) | 4 GB | 16 exabytes (practically OS/hardware limits laga dete hain) |
| Aaj kal kahan milta hai | Purane systems, kuch embedded devices | Almost sab modern laptops, phones, servers |

### Kyun zaruri hai ye?

Yaad hai jab **32-bit Windows** wale systems sirf **4GB RAM tak** use kar paate the, chaahe tumne 8GB RAM laga bhi diya ho? Ye isi word size ki limitation thi — 32-bit ka address register sirf 2³² = ~4.29 billion alag memory locations point kar sakta tha (ek address ek byte ke liye, to max ~4GB).

64-bit aane se ye limit astronomically badh gayi — practically aaj koi bhi consumer system is limit tak nahi pahunchta.

> [!tip]
> Jab tum Node.js mein `process.arch` check karte ho ya koi `.exe` install karte waqt "x86" (32-bit) vs "x64" (64-bit) dikhta hai — ab pata hai wo kya reflect kar raha hai: CPU ke registers aur address bus ki width.

> [!warning]
> **Misconception**: "64-bit CPU hamesha 32-bit se 2x fast hota hai." Galat — word size bade numbers ko ek step mein handle karne, zyada RAM address karne, aur kuch operations ko efficient banane mein help karta hai, lekin ye "2x speed" guarantee nahi karta. Speed clock, architecture, cores, cache sab pe depend karta hai.

---

## Sab kuch milke ek instruction kaise chalate hain (high-level walkthrough)

Chalo ek super simple example lete hain: `c = a + b` (jaise tumne kabhi JavaScript mein likha hoga).

Neeche jaake, compiler/interpreter ise machine instructions mein todta hai, roughly kuch aisa:

```
1. LOAD  R1, [address of a]      ; a ko memory se register R1 mein lao
2. LOAD  R2, [address of b]      ; b ko memory se register R2 mein lao
3. ADD   R3, R1, R2              ; R1 + R2 karke R3 mein daalo
4. STORE [address of c], R3      ; R3 ka result wapas memory mein c pe rakho
```

Har line ke liye, high-level pe ye hota hai:

1. **PC** batata hai instruction kahan hai memory mein → **CU** use fetch karke **IR** mein rakhta hai.
2. **CU** decode karta hai: "oh, ye ek LOAD instruction hai" ya "ye ADD hai".
3. **CU**, control signals bhejta hai — LOAD ke case mein memory se register tak data move karwata hai; ADD ke case mein, **ALU** ko bolta hai R1 aur R2 add karo.
4. **ALU** calculation karta hai, result kisi register mein jaata hai, **Flags register** update hota hai (zero tha? overflow hua?).
5. STORE instruction mein, register ka data wapas memory mein jaata hai.
6. **PC** apne aap agli instruction pe move ho jaata hai.
7. Ye cycle repeat hota hai — agli instruction ke liye.

Ye sab itni tezi se hota hai (billions of times per second) ki hume lagta hai `c = a + b` "instant" hai — lekin asal mein neeche ye poora orchestra chal raha hota hai.

> [!info]
> Ye walkthrough deliberately simplified hai. Real CPUs mein pipelining hota hai (multiple instructions overlap hoke chalte hain — Chapter 9), aur exact fetch-decode-execute steps zyada detailed hain — wo sab **Chapter 7 (Instruction Cycle)** mein milega.

---

## Cross-links

- **Operating Systems** notes mein dekhoge ki OS kaise CPU registers, stack, aur program counter ko manage karta hai jab multiple processes/threads switch hote hain (context switching) — us OS-level detail ko yahan duplicate nahi kar rahe.
- **Chapter 7 (Instruction Cycle)** — poora fetch-decode-execute-store cycle, step by step.
- **Chapter 9 (Pipelining and ILP)** — kaise modern CPUs multiple instructions ko overlap karke chalate hain taaki clock cycles waste na ho.
- **Chapter 12 (Memory Hierarchy)** — registers, cache, RAM, disk ka poora speed/size trade-off pyramid.

---

## Key Takeaways

- CPU ke 3 major parts: **ALU** (maths/logic karta hai), **Control Unit** (coordinate/decide karta hai), **Registers** (super-fast temporary storage).
- **ALU** arithmetic (add, subtract) aur logic (AND, OR, compare, shift) operations karta hai — result ke saath **status flags** (Zero, Carry, Negative, Overflow) bhi generate karta hai.
- **Control Unit** khud calculation nahi karta — wo fetch → decode → signal-bhejna ka orchestration karta hai.
- Registers ke important types: **GPRs** (general temp data), **PC** (agla instruction kahan hai), **IR** (abhi ka instruction), **SP** (stack ka top, function calls ke liye), **Flags register** (last operation ka status).
- Registers RAM se **kaafi tezi** hote hain kyunki CPU chip ke andar hi hote hain — memory hierarchy ke sabse top pe.
- **Clock speed (GHz)** batata hai CPU per second kitni "ticks" karta hai — lekin higher GHz = hamesha faster CPU nahi, architecture bhi utna hi important hai.
- **Word size (32-bit vs 64-bit)** batata hai CPU ek baar mein kitna data handle kar sakta hai aur kitni RAM address kar sakta hai — 32-bit ~4GB RAM tak limited tha, 64-bit ne ye limit practically hata di.
- Ek simple instruction (`c = a + b`) execute karne ke liye bhi PC, IR, CU, registers, aur ALU sab saath mein coordinate karte hain — ye poora orchestra billions of times per second chalta hai.
- Detailed instruction cycle (fetch-decode-execute) Chapter 7 mein aayega — ye chapter sirf "characters" introduce karta hai.

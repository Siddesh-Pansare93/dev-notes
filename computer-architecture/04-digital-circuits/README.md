# Digital Circuits — Adders, Flip-Flops, Registers

Pichhle chapter mein humne dekha ki AND, OR, NOT, XOR jaise gates kaise 0 aur 1 pe logic banate hain. Ab sawaal ye hai — in gates ko jod ke actual **kaam ki cheez** kaise banti hai? CPU ke andar numbers add kaise hote hain? Aur sabse important — computer ko "yaad" kaise rehta hai ki abhi register mein kya value hai, jab electricity ka signal to bas ek pulse hai, permanent nahi?

Ye chapter do duniyaon ko jodta hai:

1. **Combinational circuits** — jinka output sirf *abhi* ke input pe depend karta hai (jaise ek calculator ka `+` button — jo daalo wahi turant nikalta hai, purane input ka koi record nahi).
2. **Sequential circuits** — jinka output current input *aur* purani history (state) dono pe depend karta hai (jaise tumhara bank balance — deposit/withdraw ek sequence hai, order matter karta hai).

Isi doosre category se hi **memory** ka janm hota hai — aur wahi cheez hai jo RAM, registers, CPU cache sabko possible banati hai.

> [!info]
> Deep OS-level detail (jaise RAM ka actual architecture, cache hierarchy) `computer-architecture/12-memory-hierarchy` aur `13-cache-memory` mein cover hoga. Yahaan hum sirf **sabse chhota building block** — ek single bit ko store karne wala circuit — samajhenge.

---

## Part 1: Combinational Circuits — "No Memory, Sirf Abhi Ka Kaam"

### Kya hota hai?

Combinational circuit ek aisa circuit hai jisme:
- Output = f(current inputs) — bas itna hi.
- Koi feedback loop nahi, koi clock nahi, koi "state" nahi.
- Same input doge, hamesha same output milega — chahe kal do ya aaj.

Zomato ke bill calculator ko socho: item price + tax + delivery fee daalo, total turant nikal aata hai. Ye calculator kal ka order yaad nahi rakhta — har baar fresh calculation hoti hai. Yही combinational logic hai.

### Half-Adder — Do Bits Jodne Ka Sabse Simple Tareeka

Binary mein ek digit sirf 0 ya 1 hota hai. Jab tum do single bits add karte ho, chaar possibilities hain:

```
  0 + 0 = 0   (Sum=0, Carry=0)
  0 + 1 = 1   (Sum=1, Carry=0)
  1 + 0 = 1   (Sum=1, Carry=0)
  1 + 1 = 10  (Sum=0, Carry=1)   <- decimal 2, binary mein "10"
```

Isse **Half-Adder** kehte hain kyunki ye sirf 2 bits leta hai (koi "incoming carry" nahi leta — isliye "half").

**Truth Table:**

| A | B | Sum (S) | Carry (C) |
|---|---|---------|-----------|
| 0 | 0 |    0    |     0     |
| 0 | 1 |    1    |     0     |
| 1 | 0 |    1    |     0     |
| 1 | 1 |    0    |     1     |

Pattern dikh raha hai? **Sum column exactly XOR gate ka output hai**, aur **Carry column exactly AND gate ka output hai**.

```
Sum   = A XOR B
Carry = A AND B
```

**Circuit diagram (ASCII):**

```
        ┌─────┐
   A ───┤     │
        │ XOR ├──── Sum
   B ───┤     │
      ┌─┤     │
      │ └─────┘
      │
      │ ┌─────┐
      └─┤     │
   A ───┤ AND ├──── Carry
   B ───┤     │
        └─────┘
```

Sirf 2 gates — ek XOR, ek AND — aur tumhare paas ek binary adder ban gaya. Ye computer organization ka pehla "aha" moment hai: **arithmetic bhi logic gates se emerge hota hai**, koi jadu nahi.

> [!tip]
> Agla baar jab tum JS mein `1 + 1` likho, yaad rakhna — CPU ke andar literally XOR aur AND gates ka jaal ye calculation kar raha hai, microseconds mein.

### Full-Adder — Real Zindagi Mein Carry Bhi Aata Hai

Half-adder ki problem: jab tum multi-bit numbers add karte ho (jaise 8-bit ya 32-bit), to har position pe sirf apne 2 bits nahi, **pichhli position se aaya hua carry bhi** add karna padta hai.

Socho tum school mein column addition kar rahe ho:

```
    1 1      <- carry row
    1 0 1 1
  + 0 1 1 1
  ---------
```

Rightmost column mein sirf 2 bits (1 aur 1) add hote hain — half-adder kaafi hai. Lekin agli columns mein 3 cheezein add karni padti hain: A, B, aur pichhli column se carry-in (Cin).

Isliye **Full-Adder** banta hai — jo 3 inputs leta hai: A, B, Cin. Aur 2 outputs deta hai: Sum, Cout (carry-out, jo agli position ko jayega).

**Truth Table:**

| A | B | Cin | Sum | Cout |
|---|---|-----|-----|------|
| 0 | 0 |  0  |  0  |  0   |
| 0 | 0 |  1  |  1  |  0   |
| 0 | 1 |  0  |  1  |  0   |
| 0 | 1 |  1  |  0  |  1   |
| 1 | 0 |  0  |  1  |  0   |
| 1 | 0 |  1  |  0  |  1   |
| 1 | 1 |  0  |  0  |  1   |
| 1 | 1 |  1  |  1  |  1   |

Logic equations (isko do half-adders se bana sakte ho):

```
Sum  = A XOR B XOR Cin
Cout = (A AND B) OR (Cin AND (A XOR B))
```

**Circuit diagram — 2 Half-Adders + 1 OR gate se Full-Adder:**

```
              ┌───────────────┐
         A ───┤               ├──── S1 ──┐
              │  Half-Adder 1 │          │      ┌───────────────┐
         B ───┤               ├── C1 ─┐  └──────┤               │
              └───────────────┘       │         │  Half-Adder 2 ├──── Sum
                                       │  Cin ───┤               │
                                       │         └───────┬───────┘
                                       │                 │ C2
                                       │                 │
                                       │            ┌────┴────┐
                                       └────────────┤   OR    ├──── Cout
                                                     └─────────┘
```

Yaani: pehla half-adder A+B karta hai, doosra half-adder us result mein Cin add karta hai, aur dono half-adders se aaye carries ko OR kar diya to final Cout mil jaata hai.

### Ripple-Carry Adder — Poore Number Ko Add Karna

Ab agar 4-bit, 8-bit ya 32-bit numbers add karne hain, to bas full-adders ko chain mein jod do — har adder ka Cout agle adder ka Cin ban jaata hai. Isse **Ripple-Carry Adder** kehte hain (carry ek se doosre mein "ripple" — beh — kar jaata hai, jaise paani ki lehar).

```
   A3 B3        A2 B2        A1 B1        A0 B0
    │  │         │  │         │  │         │  │
    ▼  ▼         ▼  ▼         ▼  ▼         ▼  ▼
  ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐
  │ Full │Cout │ Full │Cout │ Full │Cout │ Full │Cout=0
  │Adder3│◄────│Adder2│◄────│Adder1│◄────│Adder0│◄──── Cin=0
  └──┬───┘     └──┬───┘     └──┬───┘     └──┬───┘
     │            │            │            │
     S3           S2           S1           S0

  Result = S3 S2 S1 S0
```

> [!warning]
> **Ripple-carry ka downside**: har adder ko apna kaam shuru karne ke liye pichhle adder ka carry chahiye. 32-bit number ke liye carry ko 32 adders se guzarna padega — ye slow hai! Real CPUs isliye **Carry-Lookahead Adder** jaisi smarter designs use karte hain jo carry ko parallel mein predict kar leti hain. Concept samajhne ke liye ripple-carry kaafi hai, lekin production hardware mein speed ke liye zyada advanced adders hote hain.

---

## Part 2: Multiplexers aur Demultiplexers — Data Ka Traffic Signal

### Multiplexer (MUX) — Kai Inputs Mein Se Ek Chuno

**Kya hota hai?** Multiplexer ek switch hai jo N inputs mein se ek ko select karke output pe bhejta hai, based on "select lines".

Railway reservation counter jaisa socho — ek hi counter (output) hai, lekin peeche 4 alag lines (inputs) khadi hain. Counter ka staff ek "select signal" (jaise token number ka last digit) dekh ke decide karta hai ki abhi kis line waale ko serve karna hai.

**2-to-1 MUX** (2 inputs, 1 select line):

| Select (S) | Output |
|------------|--------|
|     0      |   A    |
|     1      |   B    |

```
   A ───┐
        │  ┌─────┐
        └──┤     │
           │ MUX ├──── Output
        ┌──┤     │
   B ───┘  └──┬──┘
              │
              S (select line)
```

CPU ke andar MUX bahut use hota hai — jaise ALU decide karta hai ki add karna hai ya subtract, MUX hi wo signal route karta hai ki kaunsa result aage bhejna hai.

### Demultiplexer (DEMUX) — Ek Input Ko Kai Jagah Bhejo

MUX ka ulta. Ek hi input line hoti hai, aur select lines decide karti hain ki wo signal kis output pe jayega.

Dabbawala system jaisa socho — ek central kitchen (single input) se tiffin nikalta hai, aur address label (select signal) ke hisaab se wo alag-alag ghar (outputs) mein se sahi ghar pahunchta hai.

```
                    ┌─────┐──── Output 0
                    │     │
   Input ───────────┤DEMUX├──── Output 1
                    │     │
                    └──┬──┘──── Output 2 ... etc.
                       │
                       S (select line)
```

Ye tools yahaan sirf "briefly" cover kiye — inka full use CPU ke datapath aur memory addressing mein hota hai, jo aage ke chapters (05, 12) mein aayega.

---

## Part 3: Sequential Circuits — Jahan "State" Ka Concept Shuru Hota Hai

### Kya hota hai, aur kyun zaruri hai?

Combinational circuit sirf "abhi" janta hai. Lekin ek asli computer ko **yaad** rakhna padta hai — variable ki value, loop counter, ya CPU register mein kya hai. Iske liye chahiye ek circuit jo:

1. Ek bit ki value ko **store** kar sake.
2. Us value ko **tab tak hold** kare jab tak use explicitly change na kiya jaye.
3. Naye value ko sirf **sahi waqt pe** accept kare (warna signals random time pe change hote rahenge aur chaos ho jayega).

Isko **state** kehte hain — circuit ka current output sirf current input pe nahi, balki *pehle kya hua tha* uspe bhi depend karta hai. Bank account jaisa socho: aaj ka balance sirf aaj ke transaction pe depend nahi karta — pichhle sab deposits/withdrawals ka result hai. Yehi "state" hai.

Sequential circuit banane ke liye ek trick chahiye: **feedback**. Output ko wapas input mein connect karo, taki circuit apni current value ko "yaad" rakh sake.

---

## Part 4: Flip-Flops — Computer Ki Sabse Chhoti Memory Unit

### SR Latch — Sabse Basic Building Block

Sabse simple memory element **SR Latch** hai (Set-Reset), do NOR (ya NAND) gates ko cross-connect karke banta hai:

```
          ┌─────┐
    S ────┤     │
          │ NOR ├───┬──── Q
       ┌──┤     │   │
       │  └─────┘   │
       │             │
       └─────────────┘
       ┌─────────────┐
       │  ┌─────┐   │
       └──┤     │   │
    R ────┤ NOR ├───┴──── Q' (NOT Q)
          │     │
          └─────┘
```

- **S = 1, R = 0** → Q = 1 (Set)
- **S = 0, R = 1** → Q = 0 (Reset)
- **S = 0, R = 0** → Q apni **purani value hold** karta hai (yehi memory hai!)
- **S = 1, R = 1** → Invalid state (dono outputs 0 ho jaate — banned combination)

Ye "hold" wala case hi magic hai — jab dono inputs 0 hain, circuit ko koi naya instruction nahi mili, to wo apni last value pe atka rehta hai. **Ye hi ek bit ki memory hai.**

Problem: SR latch **level-sensitive** hai — jab bhi S ya R change ho, turant Q change ho sakta hai, chahe wo galti se ho ya jaanbujh ke. Isse circuit unpredictable ho sakta hai. Isi problem ko solve karne ke liye **clock** ka concept aata hai.

### Clock Signal — Sabko Ek Rhythm Mein Bandhna

**Kya hota hai?** Clock ek electrical signal hai jo continuously 0 aur 1 ke beech oscillate karta hai — jaise ek metronome jo tick-tock karta rehta hai, fixed speed pe.

```
Clock:  ▁▁▁▔▔▔▁▁▁▔▔▔▁▁▁▔▔▔▁▁▁▔▔▔
              ↑           ↑
         rising edge  rising edge
```

**Kyun zaruri hai?** Socho ek office mein sab log jab chahein tab file update kar den — chaos ho jayega, kisi ko pata nahi chalega ki final version kaunsa hai. Isliye office mein ek rule banaya jaata hai: "sirf 6 PM ko hi sab apni file save karenge, ek saath." Clock signal exactly ye kaam karta hai — CPU ke saare flip-flops ko batata hai "**abhi** naya data accept karo," aur baaki time pe sab kuch stable rehta hai.

- **Clock speed** aajkal ke CPUs mein GHz mein measure hoti hai — jaise 3.5 GHz matlab 3.5 **billion** ticks per second.
- Har tick (usually rising edge — 0 se 1 jaane wala moment) pe CPU ke registers apni values update karte hain.

> [!info]
> Clock frequency jitni high, utni fast processing — lekin heat aur power consumption bhi utna hi badhta hai. Yehi reason hai ki modern CPUs "multi-core" approach lete hain (chapter 10) instead of sirf clock speed badhate jaana.

### D Flip-Flop — Sabse Important Memory Element (Focus Yahin Hai)

SR latch ki problems (invalid state, level-sensitivity) fix karne ke liye **D Flip-Flop** banaya gaya — aaj ke computers mein registers banane ka main building block yehi hai.

**Kya hota hai?** D Flip-Flop ek circuit hai jisme:
- Ek data input hota hai: **D**
- Ek clock input hota hai: **CLK**
- Output: **Q** (aur uska complement Q')

**Rule bahut simple hai:** Clock ke **rising edge** (0→1 transition) pe, jo bhi value D pe hai, wo Q mein "capture" ho jaati hai. Baaki sare time — chahe D kuch bhi karta rahe, glitch kare, change ho — Q **bilkul waise ka waisa** rehta hai, change nahi hota.

**Truth Table (edge-triggered):**

| CLK (edge) | D | Q (next) |
|------------|---|----------|
| ↑ (rising) | 0 |    0     |
| ↑ (rising) | 1 |    1     |
| 0 or 1 (no edge) | X (kuch bhi) | Q (no change — hold) |

**Block diagram:**

```
        ┌─────────┐
   D ───┤ D       │
        │       Q ├──── Output
   CLK ─┤>CLK     │
        │       Q'├──── Complement
        └─────────┘
```

(Wo `>` symbol CLK input ke paas **edge-triggered** hone ka standard notation hai.)

**Real-life analogy — CCTV camera ka snapshot button:**

Socho ek CCTV camera hai jo continuously stream dekh raha hai (D input = live scene), lekin **photo tabhi click hota hai jab tum shutter button dabao** (clock edge). Button dabane ke turant pehle jo bhi scene camera ke saamne tha, wahi photo mein "freeze" ho jaata hai. Uske baad scene chahe kitna bhi badalta rahe, photo change nahi hoti — jab tak tum dobara shutter na dabao.

D flip-flop yehi karta hai: clock ke rising edge pe jo D pe value hai, usko "freeze" karke Q mein store kar leta hai.

> [!tip]
> **Misconception clear karna zaruri hai**: D flip-flop **level-triggered latch nahi** hai (jaise SR latch tha). Ye **edge-triggered** hai — sirf ek precise moment (clock ka 0→1 transition) pe hi value capture hoti hai. Ye difference bahut important hai kyunki isi wajah se D flip-flop predictable aur race-condition-free hai — jo CPU design ke liye zaruri property hai.

### SR aur JK Flip-Flop — Briefly

- **SR Flip-Flop**: SR latch ka clocked version. Same Set/Reset/Hold behavior, lekin ab sirf clock edge pe hi react karta hai. Problem: S=1,R=1 wala invalid state abhi bhi exist karta hai.
- **JK Flip-Flop**: SR ki invalid-state problem ko fix karta hai. Jab J=1 aur K=1 dono ho, to Q apna state **toggle** kar leta hai (0→1 ya 1→0) — koi invalid state nahi bachta. Isiliye JK flip-flop ko "improved SR flip-flop" bhi kehte hain, aur ye counters banane mein useful hota hai.

Practical mein, **D flip-flop hi sabse zyada use hota hai** registers, CPU pipelines, aur RAM cells banane ke liye — isliye humne isi pe zyada focus kiya. JK aur SR zyada tar academic/theoretical circuits mein ya specific counter designs mein dikhte hain.

**Quick comparison table:**

| Flip-Flop | Inputs | Invalid State? | Kahaan Use Hota Hai |
|-----------|--------|-----------------|----------------------|
| SR        | S, R   | Haan (S=R=1)    | Basic latches, rarely direct use |
| JK        | J, K   | Nahi (toggles)  | Counters, frequency dividers |
| D         | D      | Nahi            | **Registers, CPU pipelines, RAM cells** (most common) |

---

## Part 5: Registers — Flip-Flops Ka Group, CPU Ki Working Memory

### Kya hota hai?

Ek single D flip-flop sirf **1 bit** store kar sakta hai (0 ya 1). Lekin CPU ko to numbers store karne hain — jaise 8-bit, 16-bit, 32-bit, 64-bit values. Isliye simple trick: **N flip-flops ko parallel mein jodo**, sabko ek hi common clock signal do. Ye ban gaya ek **N-bit Register**.

```
   D0 ──►[D-FF 0]──► Q0   (bit 0)
   D1 ──►[D-FF 1]──► Q1   (bit 1)
   D2 ──►[D-FF 2]──► Q2   (bit 2)
   D3 ──►[D-FF 3]──► Q3   (bit 3)
              ▲
              │
         common CLK ── (sab flip-flops ek saath, same tick pe update hote hain)
```

Ye 4-bit register hai — ek saath 4 bits store kar sakta hai, jaise `1011`. Real CPU registers 32-bit ya 64-bit hote hain (32 ya 64 D flip-flops parallel mein), jinhe naam diye jaate hain jaise `EAX`, `RBX` (x86 mein) ya `R0`-`R15` (ARM mein).

### Registers Kaam Kaise Aate Hain — Ek Almirah Ki Tरह Socho

Ek almirah (cupboard) mein alag-alag **khaane (drawers)** hote hain, har khaana kisi specific cheez ke liye reserved hota hai (jaise ek khaana bills ke liye, ek documents ke liye). CPU registers bhi waise hi hain — chhoti, super-fast storage locations, sirf CPU ke andar, jinme CPU apne turant ke calculations ki values rakhta hai (jaise "instruction pointer kahaan hai", "abhi ka calculation result kya hai").

- Registers **RAM se bhi bahut zyada fast** hote hain — kyunki wo CPU chip ke andar hi bane hote hain, koi bus travel nahi karna padta.
- Lekin registers **bahut kam** hote hain (jaise 16-32 general-purpose registers) — jaise almirah mein limited drawers hote hain, sab kuch usme nahi rakh sakte.
- Isi wajah se memory hierarchy banti hai: Registers → Cache → RAM → Disk (detail `12-memory-hierarchy` mein).

### Register Ka Practical Use — Data Load Karna

Register ke saath usually ek **"Load" control signal** bhi hota hai — ye decide karta hai ki naya data accept karna hai ya purana wahi rakhna hai:

```
   New Data ──► [Register, with Load enable] ──► Stored Value
                        ▲
                        │
              Load = 1 → naya data clock edge pe capture hoga
              Load = 0 → purana value hold rahega (chahe clock tick bhi ho)
```

Ye exactly waise hi hai jaise tum apni tiffin ki almirah mein naya khaana daalne se pehle "lock khol" te ho (Load = 1), aur kaam ho jaane pe wapas "lock band" kar dete ho (Load = 0) — taki koi accidentally usme kuch daal na de.

### Registers Se Aage — Counters aur Shift Registers

Registers ka ek use sirf "store karna" nahi hai — thoda modification karke inse **counters** (jo apni value +1 karte rehte hain har clock tick pe — jaise CPU ka Program Counter jo agla instruction address track karta hai) aur **shift registers** (jo bits ko left/right shift karte hain — multiplication/division aur serial data transfer ke liye useful) bhi banaye jaate hain. Ye advanced topics agle chapters (jaise CPU architecture, 05) mein context ke saath aayenge.

---

## Sab Kuch Jodke Dekho — End-to-End Picture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Combinational       │     │  Sequential           │     │  CPU Building Block │
│  Logic Gates         │ ──► │  Circuits (Memory)    │ ──► │                     │
│  (AND, OR, XOR)      │     │  (Flip-Flops, Clock)  │     │                     │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
        │                            │                              │
        ▼                            ▼                              ▼
   Half/Full Adder            D Flip-Flop (1 bit)              Register (N bits)
   MUX / DEMUX                 + Clock synchronization           ALU + Registers
   (arithmetic + routing)      (state, memory)                   = CPU datapath (Ch. 05)
```

Yehi wo pipeline hai jisse ek chip banti hai: gates se arithmetic circuits bante hain, flip-flops se memory bante hai, aur registers ban ke ye CPU ke andar ki working memory bante hain, jisme har instruction cycle ke beech values store hoti hain (detail `07-instruction-cycle` mein milega).

---

## Key Takeaways

- **Combinational circuits** (adders, MUX/DEMUX) ka output sirf current input pe depend karta hai — koi memory nahi hoti.
- **Half-Adder** = XOR (Sum) + AND (Carry) — 2 bits add karta hai, koi incoming carry handle nahi karta.
- **Full-Adder** = 2 Half-Adders + OR gate — 3 inputs (A, B, Cin) leta hai, multi-bit addition ke liye zaruri hai.
- **Ripple-Carry Adder** = full-adders ki chain, jisme carry ek se doosre mein "beh" ta hai — simple lekin slow; real CPUs carry-lookahead jaisi fast designs use karte hain.
- **MUX** kai inputs mein se ek select karta hai; **DEMUX** ek input ko kai outputs mein route karta hai.
- **Sequential circuits** mein output current input *aur* purani state dono pe depend karta hai — yehi memory ka origin hai, feedback loop ki wajah se.
- **SR Latch** basic memory unit hai lekin isme invalid state (S=R=1) ki problem hoti hai, aur ye level-sensitive hai (unpredictable).
- **Clock signal** ek oscillating rhythm hai jo poore circuit ko synchronize karta hai — bina isse har flip-flop apni marzi se update hota, chaos ho jaata.
- **D Flip-Flop** sabse important memory element hai — clock ke **rising edge** pe D ki value ko Q mein "freeze" kar leta hai; baaki time output stable rehta hai (jaise CCTV camera ka snapshot).
- **JK Flip-Flop** SR ki invalid-state problem fix karta hai (toggle behavior), mostly counters mein use hota hai; practical CPU design mein **D flip-flop hi dominant** hai.
- **Register** = N D-flip-flops parallel mein, common clock ke saath — ek saath N bits store karta hai (jaise 32-bit ya 64-bit CPU registers).
- Registers, cache, RAM, disk — ye sab ek **memory hierarchy** banate hain jahan speed aur size mein trade-off hota hai (detail age ke chapters mein).
- Bina flip-flops/registers ke, CPU ke paas koi "state" nahi hoti — har instruction independent hoti, aur loops, variables, ya program counter jaisi cheezein possible hi nahi hotin.

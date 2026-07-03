# Addressing Modes

## Kya Seekhoge Is Chapter Mein?

Pichle chapter mein humne dekha ki CPU instruction cycle mein **Fetch → Decode → Execute** karta hai. Execute step mein CPU ko pata hona chahiye ki actual data (operand) kahan padi hai — kya woh instruction ke andar hi likhi hai, kisi register mein hai, ya RAM ke kisi address pe baithi hai?

Yehi decide karta hai **Addressing Mode** — ki ek instruction apne operand ko *kaise* refer karti hai. Is chapter mein cover karenge:

- Addressing modes kyun exist karte hain (flexibility ka game)
- Immediate, Direct, Indirect, Register, Indexed, aur Base-Register addressing — har ek ka concrete example
- Compiler array aur pointer access ke liye kaunsa addressing mode choose karta hai, aur kyun
- Common confusions jo beginners ko hoti hain

> [!info]
> Agar tumne abhi tak **Instruction Set Architecture** (chapter 06) aur **Instruction Cycle** (chapter 07) nahi padha, ek baar unpe nazar daal lo — wahan "opcode + operand" ka basic structure explain kiya gaya hai jo yahan kaam aayega.

## Kya Hota Hai Addressing Mode? Kyun Zaruri Hai?

Ek machine instruction basically do parts ka combo hota hai:

```
┌───────────────┬──────────────────────────┐
│    OPCODE     │   OPERAND SPECIFIER(S)   │
│ (kya karna hai)│ (kis data pe karna hai) │
└───────────────┴──────────────────────────┘
      e.g. ADD          R1, R2, 100
```

Opcode batata hai operation (`ADD`, `MOV`, `SUB`, etc.), lekin **operand specifier sirf ek number ya code hota hai** — aur ye number kaise interpret hoga, ye "addressing mode" decide karta hai.

Socho ek dabbawala ko address diya jata hai. Woh address kai tarah ka ho sakta hai:
- **"Seedha ye tiffin le jao"** — data khud hi tumhare paas hai (immediate)
- **"Building number 42 pe jao"** — ek fixed, direct address (direct)
- **"Us building ke watchman se poocho ki asli address kya hai"** — pehle ek jagah jao, wahan se asli address milega (indirect)
- **"Tumhare pocket mein jo chit hai, wahi address hai"** — ek register mein value already hai (register)
- **"Building 42 se 5 ghar aage"** — base address + offset (indexed/base)

Yehi real-world flexibility CPU ko bhi chahiye. Agar sirf ek hi tarika hota data refer karne ka (jaise sirf "fixed address"), toh:

1. **Arrays aur loops likhna impossible ho jata** — har element ka address hardcode karna padta
2. **Pointers ka concept hi nahi ban pata** — jo tumhare C/C++ background se already familiar hai
3. **Relocatable code** (jo kahin bhi load ho sake) likhna mushkil ho jata
4. **Instruction encoding bahut lambi ho jati** — har baar poora 64-bit address likhna padta, chhoti values ke liye bhi

### Kyun Zaruri Hai — Teen Bade Fayde

| Fayda | Explanation |
|---|---|
| **Compact code** | Immediate/register modes se short instructions ban sakti hain (poora address likhne ki zarurat nahi) |
| **Flexibility** | Ek hi instruction format se arrays, pointers, structs, loops sab handle ho jate hain |
| **Relocatability** | Base-register jaisa addressing use karke code ko memory mein kahin bhi load kiya ja sakta hai, bina usse rewrite kiye |

> [!tip]
> Addressing modes ko "CPU ka operand-finding GPS" samjho — opcode bolta hai "kahan jaana hai", addressing mode bolta hai "wahan tak pahunchne ka route kya hai".

## Overview Table — Sabhi Modes Ek Nazar Mein

| Addressing Mode | Operand Kahan Hai? | Memory Access Zaruri? | Typical Use Case |
|---|---|---|---|
| **Immediate** | Instruction ke andar hi | Nahi | Constants (`x = 5`) |
| **Direct (Absolute)** | Fixed memory address instruction mein likha | Ek baar | Global variables |
| **Indirect** | Memory location jo *khud ek address store karta hai* | Do baar | Pointers, pointer-to-pointer |
| **Register** | CPU register mein | Nahi | Loop counters, temp values |
| **Register Indirect** | Memory, jiska address ek register mein hai | Ek baar | Pointer dereferencing (`*p`) |
| **Indexed** | Base address + Index register (variable offset) | Ek baar | Array access (`arr[i]`) |
| **Base-Register** | Base register + Fixed displacement | Ek baar | Struct fields, relocatable code |

Ab har ek ko detail mein, example ke saath samajhte hain.

## 1. Immediate Addressing

**Kya hota hai?** Operand khud instruction ke andar hi encode kiya hota hai — koi memory ya register lookup ki zarurat nahi. Sabse fast mode hai kyunki value already CPU ke paas hai (fetch hote hi mil jati hai).

```
Instruction:  MOV R1, #5
                     └── "5" khud instruction mein likha hai (immediate value)
```

**Real-world analogy**: Jaise koi tumhe bole "seedha 500 rupaye de do" — koi bank account check karne ki zarurat nahi, amount already clear hai.

```
CPU Instruction Format:
┌─────────┬──────┬────────┐
│  OPCODE │  R1  │   #5   │  ← operand value directly yahan
└─────────┴──────┴────────┘
              │        │
              ▼        ▼
          Register    Value 5 ko seedha R1 mein daal do
```

**C code se connection**:
```c
int x = 5;   // compiler generate karega: MOV R1, #5
```

- **Fayda**: Sabse fast — extra memory access nahi
- **Limitation**: Value ka size instruction ki width se limited hai (32-bit instruction mein bahut bada immediate value fit nahi hoga)

> [!warning]
> Common misconception: "Immediate" ka matlab "turant execute hoga" nahi hai — matlab hai value **immediately available hai instruction ke andar hi**, koi lookup nahi chahiye.

## 2. Direct (Absolute) Addressing

**Kya hota hai?** Instruction mein operand ka **poora memory address** directly likha hota hai. CPU us address pe jaake data fetch karta hai — ek hi memory access lagti hai.

```
Instruction:  MOV R1, [1000]
                       └── ye ek fixed memory address hai

Memory:
Address   Value
─────────────────
  998      ...
  999      ...
 1000  →   42      ← CPU seedha yahan jaake value uthata hai
 1001      ...
```

**Real-world analogy**: Jaise koi bole "Flat number 1000 pe jaake parcel utha lao" — address fix hai, tumhe seedha wahan jaana hai, koi extra poochhtaachh nahi.

**C code se connection**:
```c
int global_counter = 0;   // global variable

void increment() {
    global_counter++;     // compiler: LOAD R1, [0x601040]  (fixed address)
                          //           ADD R1, #1
                          //           STORE [0x601040], R1
}
```

Global aur static variables ka address compile/link time pe fix ho jata hai, isliye compiler direct addressing use karta hai unke liye — bilkul waise jaise pichle chapter (Logical vs Physical Addresses) mein "Data" aur "BSS" segments discuss hue the.

- **Fayda**: Simple, predictable
- **Limitation**: Address range instruction ki bit-width tak limited hota hai; code relocate nahi kar sakte (address hardcoded hai)

## 3. Indirect Addressing

**Kya hota hai?** Instruction mein diya gaya address, **actual data ka address nahi hai** — balki woh ek aisi memory location ka address hai jo *khud ek aur address store karti hai*. Matlab do hops lagte hain: pehle "pointer ka address" pe jao, wahan se "asli address" nikaalo, phir wahan jaake data lao.

```
Instruction:  MOV R1, [[1000]]
                        └────┴── double bracket = indirect

Memory:
Address    Value
──────────────────
 1000  →   2000     ← ye ek address hai (pointer)
  ...
 2000  →   77       ← asli data yahan hai

Steps:
1. Address 1000 pe jao       → wahan value milti hai: 2000
2. Ab 2000 ko address maano  → wahan jaake asli data uthao: 77
3. R1 = 77
```

**Real-world analogy**: Jaise tum apne dost se poochte ho "Ravi kahan rehta hai?" aur woh bolta hai "Sharma ji ke ghar jaake poochho" — Sharma ji ka ghar khud destination nahi hai, wahan se tumhe asli address milega, tabhi tum Ravi tak pahunchoge.

**C code se connection** — pointer-to-pointer:
```c
int value = 77;
int *ptr = &value;      // ptr, value ka address store karta hai
int **ptr_to_ptr = &ptr; // ptr_to_ptr, ptr ka address store karta hai

int result = **ptr_to_ptr;  // do dereferences — indirect addressing jaisa hi concept
```

- **Fayda**: Bahut flexible — dynamic data structures (linked lists, trees) mein essential hai, jahan ek node doosre node ka address store karta hai
- **Limitation**: **Do memory accesses lagte hain** — pehla wala mode (direct) se dheema hota hai, kyunki har extra memory access latency add karta hai

> [!info]
> Ye wahi concept hai jo tum Node.js/JS mein object references ke roop mein daily use karte ho — jab tum `const b = a` likhte ho (object ke case mein), `b` khud object nahi hai, balki `a` jahan point kar raha hai wahi memory location ka reference hai. Hardware level pe ye indirect addressing jaisa hi mental model hai.

## 4. Register Addressing

**Kya hota hai?** Operand ek CPU register mein directly stored hota hai — koi memory access hi nahi lagti. Registers CPU ke andar hi hote hain (SRAM se bhi fast), isliye ye **sabse fast addressing mode** hai memory-based modes mein se.

```
Instruction:  ADD R1, R2
                    │    └── operand register R2 mein hai
                    └── destination bhi register R1

CPU Registers:
┌────┬────┬────┬────┐
│ R0 │ R1 │ R2 │ R3 │
├────┼────┼────┼────┤
│ 0  │ 10 │ 5  │ 0  │
└────┴────┴────┴────┘

After ADD R1, R2:  R1 = 10 + 5 = 15
```

**Real-world analogy**: Jaise tumhare pocket mein hi paisa hai — kisi bank ya locker mein jaane ki zarurat nahi, seedha nikaal ke use kar lo.

**C code se connection**:
```c
int a = 10, b = 5;
int c = a + b;
// Compiler kosis karta hai a aur b ko registers mein rakhne ki
// (agar enough registers available hain):
// MOV R1, #10
// MOV R2, #5
// ADD R3, R1, R2
```

- **Fayda**: Sabse fast — koi memory latency nahi
- **Limitation**: Registers limited hote hain (typically 16-32 general purpose registers modern CPU mein) — isliye compiler ko carefully decide karna padta hai kaunsi variables register mein rakhein ("register allocation" — compiler design ka ek pura topic hai)

> [!tip]
> Yehi wajah hai ki tight loops mein loop counter (`i`) hamesha register mein rakha jata hai, na ki RAM mein — har iteration pe memory access karna bahut expensive pad jata.

## 5. Register Indirect Addressing (Bonus — Pointers Ka Foundation)

Ye register aur indirect ka combo hai — bahut common hai isliye alag se samajhna zaruri hai.

**Kya hota hai?** Register khud data store nahi karta — balki register mein **memory ka address** hota hai. CPU register ki value ko address maankar memory access karta hai.

```
Instruction:  MOV R1, [R2]
                     └── R2 ke andar jo value hai, use address samjho

Registers:            Memory:
┌────┬──────┐         Address   Value
│ R2 │ 2000 │  ──────►  2000  →   77
└────┴──────┘

R1 = value at address 2000 = 77
```

**C code se connection**:
```c
int value = 77;
int *ptr = &value;   // ptr register mein address rakhta hai

int x = *ptr;         // dereference — register indirect addressing:
                      // MOV R2, ptr_address   (R2 mein pointer load)
                      // MOV R1, [R2]          (R2 ka address use karke value fetch karo)
```

- **Fayda**: Direct indirect se fast hai (ek hi memory access — kyunki pointer khud register mein hai, RAM mein nahi)
- **Use case**: Ye exact wahi mechanism hai jo C ke pointers (`*ptr`), linked lists, aur function parameters (pass by reference) ke peeche kaam karta hai

## 6. Indexed Addressing

**Kya hota hai?** Ek **base address** hota hai (jo fix hota hai) aur ek **index register** hota hai (jo variable/changing hota hai). Final address = Base + Index. Ye **array access** ke liye perfect mode hai.

```
Instruction:  MOV R1, [Base + Rindex]
                       (Base = array ka starting address, Rindex = element number)

Memory (array 'arr' starting at address 2000, har int 4 bytes ka):
Address   Value        Index
──────────────────────────────
 2000  →   10            arr[0]
 2004  →   20            arr[1]
 2008  →   30            arr[2]
 2012  →   40            arr[3]

Agar Rindex = 8 (yaani index 2 * 4 bytes), toh:
Address = 2000 (Base) + 8 (Rindex) = 2008
R1 = 30   (yehi hai arr[2])
```

**Real-world analogy**: Jaise ek railway coach mein seat number — "Coach S4" (base) + "Seat 23" (index) = tumhari exact seat. Coach fixed hai, seat number badalta rehta hai trip to trip.

**C code se connection** — ye sabse important real-world case hai:
```c
int arr[5] = {10, 20, 30, 40, 50};

for (int i = 0; i < 5; i++) {
    printf("%d\n", arr[i]);
}

// Compiler generate karega (conceptually):
// Base register  = address of arr (e.g. 2000)
// Index register = i * sizeof(int)   ← scaling zaruri hai! (4 bytes per int)
// LOAD R1, [Base + Index]
```

> [!warning]
> **Gotcha jo bahut logon ko confuse karta hai**: `arr[i]` ka matlab hardware level pe `Base + i` nahi hota — balki `Base + (i * element_size)` hota hai. Isiliye `int` array mein index 2 ka actual byte-offset 8 hota hai (2 × 4 bytes), na ki 2. Compiler ye scaling automatically insert karta hai, aur kai CPU architectures (x86 included) mein instruction ke andar hi ek "scale factor" field hota hai (1x, 2x, 4x, 8x) taaki ye multiplication free mein ho jaye, bina extra instruction ke.

- **Fayda**: Arrays, strings, aur loops ke liye ekdum natural fit
- **Variants**: Kai CPUs mein "auto-increment/auto-decrement indexed addressing" bhi hota hai, jahan har access ke baad index register khud-ba-khud badh/ghat jata hai — bahut useful hota hai array traversal ya string processing mein (jaise C ka `*ptr++`)

## 7. Base-Register Addressing

**Kya hota hai?** Indexed jaisa hi lagta hai, lekin concept thoda different hai — yahan ek **base register** hota hai (jo kisi bhi memory region ka starting point store karta hai, jaise ek struct ya ek process ka data segment), aur instruction mein ek **fixed displacement (constant offset)** hoti hai. Final address = Base Register + Displacement.

```
Instruction:  MOV R1, [Rbase + 8]
                        (Rbase = kisi struct/segment ka starting address, 8 = fixed offset)

Memory (struct 'Employee' starting at address jo Rbase mein hai, say 3000):
struct Employee {
    int id;       // offset 0
    int age;      // offset 4
    float salary; // offset 8
};

Rbase = 3000

Address = 3000 (Rbase) + 8 (fixed displacement) = 3008
R1 = value at 3008  → yehi hai salary field!
```

**Real-world analogy**: Jaise ek apartment building ka gate address fixed hai (base), aur har flat ka apna fixed floor/door number hai us gate se (displacement) — "Gate No. 5" + "3rd floor" = exact flat, chahe poori building kahin bhi shift ho jaye, relative position wahi rehta hai.

**C code se connection** — struct field access:
```c
struct Employee {
    int id;
    int age;
    float salary;
};

struct Employee *emp = get_employee();  // emp = base address (register mein)

float s = emp->salary;
// Compiler: LOAD R1, [Rbase + 8]   ← base register (emp) + fixed offset (8, salary ka position)
```

**Base-register addressing ka doosra bada use — Relocatable Code**:

Jaise tumne pichle chapter (Logical vs Physical Addresses) mein padha tha, MMU **Base + Limit registers** use karke logical ko physical address mein translate karta hai. Wahi exact mechanism hai — poora process ka code "Base Register" ke relative addresses use karta hai, isliye process ko memory mein kahin bhi load karo (base register update karke), instructions khud kabhi change nahi karni padti.

- **Fayda**: Struct/object field access ekdum efficient; code relocatable ban jata hai
- **Indexed vs Base-Register mein fark**: Indexed mein "index" **variable** hota hai (runtime pe badalta hai — jaise loop counter), Base-Register mein "displacement" **fixed constant** hota hai (compile time pe hi tay ho jata hai — jaise struct field ka position). Kai baar dono ko combine bhi kiya jata hai (Base + Index + Displacement) — complex array-of-structs access ke liye.

> [!tip]
> Agar confuse ho rahe ho Indexed vs Base-Register mein — simple trick: **"Index badalta hai, Base+Displacement fix rehta hai (per-access)"**. `arr[i]` mein `i` loop ke har iteration mein badalta hai (Indexed). `emp->salary` mein `8` (salary ka offset) kabhi nahi badalta — sirf `emp` (base) badal sakta hai jab tum doosre employee ka pointer lo (Base-Register).

## Comparison — Sab Modes Ek Saath

```
                    Kitne Memory Access Lagte Hain?
                    ───────────────────────────────
Immediate       →   0   (value instruction mein hi)
Register        →   0   (value register mein hi)
Direct          →   1   (seedha memory se)
Register Indir. →   1   (register se address, phir memory se value)
Indexed         →   1   (Base + Index calculate karke memory se)
Base-Register   →   1   (Base + Displacement calculate karke memory se)
Indirect        →   2   (pehle memory se address, phir usse memory se value)
```

| Mode | Speed | Flexibility | Typical Use |
|---|---|---|---|
| Immediate | Fastest | Low (fixed constant) | Constants, literals |
| Register | Fastest | Medium (limited registers) | Loop vars, temporaries |
| Direct | Fast | Low (fixed address) | Globals, statics |
| Register Indirect | Fast | High | Pointer dereference |
| Indexed | Fast | High | Array access |
| Base-Register | Fast | High | Struct fields, relocation |
| Indirect | Slower (2 accesses) | Highest | Pointer-to-pointer, jump tables |

> [!warning]
> Common misconception: "Zyada flexible mode = hamesha better." Galat! Har extra flexibility (indirect jaisi) ka matlab hota hai **extra memory access = extra latency**. Yehi wajah hai ki compilers hamesha koshish karte hain simplest possible addressing mode use karne ki (register > immediate > direct > indexed > indirect), jahan tak ho sake.

## Compiler Kaise Decide Karta Hai Kaunsa Mode Use Karna Hai?

Ab dekhte hain end-to-end — jab tum ek normal C loop likhte ho jo array traverse karta hai, compiler internally kaunse addressing modes chain karta hai.

```c
int arr[100];

int sum_array() {
    int sum = 0;
    for (int i = 0; i < 100; i++) {
        sum += arr[i];
    }
    return sum;
}
```

**Compiler ka thought process** (simplified, ekdum RISC-jaisi generic assembly mein):

```
MOV  R1, #0            ; sum = 0           → Immediate addressing
MOV  R2, #0            ; i = 0             → Immediate addressing
MOV  R3, #arr_base     ; R3 = &arr[0]      → Immediate (address as constant)

LOOP:
CMP  R2, #100          ; i < 100 ?         → Register + Immediate
JGE  END

MOV  R4, R2            ; temp = i
SHL  R4, #2            ; temp = i * 4      → scaling for int (4 bytes)
ADD  R5, R3, R4        ; R5 = arr_base + (i*4)   → INDEXED ADDRESSING yahan hoti hai
LOAD R6, [R5]          ; R6 = arr[i]       → memory fetch using computed address
ADD  R1, R1, R6        ; sum += arr[i]     → Register addressing

ADD  R2, R2, #1        ; i++               → Register + Immediate
JMP  LOOP

END:
MOV  RET, R1           ; return sum        → Register addressing
```

Notice karo kitne different modes ek chhoti si loop mein use ho rahe hain:
- **Immediate** — constants jaise `0`, `100`, `4`, `1`
- **Register** — loop variables `sum`, `i`, temporaries
- **Indexed** — `arr[i]` ka actual memory access

**Ab pointer version dekhte hain** — same logic, lekin pointer arithmetic ke through:

```c
int sum_array_ptr() {
    int sum = 0;
    int *p = arr;
    int *end = arr + 100;
    while (p < end) {
        sum += *p;    // Register Indirect Addressing!
        p++;          // pointer khud increment ho raha hai
    }
    return sum;
}
```

```
MOV  R1, #0           ; sum = 0
MOV  R3, #arr_base    ; p = &arr[0]
MOV  R7, #arr_base_end

LOOP:
CMP  R3, R7
JGE  END

LOAD R6, [R3]         ; sum += *p        → REGISTER INDIRECT ADDRESSING
ADD  R1, R1, R6
ADD  R3, R3, #4       ; p++ (4 bytes aage, kyunki int)  → Immediate + Register

JMP LOOP
END:
```

**Interesting observation**: Array-indexing version (`arr[i]`) **Indexed Addressing** use karti hai (Base + calculated offset, jo har iteration mein recompute hota hai), jabki pointer version (`*p`) **Register Indirect Addressing** use karti hai (register khud address hold karta hai aur directly increment hota hai). Real CPUs pe pointer version thodi fast ho sakti hai kyunki multiplication (`i * 4`) nahi karni padti — bas seedha pointer ko 4 add karo. Yehi wajah hai purane zamane mein (jab compilers itne smart nahi the) C programmers manually `arr[i]` ki jagah pointer arithmetic likhte the performance ke liye. Aajkal modern optimizing compilers (GCC, Clang) dono ko same efficient code mein convert kar dete hain — is trick ko **"strength reduction"** kehte hain.

**Struct field access** — Base-Register addressing in action:

```c
struct Point { int x; int y; };

int get_x(struct Point *p) {
    return p->x;    // → LOAD R1, [Rp + 0]   (Base-Register: base=p, displacement=0)
}

int get_y(struct Point *p) {
    return p->y;    // → LOAD R1, [Rp + 4]   (Base-Register: base=p, displacement=4)
}
```

Yahan `p` register mein base address hai, aur `x`/`y` ke offsets (`0` aur `4`) compile time pe hi fix ho jate hain struct definition dekh ke — isliye ye classic Base-Register addressing hai.

> [!info]
> **2D array access** (`matrix[i][j]`) is sabka combination use karta hai — Base (matrix ka start) + Index1 (row, scaled by row-width) + Index2 (column, scaled by element size). Kuch CPU architectures mein isके liye direct "Base + Index*Scale + Displacement" wala single addressing mode hota hai (x86 mein isko **SIB — Scale-Index-Base** addressing kehte hain), taaki ye poora calculation ek hi instruction mein ho jaye.

## Real CPU Mein Ye Modes Kaise Dikhte Hain

Different architectures ke syntax alag hote hain, lekin concept wahi rehta hai:

| Concept | x86 Syntax Example | ARM Syntax Example |
|---|---|---|
| Immediate | `MOV EAX, 5` | `MOV R0, #5` |
| Direct | `MOV EAX, [0x1000]` | `LDR R0, =0x1000` |
| Register | `MOV EAX, EBX` | `MOV R0, R1` |
| Register Indirect | `MOV EAX, [EBX]` | `LDR R0, [R1]` |
| Indexed | `MOV EAX, [EBX + ESI*4]` | `LDR R0, [R1, R2, LSL #2]` |
| Base + Displacement | `MOV EAX, [EBX + 8]` | `LDR R0, [R1, #8]` |

> [!tip]
> Agli baar jab tum `gcc -S file.c` chalao (assembly output generate karne ke liye) ya kisi debugger mein disassembly dekho, in patterns ko dhoondhna — tumhe seedha dikhega ki compiler ne array access ke liye kaunsa addressing mode choose kiya.

## Key Takeaways

- **Addressing mode** decide karta hai ki ek instruction apne operand ko kaise locate karti hai — instruction ke andar, register mein, ya memory mein
- **Immediate** — value instruction mein hi hoti hai; fastest, koi memory access nahi (constants ke liye)
- **Direct (Absolute)** — instruction mein fixed memory address hota hai; ek memory access (global/static variables ke liye)
- **Indirect** — instruction ka address, ek aur address ka location batata hai; do memory accesses lagte hain (pointer-to-pointer, dynamic structures)
- **Register** — operand CPU register mein hi hota hai; sabse fast (loop counters, temporaries)
- **Register Indirect** — register khud memory ka address hold karta hai; ek memory access (`*ptr` dereferencing ka foundation)
- **Indexed** — Base address + variable Index register; array access (`arr[i]`) ke liye natural fit, scaling (element size se multiply) automatically hoti hai
- **Base-Register** — Base register + fixed displacement; struct field access aur relocatable code ke liye use hota hai
- Compilers **simplest/fastest mode** choose karne ki koshish karte hain jahan possible ho — extra memory access (indirect jaisa) hamesha performance cost laata hai
- Array access (`arr[i]`) typically Indexed Addressing banati hai, jabki pointer dereference (`*p`) Register Indirect Addressing — dono ka underlying hardware behavior alag hai, chahe C code mein similar dikhein
- Deeper OS-level context (jaise Base/Limit registers MMU translation ke liye kaise use hote hain) **operating_systems/03_memory_management/02_address_spaces.md** mein already cover ho chuka hai — yahan wahi concept instruction-level operand addressing ke context mein dekha gaya

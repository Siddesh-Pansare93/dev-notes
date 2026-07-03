# Number Systems & Data Representation

Socho tum Zomato pe order de rahe ho. Tumhare liye woh "Chicken Biryani, Qty: 2, Total: ₹398" hai. Lekin jo request Zomato ke server tak jaati hai, wahan yeh sab kuch numbers ban jaata hai — item ID, quantity, price, sab kuch. Aur jo server hai na, uske andar jo CPU baitha hai, woh toh numbers bhi apni bhasha mein nahi samajhta — usse sirf do cheezein samajh aati hain: **current hai ya nahi hai**. On ya off. Bas.

Yehi is chapter ka core hai — computer ke andar **har cheez** — chahe woh tumhara naam ho, ek photo ho, gaana ho, ya `for` loop ho — sirf aur sirf 0 aur 1 ke roop mein store hoti hai. Aaj hum seekhenge ki yeh 0/1 ki duniya se hum apne decimal numbers, negative numbers, decimals (point wale), aur text tak kaise pahunchte hain.

---

## 1. Computer sirf binary kyun samajhta hai?

### Kya hota hai?

Computer ke andar ek chhota sa switch hota hai jise **transistor** kehte hain — aaj ke CPU mein arbo-arab (billions) transistors hote hain (jaise ek modern CPU mein 10-50+ billion transistors hote hain, ek pin ki nok jitni jagah mein).

Ek transistor bas itna kaam karta hai:
- Current flow ho raha hai → state "ON" → hum ise **1** bolते hain
- Current flow nahi ho raha → state "OFF" → hum ise **0** bolते hain

### Kyun zaruri hai? (Analogy)

Socho tumhare ghar ka **light switch** — usme koi "medium bright" setting nahi hoti (dimmer switch alag baat hai), bas ON ya OFF. Ab imagine karo agar switch ko yeh samajhna padta ki current "60% flow ho raha hai ya 73%?" — yeh unreliable ho jaayega. Thoda sa voltage fluctuation aaya (jo real world mein hota hi hai — heat, noise, interference ki wajah se) toh reading galat ho jaayegi.

Lekin agar sirf do hi states hain — HIGH voltage (jaise 3.3V ya 5V) aur LOW voltage (0V ke aas-paas) — toh chhoti si fluctuation bhi problem nahi karti, kyunki system sirf yeh check karta hai "yeh threshold se upar hai ya neeche?" Isliye binary **reliable** hai — electrical noise ke against robust hai.

> [!info]
> Iska deeper hardware-level version (transistors kaise banate hain logic gates, aur gates kaise banate hain circuits) tum agle chapter **"Boolean Algebra and Logic Gates"** mein padhoge. Abhi ke liye bas itna samjho: **binary = hardware ki majboori, convenience nahi.**

Toh matlab jab tum `let x = 5` likhte ho JavaScript mein, computer ke andar kahin RAM ke ek chhote se corner mein woh `00000101` (8-bit mein) ban ke baitha hota hai — bas transistors ka combination: OFF-OFF-OFF-OFF-OFF-ON-OFF-ON.

---

## 2. Number Systems — Base ka concept

Har number system ka ek **base (radix)** hota hai — yeh batata hai ki har position mein kitne alag digits use ho sakte hain.

| System | Base | Digits Used | Example |
|---|---|---|---|
| **Binary** | 2 | 0, 1 | `1011` |
| **Octal** | 8 | 0-7 | `17` |
| **Decimal** | 10 | 0-9 | `156` |
| **Hexadecimal** | 16 | 0-9, A-F | `9C` |

### Yeh sab exist kyun karte hain?

- **Decimal (base 10)** — hum insaan use karte hain kyunki humari 10 ungliyaan hain (fingers se ginti seekhi thi bachpan mein!).
- **Binary (base 2)** — computer hardware ke liye, jaisा upar discuss kiya.
- **Octal (base 8)** aur **Hexadecimal (base 16)** — yeh dono binary ka hi "shorthand" hain. Insaan ke liye lambi binary strings (`101011001110`) padhna aankhon ko thakaata hai aur mistakes hone ke chances badhte hain. Hex mein wahi cheez chhoti aur clean dikhti hai.

> [!tip]
> Tumne agar kabhi CSS color code likha hai jaise `#FF5733`, ya JS mein memory address dekha hai jaise `0x7ffeeb1a2c08`, ya `Buffer` ka hex dump dekha hai Node.js mein — yeh sab **hexadecimal** hai! Tum already hex use kar rahe ho, bas pata nahi tha.

### Positional Value System

Har number system mein, ek digit ki **actual value** uski **position** pe depend karti hai. Yeh formula yaad rakho:

```
Number = (digit × base^position), sabko add karo
Position dayein se shuru hoti hai 0 se
```

Decimal mein `156` ka matlab:
```
1 × 10² + 5 × 10¹ + 6 × 10⁰
= 100 + 50 + 6 = 156
```

Yehi logic har base pe chalta hai — sirf base badalta hai.

---

## 3. Decimal → Binary Conversion

### Method: Divide by 2 (Remainder method)

Number ko 2 se divide karte jao, remainder note karte jao, jab tak quotient 0 na ho jaaye. Phir remainders ko **neeche se upar** (reverse order) padho.

**Example: 156 ko binary mein convert karo**

```
156 ÷ 2 = 78   remainder 0   ↑
 78 ÷ 2 = 39   remainder 0   |
 39 ÷ 2 = 19   remainder 1   |  neeche se upar
 19 ÷ 2 =  9   remainder 1   |  padho
  9 ÷ 2 =  4   remainder 1   |
  4 ÷ 2 =  2   remainder 0   |
  2 ÷ 2 =  1   remainder 0   |
  1 ÷ 2 =  0   remainder 1   |
```

Answer (neeche se upar padhke): **10011100**

Verify karte hain: `128+16+8+4 = 156` ✓ (position values niche table mein)

### Binary → Decimal Conversion

Har bit ki position value nikaalo aur jahan 1 hai unko add kar do.

```
Binary:        1   0   0   1   1   1   0   0
Position:      7   6   5   4   3   2   1   0
Value (2^pos): 128 64  32  16  8   4   2   1
                ↓           ↓   ↓   ↓
Included?      1   0   0   1   1   1   0   0
```

`128 + 16 + 8 + 4 = 156` ✓

> [!tip]
> Powers of 2 zubaani yaad kar lo, life bahut easy ho jaayegi: **1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024...** Yeh RAM sizes, array indexing, buffer sizes — sabme kaam aata hai. `1024 bytes = 1 KB` bhi isi wajah se hai, base-10 ka 1000 nahi.

---

## 4. Decimal ↔ Octal

Octal mein exact wahi process hai, bas base 8 use karo.

**Example: 156 ko octal mein convert karo**

```
156 ÷ 8 = 19   remainder 4   ↑
 19 ÷ 8 =  2   remainder 3   |
  2 ÷ 8 =  0   remainder 2   |
```

Answer: **234₈** (neeche se upar: 2, 3, 4)

Verify: `2×64 + 3×8 + 4×1 = 128 + 24 + 4 = 156` ✓

Octal → Decimal: same weighted-sum trick, bas base 8 ke powers use karo (`8⁰=1, 8¹=8, 8²=64...`).

> [!info]
> Octal aajkal kam use hota hai (Unix file permissions jaise `chmod 755` mein dikhta hai — woh octal hi hai!), lekin hex zyada popular hai kyunki woh binary ke saath perfectly 4-bit align hota hai (aage dekhenge).

---

## 5. Decimal ↔ Hexadecimal

Hex mein 16 digits chahiye per position, lekin humare paas sirf 0-9 hain. Toh 10-15 ke liye letters use karte hain:

| Decimal | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|
| Hex | A | B | C | D | E | F |

**Example: 156 ko hex mein convert karo**

```
156 ÷ 16 = 9   remainder 12 → C   ↑
  9 ÷ 16 = 0   remainder 9  → 9   |
```

Answer: **9C₁₆** (neeche se upar: 9, C)

Verify: `9×16 + 12×1 = 144 + 12 = 156` ✓

### Sabse important shortcut: Binary ↔ Hex (Direct Conversion)

Yeh sabse zyada use hone wali trick hai. Kyunki `16 = 2⁴`, **har hex digit exactly 4 binary bits ke barabar hota hai**. Isliye conversion divide karke nahi, seedha **grouping** karke hoti hai.

```
Binary:    1001 1100
Group of 4 bits each ↓
           1001 = 9
           1100 = C

Hex: 9C
```

Isse ulta bhi seedha hai — har hex digit ko uske 4-bit binary se replace kar do:

```
Hex:   9    C
       ↓    ↓
     1001  1100

Binary: 10011100
```

> [!tip]
> Yehi wajah hai ki programmers hex ko itna pasand karte hain — 1 byte (8 bits) = exactly 2 hex digits. `0xFF` = `11111111` = 255. Jab bhi tum memory dump, color code, ya MAC address (`3C:A9:F4:...`) dekhoge, ismein yehi logic chal raha hai.

### Quick Reference Table (0-15)

| Decimal | Binary | Octal | Hex |
|---|---|---|---|
| 0 | 0000 | 0 | 0 |
| 1 | 0001 | 1 | 1 |
| 2 | 0010 | 2 | 2 |
| 3 | 0011 | 3 | 3 |
| 4 | 0100 | 4 | 4 |
| 5 | 0101 | 5 | 5 |
| 6 | 0110 | 6 | 6 |
| 7 | 0111 | 7 | 7 |
| 8 | 1000 | 10 | 8 |
| 9 | 1001 | 11 | 9 |
| 10 | 1010 | 12 | A |
| 11 | 1011 | 13 | B |
| 12 | 1100 | 14 | C |
| 13 | 1101 | 15 | D |
| 14 | 1110 | 16 | E |
| 15 | 1111 | 17 | F |

---

## 6. Bits, Nibbles, Bytes, Words

Pehle terminology clear kar lete hain, kyunki aage yeh baar-baar aayega:

```
1 Bit    = single 0 ya 1                     (smallest unit)
1 Nibble = 4 bits                            (1 hex digit)
1 Byte   = 8 bits                            (2 hex digits, jaise 0xFF)
1 Word   = CPU architecture pe depend karta hai
           (32-bit CPU → 4 bytes, 64-bit CPU → 8 bytes)
```

```
┌─────────────────── 1 Byte (8 bits) ───────────────────┐
│  Nibble 1 (4 bits)  │  Nibble 2 (4 bits)               │
│      1001           │      1100                        │
└─────────────────────┴───────────────────────────────────┘
         9                      C           → Hex: 9C
```

1 byte se max **256 values** represent ho sakti hain (0 se 255), kyunki `2⁸ = 256`. Yehi wajah hai ki:
- ASCII characters 0-127 mein fit hote hain (7 bits)
- RGB color values 0-255 tak jaate hain (`rgb(255, 87, 51)`) — 1 byte per channel
- `Uint8Array` JavaScript mein 0-255 tak values hi store kar sakta hai

---

## 7. Negative Numbers — Computer inhe kaise represent kare?

Yeh part thoda interesting hai kyunki humare paas `-` (minus sign) jaisa koi symbol hardware mein nahi hota — sirf bits hain. Toh negative number ko represent karne ke 3 tareeke history mein try kiye gaye:

### 7.1 Sign-Magnitude Method

Sabse simple idea: sabse pehla bit (leftmost / **MSB — Most Significant Bit**) ko "sign bit" bana do.
- `0` = positive
- `1` = negative

Baaki bits actual number (magnitude) represent karte hain.

**Example (8-bit):**
```
+5  = 0 0000101   (sign=0, magnitude=5)
-5  = 1 0000101   (sign=1, magnitude=5)
```

**Problem #1 — Do Zero hote hain:**
```
+0 = 00000000
-0 = 10000000
```
Yeh confusing hai — mathematically `0` ek hi hota hai, lekin yahan 2 alag bit-patterns hain!

**Problem #2 — Addition seedhe se kaam nahi karti**, sign bit ko alag se handle karna padta hai circuit mein. Extra complexity.

### 7.2 One's Complement

Idea: negative number banane ke liye, **har bit ko flip** kar do (0→1, 1→0).

**Example (8-bit):**
```
+5 = 00000101
-5 = 11111010   (sabhi bits flip)
```

**Problem — फिर se do zero:**
```
+0 = 00000000
-0 = 11111111
```
Same issue jo sign-magnitude mein tha. Thoda better hai addition ke liye (ek trick hai "end-around carry"), lekin still messy.

### 7.3 Two's Complement — Yehi hai jo aaj har computer use karta hai

**Idea:** One's complement nikaalo, phir usmein **1 add** kar do.

```
Step 1: +5 ka binary        = 00000101
Step 2: Sabhi bits flip karo = 11111010    (one's complement)
Step 3: 1 add karo            = 11111011    ← yeh hai -5!
```

**Verify karte hain (-5 + 5 = 0 hona chahiye):**
```
   00000101   (+5)
 + 11111011   (-5)
 -----------
 1 00000000   ← 9th bit overflow ho gaya, 8-bit register mein woh discard ho jaata hai
 -----------
   00000000   = 0  ✓✓✓
```

Dekha? Sirf **normal binary addition** se hi answer sahi aa gaya — koi special "subtraction circuit" ya "sign-handling logic" nahi chahiye! CPU ke ALU (Arithmetic Logic Unit) ko subtraction karne ke liye alag hardware banane ki zaroorat nahi — woh bas negative number ko two's complement mein convert karke **add** kar deta hai. `a - b` = `a + (-b)`.

> [!tip]
> Yehi reason hai ki two's complement industry standard ban gaya — **ek hi hardware circuit (adder) se addition aur subtraction dono ho jaate hain.** Simplicity = kam transistors = sasta aur fast CPU.

**Sirf ek hi Zero hota hai two's complement mein:**
```
0 = 00000000   (bas ek hi representation, no confusion)
```

### Two's Complement Range

N-bit signed number ka range hota hai:
```
-2^(N-1)   se   +2^(N-1) - 1
```

**8-bit ke liye:**
```
Range: -128 se +127

Kyun asymmetric hai? Kyunki MSB=1 wale sab negative numbers hain,
aur unme se ek pattern (10000000) "-0" nahi balki "-128" ko represent karta hai!
```

```
MSB bit hamesha sign decide karta hai two's complement mein:
0xxxxxxx → positive (0 se 127)
1xxxxxxx → negative (-128 se -1)

00000000 = 0
01111111 = 127   (max positive, 8-bit)
10000000 = -128  (min negative — koi positive counterpart nahi!)
11111111 = -1
```

### Quick trick: Two's complement value nikalne ka shortcut

Kisi bhi negative-looking binary (MSB=1) ki decimal value nikalni ho, toh:
```
Rightmost 1 dhoondo, usse left ki taraf sab bits same rakho,
uske right ke sab bits flip kar do... 
```
...lekin practically easiest tareeka yehi hai: **flip all bits, add 1, phir negative sign laga do.**

```
11110110 ka decimal value?
Step 1: Flip     → 00001001
Step 2: +1       → 00001010  = 10
Step 3: Negate   → -10

Toh 11110110 = -10 (in two's complement, 8-bit)
```

---

## 8. Integer Overflow

### Kya hota hai?

Har integer type ki ek **fixed size** hoti hai (jaise 8-bit, 16-bit, 32-bit, 64-bit). Jab calculation ka result us size ke max range se bahar chala jaata hai, toh extra bits **register se bahar gir jaate hain (discard)** — aur answer galat aa jaata hai. Ise **overflow** kehte hain.

### Analogy — Odometer

Socho tumhari purani bike ka **odometer** hai jo sirf 5 digits tak show kar sakta hai: `99999`. Ab agar tum ek aur km chalate ho, toh woh `00000` pe reset ho jaayega — 100000 nahi dikhayega, kyunki uske paas 6th digit ki jagah hi nahi hai! Bilkul yehi cheez binary integers ke saath hoti hai.

### Example: 8-bit signed overflow

```
  01111111   (+127, max positive value 8-bit signed mein)
+ 00000001   (+1)
-----------
  10000000   ← yeh -128 hai two's complement mein!

127 + 1 = -128  ???  Yeh hai overflow!
```

Jab tum expect kar rahe the `128`, lekin 8-bit signed range sirf `-128 se 127` tak jaata hai, toh `128` wraparound karke `-128` ban gaya.

### Real-world gotcha

```javascript
// JavaScript mein normal numbers safe hain kaafi upar tak (2^53) kyunki
// woh double-precision float use karta hai, lekin typed arrays mein overflow real hai:

const arr = new Int8Array(1);   // 8-bit signed: range -128 to 127
arr[0] = 127;
arr[0] = arr[0] + 1;
console.log(arr[0]);   // -128  😱  overflow ho gaya!
```

> [!warning]
> Yehi bug **Boeing 787 fuel gauge**, purane **video games** (jaise Pac-Man ka famous "kill screen" level 256 pe), aur **Y2K38 problem** (32-bit Unix timestamp 2038 mein overflow karega) jaise real disasters ka reason bana hai. Overflow koi academic cheez nahi hai — real systems isse crash hote hain.

**Unsigned overflow** thoda alag dikhta hai — negative nahi jaata, bas wraps around 0 pe:
```
  11111111   (255, max for 8-bit unsigned)
+ 00000001   (+1)
-----------
  00000000   (0 — wrapped around!)
```

> [!info]
> OS/language level pe overflow detection aur safe-integer handling ke deeper details tumhe **operating_systems** notes mein milenge, jahan hum memory safety aur process limits discuss karte hain.

---

## 9. Floating Point Numbers — Decimals ko represent karna

### Kya hota hai? Kyun zaruri hai?

Ab tak humne sirf **integers** (poore numbers) dekhe. Lekin `3.14`, `0.1`, `19.99` (price!) jaise numbers ko kaise store karein? Yehi kaam **floating point representation** karta hai, aur industry standard hai **IEEE 754**.

### Analogy — Scientific Notation

Yaad hai school mein scientific notation padhi thi? `156000 = 1.56 × 10⁵`. IEEE 754 bhi bilkul yehi karta hai, bas base 10 ki jagah **base 2** use karta hai:

```
number = sign × mantissa × 2^exponent
```

Isko 3 parts mein todke store karte hain ek fixed-size binary mein:

```
┌───┬───────────────┬─────────────────────────────┐
│ S │   Exponent     │          Mantissa            │
└───┴───────────────┴─────────────────────────────┘
 1 bit    8 bits (32-bit float)      23 bits (32-bit float)
          11 bits (64-bit double)    52 bits (64-bit double)
```

| Type | Total bits | Sign | Exponent | Mantissa (Fraction) | JS/precision |
|---|---|---|---|---|---|
| **Single precision (float)** | 32 | 1 | 8 | 23 | ~7 decimal digits |
| **Double precision (double)** | 64 | 1 | 11 | 52 | ~15-16 decimal digits |

> [!info]
> JavaScript ka `Number` type **hamesha 64-bit double precision** hota hai — chahe tum `let x = 5` likho ya `let x = 5.5`, andar dono hi IEEE 754 double hote hain. Yehi wajah hai ki JS mein integers 2^53 tak "safe" rehte hain (`Number.MAX_SAFE_INTEGER`).

### Worked Example — 3.25 ko 32-bit float mein convert karna

**Step 1: Decimal ko binary mein convert karo**
```
3.25 (decimal) 
Integer part: 3 = 11
Fraction part: 0.25 = 0.01  (kyunki 0.25 = 1/4 = 2^-2)

Toh 3.25 = 11.01 (binary)
```

**Step 2: Scientific notation mein normalize karo (1.xxxx × 2^n form)**
```
11.01 = 1.101 × 2^1
(decimal point ko left move kiya 1 position, isliye exponent = 1)
```

**Step 3: Teeno parts nikalo**
```
Sign     = 0                  (number positive hai)
Exponent = 1 + 127 (bias)     = 128 = 10000000 (8 bits, bias explained neeche)
Mantissa = 101000...0         (1.101 ka "1." hata diya, sirf fraction rakha, 23 bits tak pad kiya)
```

**Final 32-bit representation:**
```
Sign  Exponent    Mantissa
 0   10000000   10100000000000000000000
 
 = 0 10000000 10100000000000000000000
```

### "Bias" kya hai aur kyun chahiye?

Exponent negative bhi ho sakta hai (jaise `0.001` ke liye), lekin humare paas exponent field mein sign bit nahi hai alag se. Toh IEEE 754 ek trick use karta hai: **bias add kar do**.

```
32-bit float ke liye bias = 127
Actual exponent = Stored exponent - 127

Isliye "stored exponent = 0" ka matlab hai actual exponent = -127
aur "stored exponent = 255" ka matlab hai actual exponent = +128
```

Isse hum bina extra sign-bit ke, negative aur positive dono exponents store kar paate hain — bas ek unsigned number की tarah.

### Floating Point Precision Problem — Famous gotcha

```javascript
console.log(0.1 + 0.2);
// Output: 0.30000000000000004   😱
```

**Yeh bug nahi hai — yeh IEEE 754 ki fundamental limitation hai.**

**Kyun hota hai?** Kyunki `0.1` aur `0.2` ko **binary mein exactly represent nahi kiya ja sakta** — bilkul waise hi jaise decimal mein `1/3` ko exactly nahi likh sakte (`0.3333...` hamesha chalta rehta hai). Binary mein `0.1 = 0.0001100110011...` (repeating), jo finite 52 bits mein fit karne ke liye **round off** karna padta hai. Yeh chhota sa rounding error hi visible ho jaata hai jab tum add karte ho.

> [!warning]
> Isiliye **kabhi bhi money/currency ko floating point mein store mat karo!** ₹19.99 + ₹0.01 jaisi calculations mein tiny errors accumulate ho sakte hain. Iske liye **integers use karo (paise/cents mein store karo)** ya dedicated libraries (`decimal.js`, `BigDecimal` Java mein) use karo. Yeh interview mein bhi common gotcha question hai.

---

## 10. Characters ka Representation — ASCII aur Unicode

### Kya hota hai?

Computer sirf numbers samajhta hai, toh text (`'A'`, `'a'`, `'हिं'`, `'😀'`) ko bhi numbers mein map karna padta hai. Iske liye **encoding scheme** chahiye — ek fix table jo batati hai "kaunsa number kaunse character ko represent karega."

### ASCII (American Standard Code for Information Interchange)

Sabse purana aur simple standard — **7 bits** use karta hai, matlab **0 se 127** tak values, total **128 characters**.

```
'A' = 65  = 01000001
'a' = 97  = 01100001
'0' = 48  = 00110000
' ' = 32  = 00100000 (space)
```

> [!tip]
> Interesting fact: 'A' se 'a' ka difference hai `97 - 65 = 32`. Yehi wajah hai `toUpperCase()`/`toLowerCase()` jaise functions internally kaafi simple bit-manipulation se implement ho sakte hain — bas 32 add/subtract karo!

**Problem:** ASCII sirf English alphabets, digits, aur kuch symbols cover karta hai. Isme "हिंदी", "中文", "😀" jaise characters ke liye **koi jagah nahi hai** — sirf 128 slots hain!

### Unicode aur UTF-8

**Unicode** ek bahut bada standard hai jo duniya ke **har language, symbol, aur emoji** ke liye ek unique number (**code point**) define karta hai — currently 1.4+ million code points possible hain.

```
'A'  → U+0041
'अ'  → U+0905
'中'  → U+4E2D
'😀' → U+1F600
```

Lekin Unicode sirf ek number bataata hai — **usse actual bytes mein kaise store karein**, uske liye "encoding" chahiye. Sabse popular encoding hai **UTF-8**, jo ek smart **variable-length** scheme use karta hai:

```
┌──────────────────────────────────────────────────────┐
│  Character Type       │  Bytes Used  │  Example       │
├──────────────────────────────────────────────────────┤
│  ASCII (English, etc) │  1 byte      │  'A' → 0x41    │
│  Latin extras, Greek  │  2 bytes     │  'é' → 0xC3A9  │
│  Devanagari, Chinese  │  3 bytes     │  'अ' → 0xE0A485│
│  Emoji                │  4 bytes     │  '😀'→ 0xF09F9880│
└──────────────────────────────────────────────────────┘
```

**Sabse smart baat: UTF-8, ASCII ke saath 100% backward-compatible hai** — kyunki ASCII ke pehle 128 characters ko UTF-8 mein bhi exactly same 1-byte values milte hain. Isliye purana ASCII text automatically valid UTF-8 bhi hota hai.

> [!tip]
> Node.js mein jab tum `Buffer.from('हैलो', 'utf-8')` karte ho, tab yehi encoding scene ke peeche chal raha hota hai. Aur isiliye `string.length` kabhi-kabhi "wrong" lagta hai emoji ke saath — kyunki JS strings internally **UTF-16** use karte hain, aur kuch emoji 2 "code units" (surrogate pairs) lete hain, ek nahi!

```javascript
console.log('😀'.length);   // 2, not 1! (surrogate pair ki wajah se)
console.log([...('😀')].length);  // 1 (spread operator sahi count deta hai)
```

---

## Recap Diagram — Poori Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  Tumhara Code:  price = 19.99;  name = "Chai";                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  19.99  → IEEE 754 double: 0100000000110011111101011100001...    │
│  "Chai" → UTF-8 bytes: 01000011 01101000 01100001 01101001       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  RAM ke transistors: ON-OFF-OFF-ON-ON-OFF-ON-ON...                │
│  (electrically stored charge — voltage HIGH ya LOW)               │
└─────────────────────────────────────────────────────────────────┘
```

Har layer pe sirf "encoding scheme" badalta hai — physically hamesha bas transistors ON/OFF hi hote hain.

---

## Key Takeaways

- Computer sirf 0/1 (binary) samajhta hai kyunki transistors ke paas sirf 2 reliable states hain — ON aur OFF — electrical noise ke against yeh sabse robust approach hai.
- **Binary (base 2), Octal (base 8), Hexadecimal (base 16)** — sab decimal ke alternate representations hain; hex sabse popular hai kyunki 1 hex digit = exactly 4 bits (1 nibble).
- Decimal→binary conversion: divide-by-2 aur remainders neeche se upar padho. Binary→decimal: position values (`2^n`) ka weighted sum lo.
- 1 Byte = 8 bits = 256 possible values (0-255). Yeh RGB colors, ASCII, aur `Uint8Array` jaisi cheezon ki nींव hai.
- Negative numbers ke 3 tareeke: **Sign-Magnitude** aur **One's Complement** dono mein "double zero" problem hai. **Two's Complement** industry standard hai kyunki isme sirf ek zero hai aur normal binary addition se hi subtraction ho jaata hai (extra hardware nahi chahiye).
- N-bit two's complement signed range: `-2^(N-1)` se `+2^(N-1)-1` (jaise 8-bit: -128 se 127).
- **Integer overflow** tab hota hai jab result fixed bit-size ke range se bahar chala jaaye — extra bits discard ho jaate hain aur wraparound ho jaata hai (127+1 = -128 signed 8-bit mein).
- **IEEE 754** floating point ko `sign × mantissa × 2^exponent` (base-2 scientific notation) form mein todkar store karta hai. Single precision = 32-bit, Double precision = 64-bit (JS `Number` hamesha double hai).
- `0.1 + 0.2 !== 0.3` koi bug nahi — binary mein 0.1/0.2 exactly represent nahi ho sakte, isliye rounding error aata hai. Money ke liye kabhi bhi float use mat karo, integers (paise/cents) use karo.
- **ASCII** (7-bit, 128 characters) sirf English cover karta hai. **Unicode** har language/emoji ke liye unique code point deta hai, aur **UTF-8** usse variable-length bytes (1-4 bytes) mein encode karta hai — aur ASCII ke saath backward-compatible hai.

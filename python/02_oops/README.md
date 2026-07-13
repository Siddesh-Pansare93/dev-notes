# Object-Oriented Python

**Kya hota hai yahaan?** Python ka OOP system kaafi powerful aur expressive hai — lekin iske apne idioms hain jo Node.js/TypeScript se aane wale developers ko thoda confuse kar sakte hain. Socho jaise tum Zomato ke backend mein classes bana rahe ho — TypeScript mein jo tareeka pata hai, Python usi kaam ko thoda alag tareeke se karta hai. Ye section Python ke OOP model ko basics se leke advanced patterns tak — jaise dataclasses aur enums — cover karta hai, aur har concept ko TypeScript comparisons ke saath samjhaya gaya hai taaki tumhe jo pata hai usi pe build kar sako.

> [!info]
> Ye ek index/README file hai — isme har chapter ka short intro hai. Actual deep-dive uss chapter ki apni file mein milega.

## Table of Contents

1. [Classes & Basics](./01_classes_basics.md) — `class`, `__init__`, `self`, instance/class/static methods, access modifiers
2. [Inheritance](./02_inheritance.md) — single aur multiple inheritance, `super()`, MRO, mixins
3. [Magic Methods](./03_magic_methods.md) — dunder methods, operator overloading, iteration, context managers
4. [Decorators](./04_decorators.md) — function decorators, class decorators, `@property`, `@staticmethod`, `@classmethod`
5. [Abstract Classes](./05_abstract_classes.md) — `ABC`, `@abstractmethod`, protocols ke through interfaces
6. [Dataclasses](./06_dataclasses.md) — `@dataclass`, field defaults, frozen/immutable classes, `__post_init__`
7. [Enums & NamedTuples](./07_enums_and_namedtuples.md) — `Enum`, `IntEnum`, `NamedTuple`, kab kya use karna hai

---

## Learning Path

**Kyun zaruri hai order follow karna?** Kyunki Python OOP ke concepts ek dusre pe stack hote hain — jaise dabbawala ka system: pehle collection point samajhna padta hai, tabhi sorting hub samajh aata hai. Isliye seedha decorators pe kood mat jao, pehle basics pakka karo.

### Beginner — Pehle fundamentals pakka karo

1. [Classes & Basics](./01_classes_basics.md) — samjho `self` kya hai, `__init__` kya karta hai, aur Python ke properties TypeScript se kaise alag kaam karti hain
2. [Inheritance](./02_inheritance.md) — `super()` seekho aur Python multiple inheritance ko MRO se kaise handle karta hai
3. [Abstract Classes](./05_abstract_classes.md) — TypeScript interfaces ki jagah Python ke ABCs aur Protocols use karo

### Intermediate — Apne Python idioms level up karo

4. [Magic Methods](./03_magic_methods.md) — dunder protocols implement karke apne objects ko native Python jaisa feel karao
5. [Decorators](./04_decorators.md) — samjho `@property`, `@staticmethod`, aur custom decorators andar se kaise kaam karte hain

### Advanced — Idiomatic, production-quality Python likho

6. [Dataclasses](./06_dataclasses.md) — `@dataclass` se data-holding classes ka boilerplate hatao
7. [Enums & NamedTuples](./07_enums_and_namedtuples.md) — constants aur lightweight value types ko cleanly model karo

---

## Kya Seekhoge

- Python ka `class` model TypeScript se kaise alag hai: `self` explicit kyun hota hai, attributes kaise declare hote hain, aur `__init__` asal mein karta kya hai
- Single aur multiple inheritance, method resolution order (MRO), aur `super()` ka call chain
- Poora dunder/magic method system: `__str__`, `__repr__`, `__eq__`, `__len__`, `__add__`, `__iter__`, `__enter__`/`__exit__`, aur bhi bahut kuch
- Python decorators higher-order functions ki tarah kaise kaam karte hain, aur `@property` TypeScript ke getters/setters ki jagah kaise leta hai
- `ABC` aur `@abstractmethod` se interfaces define aur enforce karna, plus `Protocol` se structural subtyping
- `@dataclass` use karke `__init__`, `__repr__`, `__eq__` auto-generate karna, aur `frozen=True` se immutability
- `Enum`, `IntEnum`, aur `NamedTuple` se constant sets aur lightweight records model karna
- Har concept ke liye TypeScript-to-Python mapping, taaki jo already pata hai usi pe build ho sake

---

## Prerequisites

- Python functions, type hints, aur basic syntax mein comfortable ho (Python Basics section mein cover kiya gaya hai)
- TypeScript ya kisi aur OOP language mein classes aur interfaces ki jaan-pehchaan — ye section TypeScript comparisons throughout use karta hai
- Python OOP ka prior experience zaruri nahi hai

---

## Is Guide Ko Kaise Use Karein

1. **Pehle beginner path follow karo.** Chapter 1 aur 2 dense hain lekin foundational hain — baaki sab isi pe build hota hai. Kuch bhi skip mat karo.
2. **Code examples run karo.** Har file runnable snippets se bhari hai. Ek Python REPL saath mein khol ke unhe type karo; muscle memory matter karti hai.
3. **TypeScript comparisons actively use karo.** Jab side-by-side example dikhe, socho ki Python ne alag choice kyun banayi — reasoning aksar kaafi illuminating hoti hai.
4. **Sab kuch khatam karne ke baad Magic Methods pe wapas aao.** Chapter 3 tab zyada sense banata hai jab tumne dekh liya ho ki dataclasses aur ABCs dunders ko andar se kaise use karte hain.
5. **"Kab kya use karein" sections zaroor check karo.** Dataclasses, NamedTuples, aur plain classes sab overlap karte hain — guides tumhe exactly batate hain ki kab konsa tool uthana hai.

> [!tip]
> Agar kahin stuck ho jao, uss chapter ke TypeScript comparison wale example pe wapas jao — usually wahi missing link hota hai.

---

## Key Takeaways

- Is section ka order matter karta hai — Classes & Basics aur Inheritance sabse pehle, kyunki baaki sab isi foundation pe khada hai
- Har chapter mein TypeScript se side-by-side comparison milega, taaki naya syntax bhi familiar lage
- Magic Methods (Chapter 3) ko ek baar dobara padhna — dataclasses/ABCs seekhne ke baad woh zyada click karega
- "Kab kya use karna hai" (dataclass vs NamedTuple vs plain class) — ye decision-making skill hi asli seekh hai, sirf syntax nahi

# Python Basic Fundamentals

Socho ek second ke liye — tumne already JavaScript ya TypeScript mein kaafi code likha hai, arrays ke saath khela hai, functions banaye hain, async stuff bhi handle kiya hai. Ab boss ne bola "Python bhi seekh lo, backend ke kaam aayega." Panic karne ki zaroorat nahi hai. Ye guide bilkul usi ke liye hai — tumhe scratch se programming nahi seekhni, sirf ye samajhna hai ki jo cheez JS mein `let`, `const`, `.map()`, `try/catch` se hoti thi, wahi Python mein kaise likhi jaati hai.

> [!info]
> Python aur JavaScript dono high-level languages hain, dono mein garbage collection hai, dono dynamically typed feel karti hain (though Python ka apna twist hai) — isliye tumhara mental model zyada nahi todna padega, bas syntax aur kuch conventions naye hain.

## Table of Contents

1. [Variables and Data Types](./01_variables_and_data_types.md)
2. [Strings](./02_strings.md)
3. [Lists and Tuples](./03_lists_and_tuples.md)
4. [Dictionaries and Sets](./04_dictionaries_and_sets.md)
5. [Control Flow](./05_control_flow.md)
6. [Functions](./06_functions.md)
7. [Modules and Imports](./07_modules_and_imports.md)
8. [Error Handling](./08_error_handling.md)
9. [File Operations](./09_file_operations.md)
10. [Comprehensions](./10_comprehensions.md)

## Learning Path

Socho isko ek Swiggy order ki tarah — pehle restaurant select hota hai, phir items, phir address, tab jaake order place hota hai. Sequence matter karta hai. Waise hi yahan bhi ek order follow karo, chapter numbers ko ignore kar ke.

**Beginner — pehle syntax pakdo**

Agar Python bilkul naya hai tumhare liye, yahin se shuru karo. Ye chapters directly usi cheez se map hote hain jo tum already JavaScript mein jaante ho.

1. [Variables and Data Types](./01_variables_and_data_types.md) — na `let`/`const`, na semicolons; Python mein naming aur types kaise kaam karte hain
2. [Strings](./02_strings.md) — f-strings, multiline strings, aur wo methods jo roz use hote hain
3. [Control Flow](./05_control_flow.md) — `if`/`elif`/`else`, `for`/`while`, aur curly braces ki jagah indentation kaise kaam karta hai
4. [Functions](./06_functions.md) — `def`, docstrings, `*args`, `**kwargs`, aur keyword arguments

**Intermediate — Python ke core data structures**

Ek baar syntax comfortable ho jaaye, to ye tackle karo. Ye idiomatic Python unlock karte hain — matlab wo code jo dekh kar lagta hai "haan ye asli Python developer ne likha hai", na ki JS ka literal translation.

5. [Lists and Tuples](./03_lists_and_tuples.md) — Python ke arrays, unpacking, slicing, aur immutable sequences
6. [Dictionaries and Sets](./04_dictionaries_and_sets.md) — data manipulation ke workhorses
7. [Comprehensions](./10_comprehensions.md) — list, dict, aur set comprehensions; `.map()` aur `.filter()` chains ki jagah lete hain

**Advanced — asli programs likhna**

Apne fundamentals complete karo taaki tum aisa code likh sako jo files padhe, failures handle kare, aur modules ke across scale kare — bilkul waise jaise ek production Node.js app mein karte ho.

8. [Modules and Imports](./07_modules_and_imports.md) — `import`, packages, `__init__.py`, aur standard library
9. [Error Handling](./08_error_handling.md) — `try`/`except`/`finally`, custom exceptions, aur kab `raise` karna hai
10. [File Operations](./09_file_operations.md) — reading, writing, context managers (`with`), aur `pathlib`

## Kya Seekhoge

- Python ki dynamic typing, TypeScript ki static types se kaise alag hai — aur practically iska matlab kya hai
- Python ki `snake_case` convention aur PEP 8 style rules
- Sabhi chaar core collection types ke saath kaam karna: lists, tuples, dicts, aur sets
- Default arguments, keyword-only params, aur `*args`/`**kwargs` ke saath expressive, readable functions likhna
- String formatting ke liye f-strings use karna (JavaScript ke template literals ka Python version)
- Verbose `.map()`/`.filter()` chains ko compact comprehensions se replace karna
- Python ke module aur import system se code ko multiple files mein structure karna
- Errors ko cleanly handle karna, taaki exceptions program ko chup-chaap crash na kar de
- Context managers use karke files ko safely read aur write karna

## Prerequisites

- JavaScript ya TypeScript likhne mein comfortable ho (functions, arrays, objects, loops)
- Terminal/command line kya hota hai, iski basic samajh
- Machine par Python 3.10+ installed ho (`python --version` se check karo)

Pehle se Python ka experience zaruri nahi hai — har chapter explicitly Python syntax ko uske JavaScript/TypeScript equivalent se compare karta hai.

## Is Guide Ko Kaise Use Karein

1. **Learning path order follow karo**, chapter numbers nahi, agar tum bilkul naye ho — Beginner track har concept ko pichle concept par build karta hai.
2. **Har code snippet khud run karo.** Python REPL kholo (terminal mein `python` type karo) aur saath-saath type karo — muscle memory matter karti hai.
3. **JS/TS comparisons zarur padho**, chahe lage ki concept pehle se pata hai. Python ka behavior kabhi-kabhi subtle tareeke se alag hota hai jo experienced JS developers ko bhi surprise kar deta hai.
4. **Comprehensions skip mat karo.** Shuru mein ajeeb lagte hain, lekin real Python code mein har jagah use hote hain — initial discomfort ko paar karo.
5. **Baad mein reference ki tarah use karo.** Har file itni dense hai ki jab kabhi method name ya slice syntax bhool jao, to quick-lookup ke kaam aa sake.

> [!tip]
> Jaldi mein mat rahna. Zomato ka order jaldi complete karne se koi fayda nahi agar galat address daal diya — waise hi Python seekhne mein bhi thoda ruk kar, samajh kar aage badhna better hai, sirf chapters "complete" mark karne se better hai.

Python ki simplicity koi limitation nahi hai — yehi to iska feature hai. Enjoy the ride.

# Python Quick Start

Kya hota hai jab ek Node.js developer achanak Python seekhne baith jaye? Pehle 10 minute confusion hota hai — `npm` kahan gaya, `package.json` kahan hai, yeh `venv` kya bala hai — phir dheere dheere sab click karne lagta hai. Yeh section exactly wahi confusion khatam karne ke liye hai.

Zero se lekar ek working Python environment tak — sab kuch ek hi baithak mein. Yeh section khaas taur pe Node.js aur TypeScript developers ke liye likha gaya hai — har concept ko us cheez se map kiya gaya hai jo tumhe pehle se pata hai, taaki tum jaldi productive ho jao.

> [!tip]
> Socho aisa jaise tum Swiggy pe already expert order-placer ho, aur ab Zomato try kar rahe ho. App alag hai, buttons alag jagah hain, lekin underlying idea — khana order karna — same hi hai. Python bhi Node.js se aisa hi hai: syntax alag, mental model same.

## Table of Contents

1. [Python Installation & Version Management](./01_python_installation.md) — Python install karo aur `pyenv` (Python ka `nvm`) se versions manage karo
2. [Virtual Environments](./02_virtual_environments.md) — `venv` se project dependencies isolate karo (Python ka jawab `node_modules` ko)
3. [Package Management](./03_package_management.md) — `pip` aur `pip-tools` se packages install, manage aur lock karo (jaise `npm` + `package-lock.json`)
4. [Node.js/TypeScript to Python Cheatsheet](./04_nodejs_to_python_cheatsheet.md) — Side-by-side syntax reference — variables, functions, classes, async, modules, aur bhi bahut kuch
5. [Your First Python Script](./05_first_python_script.md) — Ek real script chalao, REPL use karo, CLI args handle karo aur `if __name__ == "__main__"` samjho

---

## Learning Path

### Beginner — Setup karo aur pehla code likho
1. [Python Installation](./01_python_installation.md) — Python install karo, `pyenv` set up karo
2. [Virtual Environments](./02_virtual_environments.md) — ek `venv` banao aur activate karo
3. [Your First Python Script](./05_first_python_script.md) — `hello.py` chalao, REPL explore karo

### Intermediate — Ecosystem aur syntax differences samjho
4. [Package Management](./03_package_management.md) — `pip install`, `requirements.txt`, dependencies freeze karna
5. [Node.js to Python Cheatsheet](./04_nodejs_to_python_cheatsheet.md) — har syntax section ko systematically cover karo

### Advanced — Mental model pakka karo
- Cheatsheet ke async/await, type annotations aur common gotchas wale sections ko dobara padho — kuch real scripts likhne ke baad
- Cheatsheet ko roz ke reference ki tarah use karo, jab tum aage ke core Python topics padh rahe ho

---

## What You'll Learn

- Windows, macOS aur Linux pe Python install karna — direct installers ya package managers se
- `pyenv` se per-project multiple Python versions manage karna (global, local aur shell scopes)
- Virtual environments kaise kaam karte hain aur har Python project ko ek kyun chahiye
- `pip` se packages install karna, `requirements.txt` generate karna, aur dependency versions pin karna
- Python ka module system Node.js ke CommonJS aur ESM imports se kaise alag hai
- Variables, data types, strings, lists, dicts, sets, tuples, functions, lambdas, destructuring, loops, error handling aur classes ke side-by-side translations
- JavaScript ke mukable Python mein async/await kaise kaam karta hai
- `if __name__ == "__main__"` pattern aur ise kab use karna hai
- Python script mein command-line arguments kaise accept karte hain

---

## Prerequisites

- Node.js aur/ya TypeScript ke saath comfortable ho — yeh guide us background ka use karke Python concepts samjhaata hai
- Ek terminal (PowerShell, bash, ya zsh)
- Python ka pehle se koi experience zaruri nahi

---

## How to Use This Guide

1. **Pehli baar mein numbered order follow karo.** Files is tarah sequence ki gayi hain ki har ek pichli pe build karti hai — pehle environment setup, phir code likhna, phir speed ke liye cheatsheet reference karna.
2. **Har code example khud chalao.** Har file ke saath ek terminal open rakho aur commands khud type karo — Python ki muscle memory jitni jaldi banti hai, utni umeed bhi nahi hogi.
3. **Cheatsheet ko doosre tab mein khula rakho.** Jaise hi tum real Python likhna shuru karoge, `04_nodejs_to_python_cheatsheet.md` woh file hai jispe tum roz wapas aaoge. Bookmark kar lo.
4. **Practice exercises use karo.** Har file ke end mein exercises hain jo 5-15 minute lete hain. Unhe zaroor karo — sirf padhne se jo gotchas nahi dikhte, woh yeh expose karte hain.
5. **Environment ko perfect banane mein atko mat.** `pyenv` ke bina simple `python` install shuru karne ke liye theek hai. Jaise jaise zarurat pade, tooling layer karte jao.

> [!warning]
> Setup mein zyada time mat lagao. `pyenv`, virtual envs, sab tools hain — lekin agar tum pehle hi din perfect environment banane mein atak gaye, toh actual Python seekhna peeche chala jayega. Basic `python` install se shuru karo, code likho, phir zarurat padne pe tooling add karo.

---

Tumhe pehle se pata hai programmer ki tarah sochna kaise hai — yeh section bas tumhe Python ki vocabulary thama raha hai. Chalo shuru karte hain.

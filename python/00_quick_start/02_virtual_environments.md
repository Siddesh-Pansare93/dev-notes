# 02 - Virtual Environments (venv, pip, requirements.txt)

> **Node.js walon ke liye:** Python ka virtual environment (`venv`) bilkul waisa hi kaam karta hai jaisa tumhara `node_modules` karta hai — project ke dependencies ko isolate karta hai. Aur `requirements.txt` ek simplified `package.json` jaisa hai.

---

## Table of Contents

1. [Mental Model: node_modules vs venv](#the-mental-model-node_modules-vs-venv)
2. [Python Dependency Isolation Kaise Kaam Karta Hai](#how-python-dependency-isolation-works)
3. [Virtual Environment Banana](#creating-a-virtual-environment)
4. [Activate aur Deactivate Karna](#activating-and-deactivating)
5. [pip Se Packages Install Karna](#installing-packages-with-pip)
6. [requirements.txt: Tumhara package.json](#requirementstxt-your-packagejson)
7. [Complete Workflow](#the-complete-workflow)
8. [.gitignore Patterns](#gitignore-patterns)
9. [Common Galtiyan](#common-pitfalls)
10. [Practice Exercises](#practice-exercises)

---

## Mental Model: node_modules vs venv

Chalo pehle wahi map karte hain jo tumhe already pata hai:

| Concept | Node.js | Python |
|---|---|---|
| Dependency isolation | `node_modules/` directory | Virtual environment (`venv/` directory) |
| Dependency manifest | `package.json` | `requirements.txt` (ya `pyproject.toml`) |
| Lock file | `package-lock.json` | (pip mein koi nahi; Poetry mein `poetry.lock`) |
| Sab deps install karo | `npm install` | `pip install -r requirements.txt` |
| Package add karo | `npm install express` | `pip install flask` |
| Package remove karo | `npm uninstall express` | `pip uninstall flask` |
| Packages list karo | `npm list` | `pip list` ya `pip freeze` |
| Global install location | Global `node_modules` | System Python ka `site-packages` |
| Project install location | `./node_modules/` | `./venv/lib/python3.x/site-packages/` |

### Sabse Bada Farak

Node.js mein `npm install express` chalate hi ek hi step mein sab kuch ho jata hai — `node_modules/` create ho jata hai aur `package.json` bhi update ho jata hai. Python ka workflow thoda zyada manual hai:

```bash
# Node.js - ek step mein sab kuch
npm install express  # node_modules/ create karta hai, package.json update karta hai

# Python - thode zyada explicit steps
python -m venv venv           # 1. Virtual environment banao
source venv/bin/activate      # 2. Activate karo (shell ko batao ki isi ko use karna hai)
pip install flask             # 3. Package install karo
pip freeze > requirements.txt # 4. Dependency list manually save karo
```

Thoda manual zaroor hai, par jaldi hi aadat ho jayegi. Poetry jaise tools (agle chapter mein) ise aur automatic bana dete hain.

---

## Python Dependency Isolation Kaise Kaam Karta Hai

### Problem Kya Hai (Node.js Jaisa Hi)

Bina isolation ke, packages globally install hote hain. Ab socho Project A ko `requests==2.28` chahiye aur Project B ko `requests==2.31` — dono aapas mein takra jayenge, jaise do log ek hi ghar mein alag-alag rent ka kiraya maang rahe hon.

### Node.js Ise Kaise Solve Karta Hai

Har project ka apna `node_modules/` folder hota hai. Jab tum `require('express')` karte ho, Node pehle local `node_modules/` mein dhoondta hai.

### Python Ise Kaise Solve Karta Hai

**Virtual environment** ek self-contained directory hai jiska apna Python binary aur apna `site-packages` directory hota hai (jahan packages install hote hain). Jab tum venv ko "activate" karte ho, tumhare shell ka `PATH` badal jata hai taaki `python` aur `pip` venv ki copies ko point karein — bilkul waise jaise Swiggy app tumhe restaurant ka menu dikhata hai based on tumhari current location, na ki poore city ka menu.

```
my-project/
  venv/                    # node_modules/ jaisa hi -- ise commit mat karna!
    bin/ (ya Scripts/)     # Python aur pip executables
    lib/
      python3.12/
        site-packages/     # Installed packages yahan aate hain
    pyvenv.cfg             # venv config
  app.py
  requirements.txt         # package.json dependencies jaisa
```

---

## Virtual Environment Banana

`venv` module Python 3.3+ ke saath already aata hai (extra install ki zarurat nahi).

```bash
# Apni project directory mein jao
cd my-project/

# Virtual environment banao
# Convention: naam "venv" ya ".venv" rakho
python -m venv venv
```

`-m venv` ka matlab hai "`venv` module ko run karo." Doosra `venv` directory ka naam hai. Tum ise kuch bhi naam de sakte ho, lekin `venv` ya `.venv` standard conventions hain.

```bash
# Ye sab valid hain -- ek convention pick karo aur usi pe tike raho
python -m venv venv     # Sabse common
python -m venv .venv    # Hidden directory (VS Code projects mein common)
python -m venv env      # Ye bhi kabhi-kabhi dikhta hai
```

> **Convention tip:** `.venv` (dot ke saath) zyada popular hota ja raha hai kyunki VS Code ise auto-detect karta hai aur ye `ls` output mein hidden rehta hai.

### Kya Banta Hai

```bash
# Ye run karne ke baad: python -m venv venv

# macOS/Linux pe:
venv/
  bin/
    activate         # Activate karne wala shell script
    activate.csh
    activate.fish
    python -> python3.12
    python3 -> python3.12
    pip
    pip3
  lib/
    python3.12/
      site-packages/   # Tumhare packages yahan jayenge
  pyvenv.cfg

# Windows pe:
venv/
  Scripts/
    activate.bat     # CMD activation
    Activate.ps1     # PowerShell activation
    python.exe
    pip.exe
  Lib/
    site-packages/
  pyvenv.cfg
```

---

## Activate aur Deactivate Karna

### Activation

Ye Node.js se sabse bada farak hai. Node mein `node_modules` khud-ba-khud dhoond liya jata hai. Python mein tumhe venv ko **activate** karna padta hai taaki shell ko pata chale ki isi environment ko use karna hai.

```bash
# macOS / Linux (bash/zsh)
source venv/bin/activate

# Windows (Command Prompt)
venv\Scripts\activate.bat

# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Windows (Git Bash)
source venv/Scripts/activate
```

Jab activate ho jata hai, tumhare terminal ka prompt badal jata hai:

```bash
# Activation se pehle
$  python --version
Python 3.12.0  # System Python

# Activation ke baad
(venv) $  python --version
Python 3.12.0  # venv ka Python (version same hai, par isolated hai)

(venv) $  which python
/path/to/my-project/venv/bin/python  # venv ko point kar raha hai!
```

`(venv)` prefix tumhara visual signal hai ki environment active hai — bilkul jaise Zomato app mein "delivering to..." tumhe batata hai ki kis address ke liye order active hai.

### Deactivation

```bash
# Bas ye run karo:
deactivate

# Prompt wapas normal ho jayega
$
```

### PowerShell Execution Policy (Windows)

Agar Windows PowerShell pe execution policy ka error aaye:

```powershell
# Ye ek baar run karo (Administrator ke roop mein)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ab activation kaam karega
venv\Scripts\Activate.ps1
```

---

## pip Se Packages Install Karna

`pip` Python ka package manager hai, `npm` jaisa. Jab tumhara venv activate hai, `pip install` packages ko venv ke andar install karta hai, globally nahi.

### Basic Commands

```bash
# Pehle apna venv activate karo!
source venv/bin/activate  # ya Windows ka equivalent

# Ek package install karo (jaise: npm install requests)
pip install requests

# Specific version install karo (jaise: npm install express@4.18.0)
pip install flask==3.0.0

# Version range ke saath install karo (jaise: npm install "express@^4.0.0")
pip install "flask>=3.0.0,<4.0.0"

# Package upgrade karo (jaise: npm update requests)
pip install --upgrade requests

# Package uninstall karo (jaise: npm uninstall requests)
pip uninstall requests

# Installed packages list karo (jaise: npm list)
pip list

# Package details dikhao (jaise: npm info requests)
pip show requests
```

### Version Specifiers Ka Comparison

```bash
# npm                          # pip
# npm install express@4.18.0   ->  pip install flask==3.0.0       # Exact
# npm install "express@^4.0"   ->  pip install "flask>=3.0,<4.0"  # Compatible range
# npm install "express@~4.18"  ->  pip install "flask~=3.0.0"     # Approximately
# npm install express@latest   ->  pip install flask               # Latest
```

---

## requirements.txt: Tumhara package.json

### pip freeze

`pip freeze` saare installed packages aur unke exact versions print karta hai. Isi se `requirements.txt` banta hai.

```bash
# Kuch packages install karne ke baad
pip install requests flask python-dotenv

# requirements.txt generate karo (package.json ki dependencies banane jaisa)
pip freeze > requirements.txt
```

Resulting `requirements.txt`:

```
blinker==1.7.0
certifi==2024.2.2
charset-normalizer==3.3.2
click==8.1.7
flask==3.0.0
idna==3.6
itsdangerous==2.1.2
Jinja2==3.1.3
MarkupSafe==2.1.4
python-dotenv==1.0.1
requests==2.31.0
urllib3==2.2.0
Werkzeug==3.0.1
```

> [!info]
> `pip freeze` mein SAARE packages aate hain, sub-dependencies bhi. Ye `package.json` se zyada `package-lock.json` jaisa hai. Isi wajah se log Poetry prefer karte hain (agla chapter).

### requirements.txt Se Install Karna

```bash
# Node.js equivalent: npm install (package.json padhta hai)
pip install -r requirements.txt
```

Ye wahi command hai jo tum tab chalaoge jab kisi aise project ko clone karoge jismein `requirements.txt` hai.

### Side-by-Side: Naya Project Shuru Karna

**Node.js workflow:**

```bash
mkdir my-node-app && cd my-node-app
npm init -y                    # package.json banata hai
npm install express dotenv     # Install karta hai aur deps record karta hai
# package.json aur package-lock.json auto-update ho jate hain
# node_modules/ automatically create hota hai
```

**Python workflow:**

```bash
mkdir my-python-app && cd my-python-app
python -m venv venv                  # Virtual environment banao
source venv/bin/activate             # Activate karo
pip install flask python-dotenv      # Packages install karo
pip freeze > requirements.txt        # Dependencies manually save karo
```

### Side-by-Side: Existing Project Clone Karna

**Node.js workflow:**

```bash
git clone https://github.com/user/node-app.git
cd node-app
npm install   # package.json padhta hai, node_modules/ banata hai
npm start     # App run karo
```

**Python workflow:**

```bash
git clone https://github.com/user/python-app.git
cd python-app
python -m venv venv                    # Virtual environment banao
source venv/bin/activate               # Activate karo
pip install -r requirements.txt        # requirements se install karo
python app.py                          # App run karo
```

---

## Complete Workflow

Yahan din-pratidin (day-to-day) ka workflow summarize kiya gaya hai:

### Project Pe Kaam Shuru Karna

```bash
cd my-project/
source venv/bin/activate    # Hamesha pehle activate karo!
# ... apna kaam karo ...
deactivate                  # Kaam khatam hone pe (optional hai, terminal band karne se bhi chalega)
```

### Naya Dependency Add Karna

```bash
# 1. Confirm karo ki venv activate hai
source venv/bin/activate

# 2. Package install karo
pip install httpx

# 3. requirements.txt update karo
pip freeze > requirements.txt

# 4. Updated requirements.txt commit karo
git add requirements.txt
git commit -m "Add httpx dependency"
```

### Dev Dependencies Ko Alag Karna

Node.js mein `dependencies` aur `devDependencies` ka clear separation hota hai. Plain pip mein aisa koi built-in separation nahi hai, lekin tum multiple requirements files use kar sakte ho:

```bash
# requirements.txt - production dependencies
flask==3.0.0
requests==2.31.0

# requirements-dev.txt - development dependencies
-r requirements.txt    # Production deps include karo
pytest==8.0.0
black==24.1.0
mypy==1.8.0
```

```bash
# Sirf production install karo
pip install -r requirements.txt

# Sab kuch install karo (production + dev)
pip install -r requirements-dev.txt
```

> [!tip]
> Behtar alternative: Poetry use karo (agla chapter), jo isko natively handle karta hai — bilkul waise jaise npm `devDependencies` ke saath karta hai.

---

## .gitignore Patterns

Jaise tum kabhi `node_modules/` commit nahi karte, waise hi apna `venv/` directory bhi kabhi commit mat karo.

### Python Ke Liye Minimal .gitignore

```gitignore
# Virtual environments (node_modules/ jaisa)
venv/
.venv/
env/

# Python cache files (.next/ ya dist/ jaisa)
__pycache__/
*.py[cod]
*$py.class
*.pyo

# Distribution / packaging
*.egg-info/
dist/
build/

# Environment variables (Node.js jaisa hi)
.env
.env.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

### Node.js .gitignore Se Comparison

```gitignore
# Node.js                    # Python
# node_modules/        ->    venv/ ya .venv/
# dist/                ->    dist/ aur build/
# .next/               ->    __pycache__/
# .env                 ->    .env (same!)
# coverage/            ->    .coverage, htmlcov/
```

---

## Common Galtiyan

### 1. Activate Karna Bhool Jana

```bash
# BAD: Bina activation ke install karoge to globally install ho jayega!
cd my-project/
pip install flask  # System Python mein chala jayega!

# GOOD: Hamesha pehle activate karo
cd my-project/
source venv/bin/activate
pip install flask  # venv mein jayega
```

**Kaise pata chalega ki venv active hai:** Apne prompt mein `(venv)` dhoondo, ya `which python` chalao (tumhare venv directory ko point karna chahiye).

### 2. venv Directory Ko Commit Kar Dena

```bash
# BAD: Ye mat karo!
git add venv/  # node_modules/ commit karne jaisa hai

# GOOD: .gitignore mein add karo
echo "venv/" >> .gitignore
```

> [!warning]
> Ye sabse common galti hai jo naye Python devs karte hain — bilkul waise jaise koi galti se `node_modules` push kar de. Repo ka size aur mess dono badh jaate hain.

### 3. requirements.txt Update Karna Bhool Jana

```bash
# Naya package install karne ke baad, hamesha freeze karo!
pip install some-new-package
pip freeze > requirements.txt  # Ye step mat bhoolna!
```

### 4. venv Mein Galat Python Version

venv wahi Python use karta hai jisse use banaya gaya tha:

```bash
# Python 3.12 ke saath venv banata hai
python3.12 -m venv venv

# Python 3.11 ke saath venv banata hai
python3.11 -m venv venv

# Agar pyenv use kar rahe ho:
pyenv local 3.12.0
python -m venv venv  # 3.12.0 use karega
```

### 5. venv Ko Recreate Karna

Agar tumhara venv corrupt ho jaye ya tum fresh start karna chahte ho:

```bash
# Delete karke recreate karo (jaise: rm -rf node_modules && npm install)
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Practice Exercises

### Exercise 1: Apna Pehla Virtual Environment Banao

```bash
# 1. Naya project directory banao
mkdir python-venv-practice
cd python-venv-practice

# 2. Virtual environment banao
python -m venv venv

# 3. Activate karo
# (apne OS ke hisab se sahi command use karo)

# 4. Verify karo: which python tumhare venv ko point karna chahiye
which python   # macOS/Linux
where python   # Windows

# 5. Deactivate karo
deactivate

# 6. Firse which python chalao -- farak notice karo!
```

### Exercise 2: Packages Install Karo Aur Freeze Karo

```bash
# 1. Exercise 1 wala venv activate karo
source venv/bin/activate

# 2. Ye packages install karo
pip install requests flask python-dotenv

# 3. Installed packages list karo
pip list

# 4. requirements.txt mein freeze karo
pip freeze > requirements.txt

# 5. requirements.txt open karo aur content dekho
# Notice karo ki isme sub-dependencies bhi shamil hain

# 6. Check karo: total kitne packages install hue?
#    (flask apne saath kai dependencies laata hai, express ki tarah)
pip list | wc -l
```

### Exercise 3: Project Clone Karna Simulate Karo

```bash
# 1. Ek "fresh" environment banao (naye developer ko simulate karte hue)
deactivate
rm -rf venv

# 2. venv recreate karo
python -m venv venv
source venv/bin/activate

# 3. requirements.txt se install karo (npm install jaisa)
pip install -r requirements.txt

# 4. Verify karo ki sab kuch install ho gaya
pip list

# 5. Test karo ki packages kaam kar rahe hain
python -c "import flask; print(f'Flask version: {flask.__version__}')"
python -c "import requests; print(f'Requests version: {requests.__version__}')"
```

### Exercise 4: .gitignore Banao

1. Apni practice directory mein git repository initialize karo
2. Sahi Python patterns ke saath ek `.gitignore` file banao
3. `git status` chalao aur verify karo ki `venv/` list mein NAHI hai
4. Verify karo ki `requirements.txt` list mein HAI (isse commit hona chahiye)

### Exercise 5: Dev Dependencies Pattern

```bash
# 1. Ye content ke saath requirements-dev.txt banao:
# -r requirements.txt
# pytest==8.0.0
# black==24.1.0

# 2. Dev dependencies install karo
pip install -r requirements-dev.txt

# 3. Verify karo ki pytest install hua
pytest --version

# 4. Socho: package.json ke devDependencies se ye kaise compare hota hai?
```

---

## Key Takeaways

- **`venv/` = `node_modules/`** — dono hi project ke dependencies ko isolate karte hain, aur dono hi `.gitignore` mein jaate hain, commit nahi hote.
- **`requirements.txt` = `package.json`** (par thoda `package-lock.json` jaisa bhi) — `pip freeze` saare installed packages (sub-dependencies samet) exact versions ke saath dump kar deta hai.
- Python mein sab kuch manual hai: pehle venv banao, phir **activate** karo (`source venv/bin/activate`), tabhi `pip install` sahi jagah (venv ke andar) jayega — Node.js ki tarah automatic nahi hai.
- Prompt mein `(venv)` dikhna matlab environment active hai — isse check karne ka sabse asaan tareeka.
- Naya package install karne ke baad `pip freeze > requirements.txt` chalana mat bhoolna, warna teammates ke paas outdated dependency list rahegi.
- `venv` corrupt ho jaye ya fresh start chahiye ho, to bindaas delete karke recreate kar do — `rm -rf venv && python -m venv venv`, bilkul `rm -rf node_modules && npm install` jaisa.
- Ye sab manual steps thode tedious lagte hain, but agla chapter (Poetry) inhe npm jaisa hi smooth bana dega.

**Next:** [03 - Package Management](./03_package_management.md) -- Poetry (npm-equivalent), pyproject.toml, aur zyada advanced dependency management ke baare mein seekho.

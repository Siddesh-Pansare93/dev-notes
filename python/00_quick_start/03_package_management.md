# 03 - Package Management (pip, Poetry, pyproject.toml)

> **Node.js devs ke liye:** `pip` samjho bare-bones `npm` jaisa hai — bas install karta hai, lock file waghera ka jhanjhat nahi rakhta. `Poetry` uska full-featured avatar hai: dependency resolution, lock files, project scaffolding sab kuch — matlab `npm` ya `yarn` jaisa proper, tameez wala experience.

---

## Table of Contents

1. [Package Management Landscape](#package-management-landscape)
2. [pip Basics](#pip-basics)
3. [Poetry: The npm of Python](#poetry-the-npm-of-python)
4. [pyproject.toml vs package.json](#pyprojecttoml-vs-packagejson)
5. [Poetry Commands vs npm Commands](#poetry-commands-vs-npm-commands)
6. [Poetry Workflow in Practice](#poetry-workflow-in-practice)
7. [pipx: Global Tools (Like npx)](#pipx-global-tools-like-npx)
8. [Which Tool Should You Use?](#which-tool-should-you-use)
9. [Practice Exercises](#practice-exercises)

---

## Package Management Landscape

Kya hota hai? Python mein Node.js ke mukable zyada package management options milte hain, isliye shuru mein thoda "itne options kyun bhai" wala feeling aata hai. Chalo poora landscape ek baar mein saaf kar dete hain — jaise Swiggy pe order karne se pehle menu dekh lete ho, waise hi:

| Tool | Node.js Equivalent | Description |
|---|---|---|
| `pip` | Bare `npm install` | Basic package installer, by default lock file nahi hota |
| `pip` + `requirements.txt` | `npm` + `package.json` | Manual dependency tracking |
| `Poetry` | `npm` / `yarn` / `pnpm` | Lock files ke saath full dependency management |
| `pipx` | `npx` | Global CLI tools ko isolation mein run/install karta hai |
| `conda` | Koi equivalent nahi | Scientific computing ke liye package manager |
| `uv` | `npm` (Rust-fast) | Naya, super fast pip/Poetry alternative |

Is guide mein hum focus karenge **pip** (jo har jagah milega, jaise UPI) aur **Poetry** (jo modern best practice hai) pe.

---

## pip Basics

Pichle chapter mein pip se milaqat ho chuki hai. Ab thoda deep dive karte hain.

### Essential pip Commands

```bash
# Pehle apna venv activate karo!
source venv/bin/activate

# Package install karo
pip install requests

# Specific version install karo
pip install requests==2.31.0

# Version constraints ke saath install karo
pip install "requests>=2.28.0,<3.0.0"   # Range
pip install "requests~=2.31.0"           # Compatible release (>=2.31.0, <2.32.0)
pip install "requests>=2.31"             # Minimum version

# Package upgrade karo
pip install --upgrade requests
pip install -U requests  # Shorthand

# Package uninstall karo
pip uninstall requests
pip uninstall -y requests  # Confirmation skip karo

# Saare installed packages list karo
pip list

# Outdated packages list karo (jaise: npm outdated)
pip list --outdated

# Package ki info dikhao (jaise: npm info requests)
pip show requests

# Search ab CLI se available nahi, https://pypi.org use karo

# requirements.txt se install karo
pip install -r requirements.txt

# Installed packages export karo
pip freeze > requirements.txt

# Editable mode mein install karo (jaise: npm link)
pip install -e .
pip install -e ./my-local-package
```

### pip vs npm Command Comparison

| Task | npm | pip |
|---|---|---|
| Install package | `npm install pkg` | `pip install pkg` |
| Install exact version | `npm install pkg@1.2.3` | `pip install pkg==1.2.3` |
| Install from file | `npm install` (package.json padhta hai) | `pip install -r requirements.txt` |
| Uninstall | `npm uninstall pkg` | `pip uninstall pkg` |
| List packages | `npm list` | `pip list` |
| Outdated packages | `npm outdated` | `pip list --outdated` |
| Package info | `npm info pkg` | `pip show pkg` |
| Upgrade package | `npm update pkg` | `pip install -U pkg` |
| Upgrade all | `npm update` | Koi built-in command nahi (pip ka koi equivalent nahi) |
| Global install | `npm install -g pkg` | `pip install pkg` (venv ke bahar) |
| Link local package | `npm link` | `pip install -e .` |

### pip Ki Limitations (Isliye Poetry Bana)

pip mein kuch gaps hain jo tumhe npm se aake khalege — jaise ek naya restaurant jisme menu toh accha hai, par table booking system nahi hai:

1. **`package.json` automatically update nahi hota** — Manually `pip freeze > requirements.txt` chalana padta hai
2. **Lock file nahi hota** — Pinned versions wali `requirements.txt` hi sabse paas ki cheez hai
3. **Dev dependency separation nahi hai** — Alag file chahiye (`requirements-dev.txt`)
4. **Install se pehle dependency resolution nahi hota** — pip order mein install karta hai, jisse conflicts ho sakte hain
5. **Project scaffolding nahi hai** — `npm init` jaisa kuch nahi

---

## Poetry: The npm of Python

[Poetry](https://python-poetry.org/) pip ki saari limitations solve kar deta hai. Python mein ye sabse zyada npm jaisa feel deta hai — thoda strict, thoda organized, bilkul dabbawala system jaisa jahan har cheez ka apna slot hota hai.

### Poetry Install Karna

```bash
# Official installer (recommended, sab platforms pe chalta hai)
curl -sSL https://install.python-poetry.org | python3 -

# Ya pip se (thoda less recommended, par chalta hai)
pip install poetry

# Ya pipx se (ideal -- isolated global install)
pipx install poetry

# Verify karo
poetry --version
```

Windows pe (PowerShell):

```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# Verify karo
poetry --version
```

### Poetry Kya Deta Hai

| Feature | npm | Poetry | pip |
|---|---|---|---|
| Project manifest | `package.json` | `pyproject.toml` | `requirements.txt` |
| Lock file | `package-lock.json` | `poetry.lock` | (kuch nahi) |
| Dependency resolution | Haan | Haan | Limited |
| Dev dependencies | `devDependencies` | `[tool.poetry.group.dev]` | Alag file |
| Scripts/commands | `npm run` / `scripts` | `poetry run` / `[tool.poetry.scripts]` | (kuch nahi) |
| Project scaffolding | `npm init` | `poetry new` / `poetry init` | (kuch nahi) |
| Publishing | `npm publish` | `poetry publish` | `twine` |
| Virtual env management | N/A (node_modules) | Automatic | Manual |

---

## pyproject.toml vs package.json

`pyproject.toml` Python ka jawab hai `package.json` ko. Side-by-side comparison dekho:

### package.json (Node.js)

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "description": "A sample application",
  "main": "index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "eslint": "^8.56.0",
    "nodemon": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT",
  "author": "Your Name",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/my-app"
  }
}
```

### pyproject.toml (Python with Poetry)

```toml
[tool.poetry]
name = "my-app"
version = "1.0.0"
description = "A sample application"
authors = ["Your Name <you@example.com>"]
license = "MIT"
readme = "README.md"
repository = "https://github.com/user/my-app"

[tool.poetry.dependencies]
python = "^3.11"
flask = "^3.0.0"
python-dotenv = "^1.0.0"
httpx = "^0.27.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
ruff = "^0.2.0"
mypy = "^1.8.0"

[tool.poetry.scripts]
start = "my_app.main:main"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

### Field-by-Field Comparison

| package.json field | pyproject.toml field | Notes |
|---|---|---|
| `name` | `[tool.poetry] name` | Same concept |
| `version` | `[tool.poetry] version` | Same concept |
| `description` | `[tool.poetry] description` | Same concept |
| `main` | N/A | Python packages ke liye `__init__.py` use hota hai |
| `scripts` | `[tool.poetry.scripts]` | Shell commands ki jagah `module:function` point karta hai |
| `dependencies` | `[tool.poetry.dependencies]` | Same concept |
| `devDependencies` | `[tool.poetry.group.dev.dependencies]` | Same concept |
| `engines.node` | `python = "^3.11"` | Dependencies section ke andar |
| `license` | `license` | Same concept |
| `author` | `authors` | Poetry mein strings ki list hoti hai |
| `repository` | `repository` | Same concept |

### Custom Scripts Comparison

Node.js mein tum scripts ko shell commands ki tarah define karte ho:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "test": "jest --coverage",
    "lint": "eslint src/"
  }
}
```

```bash
npm run start
npm test
npm run lint
```

Poetry mein tum entry points ke liye `[tool.poetry.scripts]` use kar sakte ho, ya commands run karne ke liye `poetry run`:

```toml
[tool.poetry.scripts]
start = "my_app.main:main"  # Ek Python function ko point karta hai
```

```bash
# pyproject.toml mein defined scripts run karo
poetry run start

# venv context mein koi bhi command run karo
poetry run python src/main.py
poetry run pytest --coverage
poetry run ruff check src/

# Ya shell activate kar do (jaise: source venv/bin/activate)
poetry shell
python src/main.py
```

> [!tip]
> Kai Python projects `Makefile` ya `taskipy` jaisa tool use karte hain npm scripts jaisa experience paane ke liye. Poetry ke scripts sirf Python function entry points tak limited hain.

General-purpose task running ke liye (jo npm scripts ke zyada kareeb hai), tum `taskipy` add kar sakte ho:

```toml
[tool.taskipy.tasks]
start = "python src/main.py"
test = "pytest --coverage"
lint = "ruff check src/"
```

```bash
poetry run task start
poetry run task test
```

---

## Poetry Commands vs npm Commands

Ye tumhara go-to reference table hai, bookmark kar lo:

| Task | npm | Poetry |
|---|---|---|
| Naya project banao | `npm init` | `poetry new my-project` |
| Existing dir mein initialize | `npm init` | `poetry init` |
| Saari dependencies install karo | `npm install` | `poetry install` |
| Dependency add karo | `npm install flask` | `poetry add flask` |
| Dev dependency add karo | `npm install -D jest` | `poetry add --group dev pytest` |
| Dependency remove karo | `npm uninstall flask` | `poetry remove flask` |
| Dependency update karo | `npm update flask` | `poetry update flask` |
| Sab update karo | `npm update` | `poetry update` |
| Outdated dikhao | `npm outdated` | `poetry show --outdated` |
| Script run karo | `npm run start` | `poetry run start` |
| Env mein command run karo | `npx tsc` | `poetry run mypy .` |
| Shell open karo | N/A | `poetry shell` |
| Dependency tree dikhao | `npm list --all` | `poetry show --tree` |
| Package info dikhao | `npm info flask` | `poetry show flask` |
| Package build karo | `npm pack` | `poetry build` |
| Package publish karo | `npm publish` | `poetry publish` |
| Dependencies lock karo | auto (package-lock.json) | `poetry lock` |
| Lock file check karo | `npm ci` | `poetry install --sync` |

---

## Poetry Workflow in Practice

### Naya Project Banana

```bash
# Naya project scaffold karo (jaise: npx create-react-app my-app)
poetry new my-web-app

# Ye create karta hai:
# my-web-app/
#   pyproject.toml         # Tumhara package.json equivalent
#   README.md
#   my_web_app/
#     __init__.py           # Package init
#   tests/
#     __init__.py
```

Ya existing directory mein initialize karo:

```bash
cd my-existing-project/
poetry init  # Interactive setup, npm init jaisa
```

### Dependencies Add Karna

```bash
# Production dependency add karo (jaise: npm install flask)
poetry add flask

# Dev dependency add karo (jaise: npm install -D pytest)
poetry add --group dev pytest

# Version constraint ke saath add karo
poetry add "requests>=2.28,<3.0"
poetry add flask@^3.0.0
poetry add flask@latest

# Git se add karo
poetry add git+https://github.com/user/repo.git
```

Jab tum `poetry add` chalate ho, wo bilkul ek efficient dabbawala jaisa kaam karta hai:
1. Dependencies resolve karta hai (jaise npm karta hai)
2. `pyproject.toml` update karta hai (jaise `package.json` update hota hai)
3. `poetry.lock` update karta hai (jaise `package-lock.json` update hota hai)
4. Package install karta hai

Bilkul `npm install <package>` jaisa — bas ek command, baaki sab khud handle ho jaata hai.

### Dependencies Install Karna (Project Clone Karke)

```bash
# Clone karo aur install karo (jaise: git clone && npm install)
git clone https://github.com/user/python-app.git
cd python-app
poetry install  # pyproject.toml + poetry.lock padhta hai, venv banata hai

# Sirf production install karo (jaise: npm install --production)
poetry install --only main

# Environment ko lock file se exactly sync karo (jaise: npm ci)
poetry install --sync
```

### Virtual Environment Handling

Poetry virtual environments ko automatically manage karta hai — tumhe khud `venv` banane ki zaroorat hi nahi:

```bash
# Poetry tumhare liye venv create aur manage karta hai!
poetry install  # Agar exist nahi karta to venv create karta hai

# venv mein commands run karo
poetry run python my_script.py
poetry run pytest

# Ya venv shell activate karo
poetry shell
python my_script.py  # Ab python venv wale Python ko point karega
exit                  # Poetry shell chhod do

# Dekho venv kahan located hai
poetry env info

# Poetry ko config karo ki venv project directory mein bane (jaise node_modules)
poetry config virtualenvs.in-project true
# Ab venv tumhare project mein .venv/ pe hoga
```

> [!tip]
> Recommended setting: `poetry config virtualenvs.in-project true` globally run karo. Isse Poetry `.venv/` tumhare project directory mein banata hai, jo dhundhna aasan hai aur IDEs ke saath better kaam karta hai.

---

## pipx: Global Tools (Like npx)

`pipx` Python CLI tools ko isolated environments mein globally install karta hai. Ye `npx` ya `npm install -g` jaisa hai, bas zyada safe — har tool apni alag jagah mein rehta hai, ek dusre ke saath ghulta-milta nahi.

### pipx Install Karna

```bash
# macOS
brew install pipx
pipx ensurepath

# Linux
python3 -m pip install --user pipx
pipx ensurepath

# Windows
pip install pipx
pipx ensurepath
```

### pipx Use Karna

```bash
# npx equivalent:                    pipx equivalent:
# npx create-react-app my-app   ->  pipx run cookiecutter gh:user/template
# npm install -g typescript      ->  pipx install poetry
# npm install -g eslint          ->  pipx install ruff

# Tool ko globally install karo (isolated)
pipx install poetry
pipx install black
pipx install ruff
pipx install httpie

# Bina install kiye tool run karo (jaise npx)
pipx run black my_file.py
pipx run cowsay "Hello from Python!"

# Globally installed tools list karo
pipx list

# Tool upgrade karo
pipx upgrade poetry

# Tool uninstall karo
pipx uninstall poetry
```

### npx vs pipx Comparison

| Task | npx | pipx |
|---|---|---|
| Bina install kiye run karo | `npx cowsay hello` | `pipx run cowsay hello` |
| Globally install karo | `npm install -g typescript` | `pipx install poetry` |
| Global tools list karo | `npm list -g` | `pipx list` |
| Global tool upgrade karo | `npm update -g typescript` | `pipx upgrade poetry` |
| Global tool uninstall karo | `npm uninstall -g typescript` | `pipx uninstall poetry` |

---

## Which Tool Should You Use?

Kaunsa tool kab use karein? Seedhi si guideline hai:

### Learning / Chhote Scripts Ke Liye

**pip + venv + requirements.txt** use karo. Simple hai aur har jagah milega — jaise cash payment, kabhi fail nahi hota.

```bash
python -m venv venv
source venv/bin/activate
pip install requests
pip freeze > requirements.txt
```

### Real Projects Ke Liye

**Poetry** use karo. Ye tumhe wahi npm-jaisa experience deta hai jo tumhe pehle se aata hai.

```bash
poetry new my-project
cd my-project
poetry add flask requests
poetry add --group dev pytest ruff
poetry run python main.py
```

### Global CLI Tools Ke Liye

**pipx** use karo. Kabhi bhi pip se tools globally install mat karo — isse system-wide mess ho jaata hai.

```bash
pipx install poetry
pipx install black
pipx install ruff
```

### Quick Decision Chart

```
CLI tool globally install karna hai?  -> pipx
Naya project shuru kar rahe ho?       -> poetry new
Existing project pe kaam kar rahe ho
  aur pyproject.toml hai?             -> poetry install
  aur requirements.txt hai?           -> pip install -r requirements.txt
Quick script / learning?              -> pip + venv
```

---

## Practice Exercises

### Exercise 1: pip Deep Dive

```bash
# 1. venv ke saath naya project banao
mkdir pip-practice && cd pip-practice
python -m venv venv
source venv/bin/activate

# 2. Ye packages install karo:
#    - requests
#    - flask
#    - python-dotenv

# 3. pip show use karke flask package inspect karo
#    - Kaunsa version install hua?
#    - Iski dependencies kya hain?

# 4. Updates check karne ke liye pip list --outdated use karo

# 5. requirements freeze karo aur file examine karo
pip freeze > requirements.txt

# 6. Total kitne packages install hain? (pip list | wc -l)
#    3 install kiye the, itne zyada kyun hain?
```

### Exercise 2: Poetry Project Setup

```bash
# 1. Agar pehle nahi kiya to Poetry install karo
pipx install poetry
# ya: curl -sSL https://install.python-poetry.org | python3 -

# 2. Poetry ko config karo ki venv project directory mein bane
poetry config virtualenvs.in-project true

# 3. Naya project banao
poetry new my-poetry-app
cd my-poetry-app

# 4. Dependencies add karo
poetry add requests flask

# 5. Dev dependencies add karo
poetry add --group dev pytest ruff

# 6. Generated pyproject.toml examine karo
#    Mentally isko package.json se compare karo

# 7. poetry.lock file dekho
#    Ye package-lock.json se kaise compare hota hai?

# 8. Poetry ke through Python command run karo
poetry run python -c "import flask; print(flask.__version__)"
```

### Exercise 3: Full Workflow Simulate Karo

```bash
# Socho tum ek naya developer ho jo project join kar raha hai

# 1. Project se bahar jao aur .venv delete karo
cd ..
rm -rf my-poetry-app/.venv

# 2. Wapas andar jao aur install karo (fresh clone jaisa)
cd my-poetry-app
poetry install

# 3. Sab kuch verify karo ki chal raha hai
poetry run python -c "import requests; print('requests:', requests.__version__)"
poetry run pytest  # Chalna chahiye (koi test na ho tab bhi)

# 4. Compare karo: ye npm install + npm test se kaisa feel hota hai?
```

### Exercise 4: pyproject.toml Explore Karo

Ye `pyproject.toml` haath se banao (Poetry ke bina) aur har section samjho:

```toml
[tool.poetry]
name = "exercise-app"
version = "0.1.0"
description = "My practice Python app"
authors = ["Your Name <you@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.31.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"

[tool.poetry.scripts]
greet = "exercise_app.main:greet"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

Fir:
1. `exercise_app/main.py` banao jisme `greet()` function ho jo "Hello from Poetry!" print kare
2. `exercise_app/__init__.py` banao (empty file)
3. `poetry install` chalao
4. `poetry run greet` chalao
5. Compare karo: ye bilkul waisa hi hai jaise package.json mein `"scripts": { "greet": "node src/greet.js" }` set karna

### Exercise 5: pipx Exploration

```bash
# 1. Agar nahi kiya to pipx install karo
# 2. Ek fun CLI tool install karo
pipx install cowsay

# 3. Run karo
cowsay "I'm learning Python package management!"

# 4. Bina install kiye run karke dekho (npx-style)
pipx run pyfiglet "Hello"

# 5. Installed tools list karo
pipx list

# 6. Clean up karo
pipx uninstall cowsay
```

---

**Next:** [04 - Node.js to Python Cheatsheet](./04_nodejs_to_python_cheatsheet.md) -- Ek comprehensive side-by-side syntax reference jo tumhe baar-baar kaam aayega.

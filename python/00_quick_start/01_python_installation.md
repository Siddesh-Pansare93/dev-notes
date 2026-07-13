# 01 - Python Installation & Version Management

> **Node.js developers ke liye:** `pyenv` ko Python ka `nvm` samjho. Agar tumne kabhi Node.js versions manage karne ke liye `nvm` use kiya hai, toh yeh concept tumhe turant samajh aa jayega.

---

## Table of Contents

1. [Version Management Kyun Zaruri Hai](#why-version-management-matters)
2. [Python Directly Install Karna](#installing-python-directly)
3. [pyenv: Python ka nvm](#pyenv-the-nvm-of-python)
4. [pyenv Commands vs nvm Commands](#pyenv-commands-vs-nvm-commands)
5. [Global aur Local Versions Set Karna](#setting-global-and-local-versions)
6. [Apna Setup Verify Karna](#verifying-your-setup)
7. [Practice Exercises](#practice-exercises)

---

## Why Version Management Matters

Node.js developer hone ke naate tumhe pata hi hoga — alag-alag projects ko alag-alag Node versions chahiye hote hain. Python mein bhi bilkul yahi dard hai. Kuch projects ko Python 3.9 chahiye, kuch ko 3.12, aur koi purana legacy code toh 3.8 tak maang sakta hai.

Socho ek company mein 5 saal purana ek microservice chal raha hai jo Python 3.8 pe bana tha, aur naya wala jo tumne abhi likha hai woh 3.12 ki fancy features use karta hai. Dono ek hi machine pe chalane hain — isliye version management zaruri hai.

| Concept | Node.js | Python |
|---|---|---|
| Version manager | `nvm` | `pyenv` |
| Runtime | `node` | `python` / `python3` |
| REPL | `node` (bina args ke) | `python` (bina args ke) |
| Script run karna | `node script.js` | `python script.py` |

---

## Installing Python Directly

pyenv pe jaane se pehle, dekhte hain ki har platform pe Python directly kaise install karte hain. Agar tumhe bas jaldi ek version chahiye, toh yeh kaafi hai.

### Windows

**Option A: Python.org Installer (beginners ke liye best)**

1. [python.org/downloads](https://www.python.org/downloads/) pe jao
2. Latest Python 3.x installer download karo
3. **ZARURI:** Installation ke dauraan "Add Python to PATH" checkbox zaroor check karo
4. "Install Now" click karo

**Option B: winget (Windows Package Manager)**

```powershell
# Latest Python install karo
winget install Python.Python.3.12

# Verify karo
python --version
```

**Option C: Chocolatey**

```powershell
# Pehle Chocolatey install karo agar nahi kiya: https://chocolatey.org/install
choco install python --version=3.12.0

# Verify karo
python --version
```

### macOS

**Homebrew use karke (recommended):**

```bash
# Agar Homebrew nahi hai toh pehle install karo
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python install karo
brew install python@3.12

# Verify karo
python3 --version
```

> **Note:** macOS mein pehle se ek system Python aata hai, lekin woh aksar purana hota hai. Hamesha apna khud ka install karo — system wale ko chhedo mat.

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Verify karo
python3 --version
```

### Linux (Fedora)

```bash
sudo dnf install python3 python3-pip

# Verify karo
python3 --version
```

---

## pyenv: The nvm of Python

Direct installation kaam toh karta hai, lekin jab multiple versions manage karne ho toh dard shuru ho jaata hai. Yahaan aata hai **pyenv** — yeh bilkul waisa hi hai jaisa `nvm` Node.js ke liye hai.

### pyenv Kyun Use Karein?

- Multiple Python versions ek saath side-by-side install kar sakte ho
- Har project ke liye alag version switch kar sakte ho (jaise `.nvmrc`)
- `sudo` ya system-wide changes ki zarurat nahi
- `.python-version` file use hoti hai (jo `.nvmrc` ya `.node-version` jaisi hi hai)

### Installing pyenv

#### Windows: pyenv-win

```powershell
# Option A: pip use karke
pip install pyenv-win --target %USERPROFILE%\\.pyenv

# Option B: PowerShell use karke (recommended)
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"; &"./install-pyenv-win.ps1"

# Option C: Chocolatey use karke
choco install pyenv-win

# Option D: winget use karke
winget install pyenv-win
```

Install hone ke baad, in cheezon ko system PATH mein add karo (installer aksar khud kar deta hai):
- `%USERPROFILE%\.pyenv\pyenv-win\bin`
- `%USERPROFILE%\.pyenv\pyenv-win\shims`

Terminal restart karo, phir verify karo:

```powershell
pyenv --version
```

#### macOS

```bash
# Homebrew use karke
brew update
brew install pyenv

# Apne shell config mein add karo (~/.zshrc ya ~/.bashrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# Shell reload karo
source ~/.zshrc

# Verify karo
pyenv --version
```

#### Linux

```bash
# Pehle dependencies install karo (Ubuntu/Debian)
sudo apt update
sudo apt install -y make build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
  libffi-dev liblzma-dev

# pyenv install karo
curl https://pyenv.run | bash

# Apne shell config mein add karo (~/.bashrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc

# Shell reload karo
source ~/.bashrc

# Verify karo
pyenv --version
```

---

## pyenv Commands vs nvm Commands

Yeh raha tumhara translation cheatsheet — jo bhi nvm command tumhe yaad hai, uska pyenv version yahin mil jayega:

| Task | nvm (Node.js) | pyenv (Python) |
|---|---|---|
| Installable versions list karna | `nvm ls-remote` | `pyenv install --list` |
| Version install karna | `nvm install 20.11.0` | `pyenv install 3.12.0` |
| Installed versions list karna | `nvm ls` | `pyenv versions` |
| Version globally use karna | `nvm alias default 20` | `pyenv global 3.12.0` |
| Current dir mein version use karna | `nvm use 20` | `pyenv local 3.12.0` |
| Current version dikhana | `nvm current` ya `node -v` | `pyenv version` ya `python --version` |
| Version uninstall karna | `nvm uninstall 18` | `pyenv uninstall 3.11.0` |
| Version file | `.nvmrc` / `.node-version` | `.python-version` |
| Specific version se run karna | `nvm exec 18 node app.js` | `pyenv shell 3.11.0 && python app.py` |

### Example Workflow

```bash
# ---- nvm workflow jo tumhe pehle se pata hai ----
# nvm install 20.11.0
# nvm use 20.11.0
# echo "20.11.0" > .nvmrc
# node --version  # v20.11.0

# ---- pyenv ka equivalent ----
pyenv install 3.12.0
pyenv local 3.12.0       # .python-version file automatically bana deta hai
python --version          # Python 3.12.0
```

---

## Setting Global and Local Versions

### Global Version (System-wide Default)

Yeh tumhare pure system ke liye default Python version set kar deta hai, bilkul `nvm alias default` ki tarah.

```bash
# Global default set karo
pyenv global 3.12.0

# Verify karo
python --version
# Python 3.12.0
```

### Local Version (Per-Project)

Yeh current directory mein ek `.python-version` file bana deta hai, bilkul `.nvmrc` ki tarah.

```bash
# Apne project mein jao
cd my-project/

# Local version set karo
pyenv local 3.11.0

# Isse .python-version file ban jaati hai
cat .python-version
# 3.11.0

# Ab is directory ke andar python 3.11.0 pe point karega
python --version
# Python 3.11.0

# Lekin is directory ke bahar, global version hi use hoga
cd ..
python --version
# Python 3.12.0
```

### Shell Version (Sirf Current Terminal Session Ke Liye)

Sirf current terminal session ke liye temporary override:

```bash
# Sirf isi terminal session pe asar hoga
pyenv shell 3.10.0

python --version
# Python 3.10.0

# Kaam hone ke baad unset kar do
pyenv shell --unset
```

### Version Priority Order

pyenv yeh decide karta hai ki kaunsa Python version use karna hai, is order mein (sabse high priority pehle):

1. `PYENV_VERSION` environment variable (`pyenv shell` se set hota hai)
2. Current directory ki `.python-version` file (`pyenv local` se set hoti hai)
3. Parent directories ki `.python-version` file (tree mein upar tak dhundta hai)
4. Global version (`pyenv global` se set hota hai)

Yeh bilkul waisa hi hai jaise nvm `.nvmrc` files ko resolve karta hai.

---

## Verifying Your Setup

Yeh commands run karo yeh check karne ke liye ki sab kuch sahi chal raha hai:

```bash
# Python version check karo
python --version
# Python 3.12.x

# pip check karo (Python ka package manager, npm jaisa)
pip --version
# pip 24.x.x from ...

# pyenv check karo
pyenv --version
# pyenv 2.x.x

# Installed Python versions list karo
pyenv versions
#   system
# * 3.12.0 (set by /home/user/.pyenv/version)

# Python REPL start karo (jaise `node` bina args ke chalate ho)
python
# Python 3.12.0 ...
# >>> print("Hello from Python!")
# Hello from Python!
# >>> exit()
```

### Windows Users Ke Common Gotchas

Windows pe, kabhi-kabhi `python` ki jagah `python3` use karna padega, ya ulta. Agar `python` type karne pe Microsoft Store khul jaaye, toh yeh karo:

1. Settings > Apps > Advanced app settings > App execution aliases kholo
2. `python.exe` aur `python3.exe` ke "App Installer" entries ko off kar do

### macOS/Linux Users Ke Common Gotchas

macOS aur Linux pe, system Python aksar `python3` hota hai, `python` nahi. pyenv ke saath, `python` aur `python3` dono tumhare pyenv-managed version pe hi point karenge.

```bash
# pyenv ke bina - confusing
python --version   # Python 2.7 ho sakta hai ya "command not found"
python3 --version  # Python 3.x (system wala)

# pyenv ke saath - clean
python --version   # Python 3.12.0 (pyenv-managed)
python3 --version  # Python 3.12.0 (pyenv-managed)
```

> [!tip]
> Agar confusion ho rahi hai ki kaunsa Python chal raha hai, `which python` (macOS/Linux) ya `where python` (Windows) chala ke dekh lo — path se pata chal jayega ki system wala use ho raha hai ya pyenv wala.

---

## Practice Exercises

### Exercise 1: Python Install Karo

Upar diye gaye kisi bhi method se Python 3.12 (ya latest stable version) apne system pe install karo. Installation verify karo:

```bash
python --version
pip --version
```

### Exercise 2: pyenv Install aur Configure Karo

1. Apne platform ke liye pyenv install karo
2. Do alag-alag Python versions install karo:
   ```bash
   pyenv install 3.11.0
   pyenv install 3.12.0
   ```
3. 3.12.0 ko global default set karo:
   ```bash
   pyenv global 3.12.0
   ```
4. `pyenv versions` aur `python --version` se verify karo

### Exercise 3: Per-Project Version

1. `python-test` naam ki ek nayi directory banao
2. Local Python version 3.11.0 set karo
3. Verify karo ki `.python-version` ban gayi hai
4. Directory ke andar aur bahar `python --version` check karo
5. Compare karo: yeh tumhare `.nvmrc` workflow se kaisa lag raha hai?

### Exercise 4: REPL Explore Karo

1. Bina kisi argument ke `python` type karke REPL start karo
2. Yeh commands try karo:
   ```python
   print("Hello, World!")
   2 + 2
   "hello" * 3
   import this  # Easter egg!
   exit()
   ```
3. Compare karo: yeh `node` chala ke Node.js REPL milne se kaisa alag lagta hai?

---

**Key Takeaways:**

- `pyenv` = Python ka `nvm`. Concept bilkul same hai — multiple versions rakho, per-project switch karo, koi sudo drama nahi.
- `.python-version` file `.nvmrc` ka Python cousin hai.
- Version resolve karne ka order: `PYENV_VERSION` env var > local `.python-version` > parent `.python-version` > global version.
- Windows pe `python` aur macOS/Linux pe `python3` — dhyan rakho konsa use karna hai, ya phir pyenv install kar lo taaki dono ek hi version pe point karein.
- Direct installer se kaam chal jayega single-version setups ke liye, lekin real projects mein pyenv hi better hai.

---

**Next:** [02 - Virtual Environments](./02_virtual_environments.md) -- `venv` ke baare mein jaano, jo Python ka jawab hai `node_modules` isolation ka.

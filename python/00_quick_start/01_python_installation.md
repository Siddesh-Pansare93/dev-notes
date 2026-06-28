# 01 - Python Installation & Version Management

> **For Node.js developers:** Think of `pyenv` as Python's `nvm`. If you've used `nvm` to manage Node.js versions, you already understand the concept.

---

## Table of Contents

1. [Why Version Management Matters](#why-version-management-matters)
2. [Installing Python Directly](#installing-python-directly)
3. [pyenv: The nvm of Python](#pyenv-the-nvm-of-python)
4. [pyenv Commands vs nvm Commands](#pyenv-commands-vs-nvm-commands)
5. [Setting Global and Local Versions](#setting-global-and-local-versions)
6. [Verifying Your Setup](#verifying-your-setup)
7. [Practice Exercises](#practice-exercises)

---

## Why Version Management Matters

As a Node.js developer, you know the pain of different projects requiring different Node versions. Python has the same challenge. Some projects need Python 3.9, others need 3.12, and legacy code might even need 3.8.

| Concept | Node.js | Python |
|---|---|---|
| Version manager | `nvm` | `pyenv` |
| Runtime | `node` | `python` / `python3` |
| REPL | `node` (no args) | `python` (no args) |
| Run a script | `node script.js` | `python script.py` |

---

## Installing Python Directly

Before we get to pyenv, here's how to install Python directly on each platform. This is useful if you just need one version quickly.

### Windows

**Option A: Python.org Installer (Recommended for beginners)**

1. Go to [python.org/downloads](https://www.python.org/downloads/)
2. Download the latest Python 3.x installer
3. **IMPORTANT:** Check the box "Add Python to PATH" during installation
4. Click "Install Now"

**Option B: winget (Windows Package Manager)**

```powershell
# Install the latest Python
winget install Python.Python.3.12

# Verify
python --version
```

**Option C: Chocolatey**

```powershell
# Install Chocolatey first if you haven't: https://chocolatey.org/install
choco install python --version=3.12.0

# Verify
python --version
```

### macOS

**Using Homebrew (recommended):**

```bash
# Install Homebrew if you haven't
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.12

# Verify
python3 --version
```

> **Note:** macOS comes with a system Python, but it's often outdated. Always install your own.

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Verify
python3 --version
```

### Linux (Fedora)

```bash
sudo dnf install python3 python3-pip

# Verify
python3 --version
```

---

## pyenv: The nvm of Python

Direct installation works, but managing multiple versions is painful. Enter **pyenv** -- it's exactly what `nvm` is for Node.js.

### Why pyenv?

- Install multiple Python versions side by side
- Switch between versions per-project (like `.nvmrc`)
- No need for `sudo` or system-wide changes
- Uses a `.python-version` file (equivalent to `.nvmrc` or `.node-version`)

### Installing pyenv

#### Windows: pyenv-win

```powershell
# Option A: Using pip
pip install pyenv-win --target %USERPROFILE%\\.pyenv

# Option B: Using PowerShell (recommended)
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"; &"./install-pyenv-win.ps1"

# Option C: Using Chocolatey
choco install pyenv-win

# Option D: Using winget
winget install pyenv-win
```

After installing, add these to your system PATH (the installer usually does this):
- `%USERPROFILE%\.pyenv\pyenv-win\bin`
- `%USERPROFILE%\.pyenv\pyenv-win\shims`

Restart your terminal, then verify:

```powershell
pyenv --version
```

#### macOS

```bash
# Using Homebrew
brew update
brew install pyenv

# Add to your shell config (~/.zshrc or ~/.bashrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Verify
pyenv --version
```

#### Linux

```bash
# Install dependencies first (Ubuntu/Debian)
sudo apt update
sudo apt install -y make build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
  libffi-dev liblzma-dev

# Install pyenv
curl https://pyenv.run | bash

# Add to your shell config (~/.bashrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc

# Reload shell
source ~/.bashrc

# Verify
pyenv --version
```

---

## pyenv Commands vs nvm Commands

Here's your translation cheatsheet:

| Task | nvm (Node.js) | pyenv (Python) |
|---|---|---|
| List installable versions | `nvm ls-remote` | `pyenv install --list` |
| Install a version | `nvm install 20.11.0` | `pyenv install 3.12.0` |
| List installed versions | `nvm ls` | `pyenv versions` |
| Use a version globally | `nvm alias default 20` | `pyenv global 3.12.0` |
| Use a version in current dir | `nvm use 20` | `pyenv local 3.12.0` |
| Show current version | `nvm current` or `node -v` | `pyenv version` or `python --version` |
| Uninstall a version | `nvm uninstall 18` | `pyenv uninstall 3.11.0` |
| Version file | `.nvmrc` / `.node-version` | `.python-version` |
| Run with specific version | `nvm exec 18 node app.js` | `pyenv shell 3.11.0 && python app.py` |

### Example Workflow

```bash
# ---- nvm workflow you already know ----
# nvm install 20.11.0
# nvm use 20.11.0
# echo "20.11.0" > .nvmrc
# node --version  # v20.11.0

# ---- pyenv equivalent ----
pyenv install 3.12.0
pyenv local 3.12.0       # creates .python-version file automatically
python --version          # Python 3.12.0
```

---

## Setting Global and Local Versions

### Global Version (System-wide Default)

This sets the default Python version for your entire system, just like `nvm alias default`.

```bash
# Set global default
pyenv global 3.12.0

# Verify
python --version
# Python 3.12.0
```

### Local Version (Per-Project)

This creates a `.python-version` file in the current directory, just like `.nvmrc`.

```bash
# Navigate to your project
cd my-project/

# Set local version
pyenv local 3.11.0

# This creates a .python-version file
cat .python-version
# 3.11.0

# Now python points to 3.11.0 in this directory
python --version
# Python 3.11.0

# But outside this directory, the global version is used
cd ..
python --version
# Python 3.12.0
```

### Shell Version (Current Terminal Session Only)

Temporary override for the current terminal session:

```bash
# Only affects this terminal session
pyenv shell 3.10.0

python --version
# Python 3.10.0

# Unset when done
pyenv shell --unset
```

### Version Priority Order

pyenv resolves which Python version to use in this order (highest priority first):

1. `PYENV_VERSION` environment variable (set by `pyenv shell`)
2. `.python-version` file in current directory (set by `pyenv local`)
3. `.python-version` file in parent directories (walks up the tree)
4. Global version (set by `pyenv global`)

This is very similar to how nvm resolves `.nvmrc` files.

---

## Verifying Your Setup

Run these commands to make sure everything is working:

```bash
# Check Python version
python --version
# Python 3.12.x

# Check pip (Python's package manager, like npm)
pip --version
# pip 24.x.x from ...

# Check pyenv
pyenv --version
# pyenv 2.x.x

# List installed Python versions
pyenv versions
#   system
# * 3.12.0 (set by /home/user/.pyenv/version)

# Start the Python REPL (like running `node` with no args)
python
# Python 3.12.0 ...
# >>> print("Hello from Python!")
# Hello from Python!
# >>> exit()
```

### Common Gotchas for Windows Users

On Windows, you might need to use `python` instead of `python3`, or vice versa. If `python` opens the Microsoft Store, you need to:

1. Open Settings > Apps > Advanced app settings > App execution aliases
2. Turn off the "App Installer" entries for `python.exe` and `python3.exe`

### Common Gotchas for macOS/Linux Users

On macOS and Linux, the system Python is often `python3`, not `python`. With pyenv, both `python` and `python3` will point to your pyenv-managed version.

```bash
# Without pyenv - confusing
python --version   # might be Python 2.7 or "command not found"
python3 --version  # Python 3.x (system)

# With pyenv - clean
python --version   # Python 3.12.0 (pyenv-managed)
python3 --version  # Python 3.12.0 (pyenv-managed)
```

---

## Practice Exercises

### Exercise 1: Install Python

Install Python 3.12 (or the latest stable version) on your system using any method described above. Verify the installation:

```bash
python --version
pip --version
```

### Exercise 2: Install and Configure pyenv

1. Install pyenv for your platform
2. Install two different Python versions:
   ```bash
   pyenv install 3.11.0
   pyenv install 3.12.0
   ```
3. Set 3.12.0 as your global default:
   ```bash
   pyenv global 3.12.0
   ```
4. Verify with `pyenv versions` and `python --version`

### Exercise 3: Per-Project Version

1. Create a new directory called `python-test`
2. Set the local Python version to 3.11.0
3. Verify that `.python-version` was created
4. Check `python --version` inside and outside the directory
5. Compare: how does this feel compared to your `.nvmrc` workflow?

### Exercise 4: Explore the REPL

1. Start the Python REPL by typing `python` with no arguments
2. Try these commands:
   ```python
   print("Hello, World!")
   2 + 2
   "hello" * 3
   import this  # Easter egg!
   exit()
   ```
3. Compare: how does this feel compared to running `node` to get the Node.js REPL?

---

**Next:** [02 - Virtual Environments](./02_virtual_environments.md) -- Learn about `venv`, Python's answer to `node_modules` isolation.

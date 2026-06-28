# 02 - Virtual Environments (venv, pip, requirements.txt)

> **For Node.js developers:** A Python virtual environment (`venv`) serves the same purpose as `node_modules` -- it isolates your project's dependencies. `requirements.txt` is like a simplified `package.json`.

---

## Table of Contents

1. [The Mental Model: node_modules vs venv](#the-mental-model-node_modules-vs-venv)
2. [How Python Dependency Isolation Works](#how-python-dependency-isolation-works)
3. [Creating a Virtual Environment](#creating-a-virtual-environment)
4. [Activating and Deactivating](#activating-and-deactivating)
5. [Installing Packages with pip](#installing-packages-with-pip)
6. [requirements.txt: Your package.json](#requirementstxt-your-packagejson)
7. [The Complete Workflow](#the-complete-workflow)
8. [.gitignore Patterns](#gitignore-patterns)
9. [Common Pitfalls](#common-pitfalls)
10. [Practice Exercises](#practice-exercises)

---

## The Mental Model: node_modules vs venv

Let's map what you already know:

| Concept | Node.js | Python |
|---|---|---|
| Dependency isolation | `node_modules/` directory | Virtual environment (`venv/` directory) |
| Dependency manifest | `package.json` | `requirements.txt` (or `pyproject.toml`) |
| Lock file | `package-lock.json` | (none with pip; `poetry.lock` with Poetry) |
| Install all deps | `npm install` | `pip install -r requirements.txt` |
| Add a package | `npm install express` | `pip install flask` |
| Remove a package | `npm uninstall express` | `pip uninstall flask` |
| List packages | `npm list` | `pip list` or `pip freeze` |
| Global install location | Global `node_modules` | System Python's `site-packages` |
| Project install location | `./node_modules/` | `./venv/lib/python3.x/site-packages/` |

### Key Difference

In Node.js, running `npm install express` automatically creates `node_modules/` and adds it to `package.json`. Python's workflow has more manual steps:

```bash
# Node.js - one step does everything
npm install express  # creates node_modules/, updates package.json

# Python - more explicit steps
python -m venv venv           # 1. Create the virtual environment
source venv/bin/activate      # 2. Activate it (tell your shell to use it)
pip install flask             # 3. Install the package
pip freeze > requirements.txt # 4. Save the dependency list manually
```

It's more manual, but you'll get used to it quickly. Tools like Poetry (covered in the next chapter) make this more automatic.

---

## How Python Dependency Isolation Works

### The Problem (Same as Node.js)

Without isolation, packages install globally. Project A needs `requests==2.28` and Project B needs `requests==2.31` -- they'd conflict.

### How Node.js Solves It

Each project has its own `node_modules/` folder. When you `require('express')`, Node looks in the local `node_modules/` first.

### How Python Solves It

A **virtual environment** is a self-contained directory that has its own Python binary and its own `site-packages` directory (where packages are installed). When you "activate" a venv, your shell's `PATH` is modified so that `python` and `pip` point to the venv's copies.

```
my-project/
  venv/                    # Like node_modules/ -- don't commit this!
    bin/ (or Scripts/)     # Python and pip executables
    lib/
      python3.12/
        site-packages/     # Installed packages go here
    pyvenv.cfg             # venv config
  app.py
  requirements.txt         # Like package.json dependencies
```

---

## Creating a Virtual Environment

The `venv` module is included with Python 3.3+ (no extra install needed).

```bash
# Navigate to your project directory
cd my-project/

# Create a virtual environment
# Convention: name it "venv" or ".venv"
python -m venv venv
```

The `-m venv` means "run the `venv` module." The second `venv` is the directory name. You can name it anything, but `venv` or `.venv` are standard conventions.

```bash
# These are all valid -- pick one convention and stick with it
python -m venv venv     # Most common
python -m venv .venv    # Hidden directory (common in VS Code projects)
python -m venv env      # Also seen sometimes
```

> **Convention tip:** `.venv` (with the dot) is increasingly popular because VS Code auto-detects it and it's hidden by default in `ls` output.

### What Gets Created

```bash
# After running: python -m venv venv

# On macOS/Linux:
venv/
  bin/
    activate         # Shell script to activate
    activate.csh
    activate.fish
    python -> python3.12
    python3 -> python3.12
    pip
    pip3
  lib/
    python3.12/
      site-packages/   # Your packages will go here
  pyvenv.cfg

# On Windows:
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

## Activating and Deactivating

### Activation

This is the biggest difference from Node.js. With Node, `node_modules` is found automatically. With Python, you must **activate** the venv to tell your shell to use it.

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

When activated, your terminal prompt changes:

```bash
# Before activation
$  python --version
Python 3.12.0  # System Python

# After activation
(venv) $  python --version
Python 3.12.0  # venv Python (same version, but isolated)

(venv) $  which python
/path/to/my-project/venv/bin/python  # Points to venv!
```

The `(venv)` prefix is your visual indicator that the environment is active.

### Deactivation

```bash
# Simply run:
deactivate

# Prompt goes back to normal
$
```

### PowerShell Execution Policy (Windows)

If you get an error on Windows PowerShell about execution policies:

```powershell
# Run this once (as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Now activation will work
venv\Scripts\Activate.ps1
```

---

## Installing Packages with pip

`pip` is Python's package manager, like `npm`. When your venv is activated, `pip install` installs packages into the venv, not globally.

### Basic Commands

```bash
# Activate your venv first!
source venv/bin/activate  # or Windows equivalent

# Install a package (like: npm install requests)
pip install requests

# Install a specific version (like: npm install express@4.18.0)
pip install flask==3.0.0

# Install with version range (like: npm install "express@^4.0.0")
pip install "flask>=3.0.0,<4.0.0"

# Upgrade a package (like: npm update requests)
pip install --upgrade requests

# Uninstall a package (like: npm uninstall requests)
pip uninstall requests

# List installed packages (like: npm list)
pip list

# Show package details (like: npm info requests)
pip show requests
```

### Version Specifiers Comparison

```bash
# npm                          # pip
# npm install express@4.18.0   ->  pip install flask==3.0.0       # Exact
# npm install "express@^4.0"   ->  pip install "flask>=3.0,<4.0"  # Compatible range
# npm install "express@~4.18"  ->  pip install "flask~=3.0.0"     # Approximately
# npm install express@latest   ->  pip install flask               # Latest
```

---

## requirements.txt: Your package.json

### pip freeze

`pip freeze` outputs all installed packages and their exact versions. This is how you create `requirements.txt`.

```bash
# After installing some packages
pip install requests flask python-dotenv

# Generate requirements.txt (like creating package.json dependencies)
pip freeze > requirements.txt
```

The resulting `requirements.txt`:

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

> **Note:** `pip freeze` includes ALL packages, including sub-dependencies. It's more like `package-lock.json` than `package.json`. This is one reason people prefer Poetry (covered next chapter).

### Installing from requirements.txt

```bash
# Node.js equivalent: npm install (reads package.json)
pip install -r requirements.txt
```

This is the command you'll run when cloning a project that has a `requirements.txt`.

### Side-by-Side: Starting a New Project

**Node.js workflow:**

```bash
mkdir my-node-app && cd my-node-app
npm init -y                    # Creates package.json
npm install express dotenv     # Installs and records deps
# package.json and package-lock.json are auto-updated
# node_modules/ is created automatically
```

**Python workflow:**

```bash
mkdir my-python-app && cd my-python-app
python -m venv venv                  # Create virtual environment
source venv/bin/activate             # Activate it
pip install flask python-dotenv      # Install packages
pip freeze > requirements.txt        # Manually save dependencies
```

### Side-by-Side: Cloning an Existing Project

**Node.js workflow:**

```bash
git clone https://github.com/user/node-app.git
cd node-app
npm install   # Reads package.json, creates node_modules/
npm start     # Run the app
```

**Python workflow:**

```bash
git clone https://github.com/user/python-app.git
cd python-app
python -m venv venv                    # Create virtual environment
source venv/bin/activate               # Activate it
pip install -r requirements.txt        # Install from requirements
python app.py                          # Run the app
```

---

## The Complete Workflow

Here's the day-to-day workflow summarized:

### Starting Work on a Project

```bash
cd my-project/
source venv/bin/activate    # Always activate first!
# ... do your work ...
deactivate                  # When done (optional, closing terminal also works)
```

### Adding a New Dependency

```bash
# 1. Make sure venv is activated
source venv/bin/activate

# 2. Install the package
pip install httpx

# 3. Update requirements.txt
pip freeze > requirements.txt

# 4. Commit the updated requirements.txt
git add requirements.txt
git commit -m "Add httpx dependency"
```

### Separating Dev Dependencies

Node.js has `dependencies` vs `devDependencies`. With plain pip, there's no built-in separation, but you can use multiple requirements files:

```bash
# requirements.txt - production dependencies
flask==3.0.0
requests==2.31.0

# requirements-dev.txt - development dependencies
-r requirements.txt    # Include production deps
pytest==8.0.0
black==24.1.0
mypy==1.8.0
```

```bash
# Install production only
pip install -r requirements.txt

# Install everything (production + dev)
pip install -r requirements-dev.txt
```

> **Better alternative:** Use Poetry (next chapter) which handles this natively, just like npm does with `devDependencies`.

---

## .gitignore Patterns

Just like you never commit `node_modules/`, never commit your `venv/` directory.

### Minimal .gitignore for Python

```gitignore
# Virtual environments (like node_modules/)
venv/
.venv/
env/

# Python cache files (like .next/ or dist/)
__pycache__/
*.py[cod]
*$py.class
*.pyo

# Distribution / packaging
*.egg-info/
dist/
build/

# Environment variables (same as Node.js)
.env
.env.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

### Comparison to Node.js .gitignore

```gitignore
# Node.js                    # Python
# node_modules/        ->    venv/ or .venv/
# dist/                ->    dist/ and build/
# .next/               ->    __pycache__/
# .env                 ->    .env (same!)
# coverage/            ->    .coverage, htmlcov/
```

---

## Common Pitfalls

### 1. Forgetting to Activate

```bash
# BAD: Installing without activation installs globally!
cd my-project/
pip install flask  # Goes to system Python!

# GOOD: Always activate first
cd my-project/
source venv/bin/activate
pip install flask  # Goes to venv
```

**How to tell if venv is active:** Look for `(venv)` in your prompt, or run `which python` (should point to your venv directory).

### 2. Committing the venv Directory

```bash
# BAD: Don't do this!
git add venv/  # Like committing node_modules/

# GOOD: Add to .gitignore
echo "venv/" >> .gitignore
```

### 3. Forgetting to Update requirements.txt

```bash
# After installing a new package, always freeze!
pip install some-new-package
pip freeze > requirements.txt  # Don't forget this step!
```

### 4. Wrong Python Version in venv

The venv uses whatever Python was used to create it:

```bash
# Creates a venv with Python 3.12
python3.12 -m venv venv

# Creates a venv with Python 3.11
python3.11 -m venv venv

# If using pyenv:
pyenv local 3.12.0
python -m venv venv  # Uses 3.12.0
```

### 5. Recreating a venv

If your venv gets corrupted or you want to start fresh:

```bash
# Delete and recreate (like: rm -rf node_modules && npm install)
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Practice Exercises

### Exercise 1: Create Your First Virtual Environment

```bash
# 1. Create a new project directory
mkdir python-venv-practice
cd python-venv-practice

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
# (use the appropriate command for your OS)

# 4. Verify: which python should point to your venv
which python   # macOS/Linux
where python   # Windows

# 5. Deactivate
deactivate

# 6. Run which python again -- notice the difference!
```

### Exercise 2: Install Packages and Freeze

```bash
# 1. Activate your venv from Exercise 1
source venv/bin/activate

# 2. Install these packages
pip install requests flask python-dotenv

# 3. List installed packages
pip list

# 4. Freeze to requirements.txt
pip freeze > requirements.txt

# 5. Open requirements.txt and look at the contents
# Notice how it includes sub-dependencies too

# 6. Check: how many packages did pip install in total?
#    (flask pulls in several dependencies, just like express does)
pip list | wc -l
```

### Exercise 3: Simulate Cloning a Project

```bash
# 1. Create a "fresh" environment (simulating a new developer)
deactivate
rm -rf venv

# 2. Recreate the venv
python -m venv venv
source venv/bin/activate

# 3. Install from requirements.txt (like npm install)
pip install -r requirements.txt

# 4. Verify everything is installed
pip list

# 5. Test that packages work
python -c "import flask; print(f'Flask version: {flask.__version__}')"
python -c "import requests; print(f'Requests version: {requests.__version__}')"
```

### Exercise 4: Create a .gitignore

1. Initialize a git repository in your practice directory
2. Create a `.gitignore` file with appropriate Python patterns
3. Run `git status` and verify that `venv/` is NOT listed
4. Verify that `requirements.txt` IS listed (it should be committed)

### Exercise 5: Dev Dependencies Pattern

```bash
# 1. Create requirements-dev.txt with this content:
# -r requirements.txt
# pytest==8.0.0
# black==24.1.0

# 2. Install dev dependencies
pip install -r requirements-dev.txt

# 3. Verify pytest is installed
pytest --version

# 4. Think about: how does this compare to devDependencies in package.json?
```

---

**Next:** [03 - Package Management](./03_package_management.md) -- Learn about Poetry (npm-equivalent), pyproject.toml, and more advanced dependency management.

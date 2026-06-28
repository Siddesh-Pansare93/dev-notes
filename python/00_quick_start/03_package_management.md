# 03 - Package Management (pip, Poetry, pyproject.toml)

> **For Node.js developers:** `pip` is like a bare-bones `npm`. `Poetry` is the full-featured equivalent -- with dependency resolution, lock files, and project scaffolding -- like `npm` or `yarn` done right.

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

Python has more package management options than Node.js, which can be confusing at first. Here's the lay of the land:

| Tool | Node.js Equivalent | Description |
|---|---|---|
| `pip` | Bare `npm install` | Basic package installer, no lock file by default |
| `pip` + `requirements.txt` | `npm` + `package.json` | Manual dependency tracking |
| `Poetry` | `npm` / `yarn` / `pnpm` | Full dependency management with lock files |
| `pipx` | `npx` | Run/install global CLI tools in isolation |
| `conda` | No equivalent | Package manager for scientific computing |
| `uv` | `npm` (Rust-fast) | Newer, extremely fast pip/Poetry alternative |

For this guide, we'll focus on **pip** (you'll encounter it everywhere) and **Poetry** (the modern best practice).

---

## pip Basics

You already saw pip in the previous chapter. Let's go deeper.

### Essential pip Commands

```bash
# Always activate your venv first!
source venv/bin/activate

# Install a package
pip install requests

# Install a specific version
pip install requests==2.31.0

# Install with version constraints
pip install "requests>=2.28.0,<3.0.0"   # Range
pip install "requests~=2.31.0"           # Compatible release (>=2.31.0, <2.32.0)
pip install "requests>=2.31"             # Minimum version

# Upgrade a package
pip install --upgrade requests
pip install -U requests  # Shorthand

# Uninstall a package
pip uninstall requests
pip uninstall -y requests  # Skip confirmation

# List all installed packages
pip list

# List outdated packages (like: npm outdated)
pip list --outdated

# Show info about a package (like: npm info requests)
pip show requests

# Search is no longer available via CLI, use https://pypi.org instead

# Install from requirements.txt
pip install -r requirements.txt

# Export installed packages
pip freeze > requirements.txt

# Install in editable mode (like: npm link)
pip install -e .
pip install -e ./my-local-package
```

### pip vs npm Command Comparison

| Task | npm | pip |
|---|---|---|
| Install package | `npm install pkg` | `pip install pkg` |
| Install exact version | `npm install pkg@1.2.3` | `pip install pkg==1.2.3` |
| Install from file | `npm install` (reads package.json) | `pip install -r requirements.txt` |
| Uninstall | `npm uninstall pkg` | `pip uninstall pkg` |
| List packages | `npm list` | `pip list` |
| Outdated packages | `npm outdated` | `pip list --outdated` |
| Package info | `npm info pkg` | `pip show pkg` |
| Upgrade package | `npm update pkg` | `pip install -U pkg` |
| Upgrade all | `npm update` | No built-in command (pip has no equivalent) |
| Global install | `npm install -g pkg` | `pip install pkg` (outside venv) |
| Link local package | `npm link` | `pip install -e .` |

### pip Limitations (Why Poetry Exists)

pip has some gaps that will annoy you coming from npm:

1. **No automatic `package.json` updates** -- You must manually run `pip freeze > requirements.txt`
2. **No lock file** -- `requirements.txt` with pinned versions is the closest thing
3. **No dev dependency separation** -- You need separate files (`requirements-dev.txt`)
4. **No dependency resolution before install** -- pip installs in order, which can cause conflicts
5. **No project scaffolding** -- No `npm init` equivalent

---

## Poetry: The npm of Python

[Poetry](https://python-poetry.org/) solves all of pip's limitations. It's the closest thing to a full npm experience in Python.

### Installing Poetry

```bash
# Official installer (recommended, works on all platforms)
curl -sSL https://install.python-poetry.org | python3 -

# Or with pip (less recommended but works)
pip install poetry

# Or with pipx (ideal -- isolated global install)
pipx install poetry

# Verify
poetry --version
```

On Windows (PowerShell):

```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# Verify
poetry --version
```

### What Poetry Gives You

| Feature | npm | Poetry | pip |
|---|---|---|---|
| Project manifest | `package.json` | `pyproject.toml` | `requirements.txt` |
| Lock file | `package-lock.json` | `poetry.lock` | (none) |
| Dependency resolution | Yes | Yes | Limited |
| Dev dependencies | `devDependencies` | `[tool.poetry.group.dev]` | Separate file |
| Scripts/commands | `npm run` / `scripts` | `poetry run` / `[tool.poetry.scripts]` | (none) |
| Project scaffolding | `npm init` | `poetry new` / `poetry init` | (none) |
| Publishing | `npm publish` | `poetry publish` | `twine` |
| Virtual env management | N/A (node_modules) | Automatic | Manual |

---

## pyproject.toml vs package.json

`pyproject.toml` is Python's answer to `package.json`. Here's a side-by-side comparison:

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
| `main` | N/A | Python uses `__init__.py` for packages |
| `scripts` | `[tool.poetry.scripts]` | Points to `module:function` instead of shell commands |
| `dependencies` | `[tool.poetry.dependencies]` | Same concept |
| `devDependencies` | `[tool.poetry.group.dev.dependencies]` | Same concept |
| `engines.node` | `python = "^3.11"` | In the dependencies section |
| `license` | `license` | Same concept |
| `author` | `authors` | List of strings in Poetry |
| `repository` | `repository` | Same concept |

### Custom Scripts Comparison

In Node.js, you define scripts as shell commands:

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

In Poetry, you can use `[tool.poetry.scripts]` for entry points or use `poetry run` to execute commands:

```toml
[tool.poetry.scripts]
start = "my_app.main:main"  # Points to a Python function
```

```bash
# Run scripts defined in pyproject.toml
poetry run start

# Run any command in the venv context
poetry run python src/main.py
poetry run pytest --coverage
poetry run ruff check src/

# Or activate the shell (like: source venv/bin/activate)
poetry shell
python src/main.py
pytest
```

> **Tip:** Many Python projects use a `Makefile` or a tool like `taskipy` for the equivalent of npm scripts. Poetry's scripts are limited to Python function entry points.

For general-purpose task running (closer to npm scripts), you can add `taskipy`:

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

This is your go-to reference table:

| Task | npm | Poetry |
|---|---|---|
| Create new project | `npm init` | `poetry new my-project` |
| Initialize in existing dir | `npm init` | `poetry init` |
| Install all dependencies | `npm install` | `poetry install` |
| Add a dependency | `npm install flask` | `poetry add flask` |
| Add a dev dependency | `npm install -D jest` | `poetry add --group dev pytest` |
| Remove a dependency | `npm uninstall flask` | `poetry remove flask` |
| Update a dependency | `npm update flask` | `poetry update flask` |
| Update all | `npm update` | `poetry update` |
| Show outdated | `npm outdated` | `poetry show --outdated` |
| Run a script | `npm run start` | `poetry run start` |
| Run a command in env | `npx tsc` | `poetry run mypy .` |
| Open a shell | N/A | `poetry shell` |
| Show dependency tree | `npm list --all` | `poetry show --tree` |
| Show package info | `npm info flask` | `poetry show flask` |
| Build package | `npm pack` | `poetry build` |
| Publish package | `npm publish` | `poetry publish` |
| Lock dependencies | auto (package-lock.json) | `poetry lock` |
| Check lock file | `npm ci` | `poetry install --sync` |

---

## Poetry Workflow in Practice

### Creating a New Project

```bash
# Scaffold a new project (like: npx create-react-app my-app)
poetry new my-web-app

# This creates:
# my-web-app/
#   pyproject.toml         # Your package.json equivalent
#   README.md
#   my_web_app/
#     __init__.py           # Package init
#   tests/
#     __init__.py
```

Or initialize in an existing directory:

```bash
cd my-existing-project/
poetry init  # Interactive setup, like npm init
```

### Adding Dependencies

```bash
# Add production dependency (like: npm install flask)
poetry add flask

# Add dev dependency (like: npm install -D pytest)
poetry add --group dev pytest

# Add with version constraint
poetry add "requests>=2.28,<3.0"
poetry add flask@^3.0.0
poetry add flask@latest

# Add from git
poetry add git+https://github.com/user/repo.git
```

When you run `poetry add`, it:
1. Resolves dependencies (like npm does)
2. Updates `pyproject.toml` (like updating `package.json`)
3. Updates `poetry.lock` (like updating `package-lock.json`)
4. Installs the package

This is exactly like `npm install <package>`.

### Installing Dependencies (Cloning a Project)

```bash
# Clone and install (like: git clone && npm install)
git clone https://github.com/user/python-app.git
cd python-app
poetry install  # Reads pyproject.toml + poetry.lock, creates venv

# Install production only (like: npm install --production)
poetry install --only main

# Sync environment to lock file exactly (like: npm ci)
poetry install --sync
```

### Virtual Environment Handling

Poetry manages virtual environments automatically:

```bash
# Poetry creates and manages the venv for you!
poetry install  # Creates venv if it doesn't exist

# Run commands in the venv
poetry run python my_script.py
poetry run pytest

# Or activate the venv shell
poetry shell
python my_script.py  # Now python points to the venv Python
exit                  # Leave the poetry shell

# See where the venv is located
poetry env info

# Configure Poetry to create venv in project directory (like node_modules)
poetry config virtualenvs.in-project true
# Now the venv will be at .venv/ in your project (recommended!)
```

> **Recommended setting:** Run `poetry config virtualenvs.in-project true` globally. This makes Poetry create `.venv/` in your project directory, which is easier to find and works better with IDEs.

---

## pipx: Global Tools (Like npx)

`pipx` installs Python CLI tools in isolated environments globally. It's like `npx` or `npm install -g` but safer.

### Installing pipx

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

### Using pipx

```bash
# npx equivalent:                    pipx equivalent:
# npx create-react-app my-app   ->  pipx run cookiecutter gh:user/template
# npm install -g typescript      ->  pipx install poetry
# npm install -g eslint          ->  pipx install ruff

# Install a tool globally (isolated)
pipx install poetry
pipx install black
pipx install ruff
pipx install httpie

# Run a tool without installing (like npx)
pipx run black my_file.py
pipx run cowsay "Hello from Python!"

# List globally installed tools
pipx list

# Upgrade a tool
pipx upgrade poetry

# Uninstall a tool
pipx uninstall poetry
```

### npx vs pipx Comparison

| Task | npx | pipx |
|---|---|---|
| Run without installing | `npx cowsay hello` | `pipx run cowsay hello` |
| Install globally | `npm install -g typescript` | `pipx install poetry` |
| List global tools | `npm list -g` | `pipx list` |
| Upgrade global tool | `npm update -g typescript` | `pipx upgrade poetry` |
| Uninstall global tool | `npm uninstall -g typescript` | `pipx uninstall poetry` |

---

## Which Tool Should You Use?

### For Learning / Small Scripts

Use **pip + venv + requirements.txt**. It's simple and you'll encounter it everywhere.

```bash
python -m venv venv
source venv/bin/activate
pip install requests
pip freeze > requirements.txt
```

### For Real Projects

Use **Poetry**. It gives you the npm-like experience you're used to.

```bash
poetry new my-project
cd my-project
poetry add flask requests
poetry add --group dev pytest ruff
poetry run python main.py
```

### For Global CLI Tools

Use **pipx**. Never install tools globally with pip.

```bash
pipx install poetry
pipx install black
pipx install ruff
```

### Quick Decision Chart

```
Need to install a CLI tool globally?  -> pipx
Starting a new project?              -> poetry new
Working on an existing project
  with pyproject.toml?               -> poetry install
  with requirements.txt?             -> pip install -r requirements.txt
Quick script / learning?             -> pip + venv
```

---

## Practice Exercises

### Exercise 1: pip Deep Dive

```bash
# 1. Create a new project with venv
mkdir pip-practice && cd pip-practice
python -m venv venv
source venv/bin/activate

# 2. Install these packages:
#    - requests
#    - flask
#    - python-dotenv

# 3. Use pip show to inspect the flask package
#    - What version was installed?
#    - What are its dependencies?

# 4. Use pip list --outdated to check for updates

# 5. Freeze requirements and examine the file
pip freeze > requirements.txt

# 6. How many total packages are installed? (pip list | wc -l)
#    Why are there more than the 3 you installed?
```

### Exercise 2: Poetry Project Setup

```bash
# 1. Install Poetry if you haven't already
pipx install poetry
# or: curl -sSL https://install.python-poetry.org | python3 -

# 2. Configure Poetry to create venvs in project directory
poetry config virtualenvs.in-project true

# 3. Create a new project
poetry new my-poetry-app
cd my-poetry-app

# 4. Add dependencies
poetry add requests flask

# 5. Add dev dependencies
poetry add --group dev pytest ruff

# 6. Examine the generated pyproject.toml
#    Compare it mentally to a package.json

# 7. Look at the poetry.lock file
#    How does it compare to package-lock.json?

# 8. Run a Python command through Poetry
poetry run python -c "import flask; print(flask.__version__)"
```

### Exercise 3: Simulate the Full Workflow

```bash
# Pretend you're another developer joining the project

# 1. Move out of the project and delete the .venv
cd ..
rm -rf my-poetry-app/.venv

# 2. Go back in and install (like a fresh clone)
cd my-poetry-app
poetry install

# 3. Verify everything works
poetry run python -c "import requests; print('requests:', requests.__version__)"
poetry run pytest  # Should run (even with no tests yet)

# 4. Compare: how does this feel vs npm install + npm test?
```

### Exercise 4: Explore pyproject.toml

Create this `pyproject.toml` by hand (without Poetry) and understand each section:

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

Then:
1. Create the corresponding `exercise_app/main.py` with a `greet()` function that prints "Hello from Poetry!"
2. Create `exercise_app/__init__.py` (empty file)
3. Run `poetry install`
4. Run `poetry run greet`
5. Compare: this is like setting `"scripts": { "greet": "node src/greet.js" }` in package.json

### Exercise 5: pipx Exploration

```bash
# 1. Install pipx if you haven't
# 2. Install a fun CLI tool
pipx install cowsay

# 3. Run it
cowsay "I'm learning Python package management!"

# 4. Try running without installing (npx-style)
pipx run pyfiglet "Hello"

# 5. List installed tools
pipx list

# 6. Clean up
pipx uninstall cowsay
```

---

**Next:** [04 - Node.js to Python Cheatsheet](./04_nodejs_to_python_cheatsheet.md) -- A comprehensive side-by-side syntax reference you'll keep coming back to.

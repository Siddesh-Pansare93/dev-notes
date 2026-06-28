# Python Quick Start

Everything you need to go from zero to a working Python environment in one sitting. This section is written specifically for Node.js and TypeScript developers — every concept is mapped to something you already know so you can get productive fast.

## Table of Contents

1. [Python Installation & Version Management](./01_python_installation.md) — Install Python and manage versions with `pyenv` (Python's `nvm`)
2. [Virtual Environments](./02_virtual_environments.md) — Isolate project dependencies with `venv` (Python's answer to `node_modules`)
3. [Package Management](./03_package_management.md) — Install, manage, and lock packages with `pip` and `pip-tools` (like `npm` + `package-lock.json`)
4. [Node.js/TypeScript to Python Cheatsheet](./04_nodejs_to_python_cheatsheet.md) — Side-by-side syntax reference covering variables, functions, classes, async, modules, and more
5. [Your First Python Script](./05_first_python_script.md) — Run a real script, use the REPL, handle CLI args, and understand `if __name__ == "__main__"`

---

## Learning Path

### Beginner — Get set up and write your first code
1. [Python Installation](./01_python_installation.md) — install Python, set up `pyenv`
2. [Virtual Environments](./02_virtual_environments.md) — create and activate a `venv`
3. [Your First Python Script](./05_first_python_script.md) — run `hello.py`, explore the REPL

### Intermediate — Understand the ecosystem and syntax differences
4. [Package Management](./03_package_management.md) — `pip install`, `requirements.txt`, freezing dependencies
5. [Node.js to Python Cheatsheet](./04_nodejs_to_python_cheatsheet.md) — systematically work through each syntax section

### Advanced — Solidify the mental model
- Revisit the cheatsheet sections on async/await, type annotations, and common gotchas after you've written a few real scripts
- Use the cheatsheet as a daily reference while working through the core Python topics in the sections that follow

---

## What You'll Learn

- How to install Python on Windows, macOS, and Linux using direct installers or package managers
- How to manage multiple Python versions per-project using `pyenv` (global, local, and shell scopes)
- How virtual environments work and why every Python project needs one
- How to install packages with `pip`, generate `requirements.txt`, and pin dependency versions
- How Python's module system differs from Node.js CommonJS and ESM imports
- Side-by-side translations for variables, data types, strings, lists, dicts, sets, tuples, functions, lambdas, destructuring, loops, error handling, and classes
- How async/await works in Python compared to JavaScript
- The `if __name__ == "__main__"` pattern and when to use it
- How to accept command-line arguments in a Python script

---

## Prerequisites

- Comfortable with Node.js and/or TypeScript — this guide leans heavily on that background to explain Python concepts
- A terminal (PowerShell, bash, or zsh)
- No prior Python experience needed

---

## How to Use This Guide

1. **Follow the numbered order on your first pass.** The files are sequenced so each one builds on the previous — environment setup before writing code, writing code before referencing the cheatsheet at speed.
2. **Run every code example yourself.** Open a terminal alongside each file and type the commands out; Python muscle memory builds faster than you'd expect.
3. **Keep the cheatsheet open in a second tab.** Once you start writing real Python, `04_nodejs_to_python_cheatsheet.md` is the file you'll return to daily. Bookmark it.
4. **Use the practice exercises.** Each file ends with exercises that take 5-15 minutes. Do them — they expose the gotchas that reading alone won't.
5. **Don't get stuck on perfecting your environment.** A plain `python` install without `pyenv` is fine to start. Layer in the tooling as you need it.

---

You already know how to think like a programmer — this section just hands you the Python vocabulary. Let's get started.

# Python Basic Fundamentals

The essential building blocks of Python — written for developers who already know JavaScript or TypeScript and want to get productive fast without re-learning programming from scratch.

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

**Beginner — get the syntax down first**
Start here if Python is brand new to you. These chapters map directly to what you already know from JavaScript.

1. [Variables and Data Types](./01_variables_and_data_types.md) — no `let`/`const`, no semicolons; how Python names and types work
2. [Strings](./02_strings.md) — f-strings, multiline strings, and the methods you'll use every day
3. [Control Flow](./05_control_flow.md) — `if`/`elif`/`else`, `for`/`while`, and how indentation replaces braces
4. [Functions](./06_functions.md) — `def`, docstrings, `*args`, `**kwargs`, and keyword arguments

**Intermediate — Python's core data structures**
Once you're comfortable with syntax, tackle these. They unlock idiomatic Python.

5. [Lists and Tuples](./03_lists_and_tuples.md) — Python's arrays, unpacking, slicing, and immutable sequences
6. [Dictionaries and Sets](./04_dictionaries_and_sets.md) — the workhorses of Python data manipulation
7. [Comprehensions](./10_comprehensions.md) — list, dict, and set comprehensions; replace `.map()` and `.filter()` chains

**Advanced — writing real programs**
Round out your fundamentals so you can write code that reads files, handles failures, and scales across modules.

8. [Modules and Imports](./07_modules_and_imports.md) — `import`, packages, `__init__.py`, and the standard library
9. [Error Handling](./08_error_handling.md) — `try`/`except`/`finally`, custom exceptions, and when to raise
10. [File Operations](./09_file_operations.md) — reading, writing, context managers (`with`), and `pathlib`

## What You'll Learn

- How Python's dynamic typing differs from TypeScript's static types — and what that means in practice
- Python's `snake_case` conventions and PEP 8 style rules
- Working with all four core collection types: lists, tuples, dicts, and sets
- Writing expressive, readable functions with default arguments, keyword-only params, and `*args`/`**kwargs`
- Using f-strings for string formatting (the Python equivalent of template literals)
- Replacing verbose `.map()`/`.filter()` chains with compact comprehensions
- Structuring code across files with Python's module and import system
- Handling errors cleanly without letting exceptions crash your program silently
- Reading and writing files safely using context managers

## Prerequisites

- Comfortable writing JavaScript or TypeScript (functions, arrays, objects, loops)
- Basic understanding of what a terminal/command line is
- Python 3.10+ installed on your machine (`python --version` to check)

No prior Python experience needed — every chapter explicitly compares Python syntax to its JavaScript/TypeScript equivalent.

## How to Use This Guide

1. **Follow the learning path order**, not the chapter numbers, if you're brand new — the Beginner track builds each concept on the last.
2. **Run every code snippet yourself.** Open a Python REPL (`python` in your terminal) and type along — muscle memory matters.
3. **Read the JS/TS comparisons even if you think you know the concept.** Python's behavior often has subtle differences that bite experienced JS developers.
4. **Don't skip Comprehensions.** They look strange at first but they are used constantly in real Python code — push through the initial discomfort.
5. **Use the chapter as a reference later.** Each file is dense enough to serve as a quick-lookup when you forget a method name or slice syntax mid-project.

Python's simplicity is not a limitation — it's the feature. Enjoy the ride.

# Flutter & Dart

A hands-on guide to building cross-platform mobile, web, and desktop apps with Flutter and Dart — covering the language from scratch, core Flutter patterns, state management, networking, local storage, and production deployment.

## Table of Contents

### Part 1: Dart Language Foundations
1. [Dart Basics — Variables, Types, and Functions](./01-dart-basics.md)
2. [Dart OOP — Classes, Mixins, and Interfaces](./02-dart-oop.md)
3. [Dart Async — Future, async/await, and Streams](./03-dart-async.md)

### Part 2: Flutter Fundamentals
4. [Flutter Setup and Your First App](./04-flutter-setup.md)
5. [Widgets and Layout](./05-widgets-and-layout.md)
6. [Styling, Themes, and Material Design](./06-styling-and-themes.md)

### Part 3: State Management
7. [State Management Basics — setState and InheritedWidget](./07-state-management-basics.md)
8. [Provider — Scalable State for Mid-Sized Apps](./08-provider.md)
9. [Riverpod — The Modern Provider](./09-riverpod.md)
10. [BLoC Pattern — Cubit and Full BLoC](./10-bloc-pattern.md)

### Part 4: Navigation and Routing
11. [Navigation — Navigator 2.0 and go_router](./11-navigation.md)

### Part 5: Data and Persistence
12. [Networking — HTTP, Dio, and REST APIs](./12-networking.md)
13. [Local Storage — SharedPreferences, sqflite, and Hive](./13-local-storage.md)
14. [Firebase Integration — Firestore, Auth, and Cloud Functions](./14-firebase.md)

### Part 6: Quality and Shipping
15. [Testing Flutter Apps — Unit, Widget, and Integration](./15-testing.md)
16. [Deployment — Android, iOS, and the Web](./16-deployment.md)

## Learning Path

### Beginner Track
Start here if you are new to Flutter or Dart:
1. Dart Basics (01) — learn the language before the framework
2. Dart OOP (02) — classes and type system
3. Flutter Setup and Your First App (04)
4. Widgets and Layout (05)
5. Styling and Themes (06)
6. State Management Basics (07)

### Intermediate Track
Build on the fundamentals and tackle real-world patterns:
1. Dart Async (03) — essential for any API work
2. Provider (08) — scalable state without boilerplate
3. Navigation (11) — multi-screen apps and deep linking
4. Networking (12) — connect to REST APIs
5. Local Storage (13) — offline-first data handling
6. Testing (15) — write widget tests with confidence

### Advanced Track
Production-ready skills and architectural patterns:
1. Riverpod (09) — reactive, testable state management
2. BLoC Pattern (10) — strict separation of business logic
3. Firebase Integration (14) — real-time database and auth
4. Deployment (16) — release builds, signing, and app store submission

## What You'll Learn

- The Dart language: type system, null safety, generics, and async programming with `Future` and `Stream`
- Flutter's widget tree model: the difference between `StatelessWidget` and `StatefulWidget`, and when to use each
- Layout fundamentals: `Column`, `Row`, `Stack`, `Expanded`, `Flexible`, and responsive design
- State management approaches from `setState` to Provider, Riverpod, and BLoC — and how to choose between them
- Navigating between screens using named routes and `go_router` with deep linking support
- Fetching data from REST APIs with the `http` package and Dio, handling errors and loading states
- Persisting data locally with `SharedPreferences`, `sqflite`, and Hive
- Integrating Firebase for real-time data, user authentication, and cloud storage
- Writing unit tests, widget tests, and integration tests using the Flutter testing toolkit
- Building and releasing apps to the Google Play Store, Apple App Store, and as a web app

## Prerequisites

- Basic programming experience in any language (JavaScript, Python, Java, or similar)
- Familiarity with object-oriented concepts (classes, methods, inheritance) is helpful but not required — Dart OOP is covered from scratch
- A machine with Flutter SDK installed, or willingness to follow the setup guide in chapter 04
- No prior mobile development experience needed

## How to Use This Guide

1. **Start with Dart, not Flutter**: Chapters 01–03 are pure Dart. Skipping them is the most common beginner mistake — widgets and state make much more sense once you understand the language.
2. **Run every code example**: Flutter is a visual framework. Copy snippets into DartPad (dartpad.dev) for Dart chapters, and into a real Flutter project for widget chapters — seeing it render in a simulator accelerates learning dramatically.
3. **Pick one state management solution and go deep**: Chapters 07–10 cover four approaches. Read 07 first, then choose Provider, Riverpod, or BLoC based on your project size and stick with it. Do not try to learn all four simultaneously.
4. **Build a real project alongside the guide**: A simple app — a notes manager, a movie search app, a habit tracker — is the best way to connect each concept to something meaningful.
5. **Use the learning path, not just the table of contents**: Chapters build on each other. If a concept feels unclear, check whether an earlier chapter covers a prerequisite you might have skipped.

Good luck — Flutter's "hot reload" alone makes mobile development more enjoyable than you might expect, and Dart is one of the quickest languages to get productive in.

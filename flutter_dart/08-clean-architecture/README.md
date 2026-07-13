# Clean Architecture — Layers, Entities, Use Cases, Repositories, Presentation

Socho ek second ke liye — jab tu Zomato app khol raha hai, tab kya ho raha hai uss under? Ek layer API se data la rahi hai, doosri layer processing kar rahi hai, teesri layer UI dikhla rahi hai. Ab jaisa code likha hota hai, sab ek jaise kuch file mein likhne se app scalable nahi rahta. Yehi problem solve karta hai **Clean Architecture**.

Agar tu Node.js dev hai, toh jaisa tere Express server mein separation of concerns hota hai (routes → controllers → services → database), **Flutter mein bhi same philosophy apply hota hai**. Layering, dependency injection, testability — sab kuch match karta hai. Bs difference ye hai ki Flutter mein UI reactive hota hai, aur state management BLoC ya Provider ke through hota hai.

## Kyun Architecture Matter Karta Hai?

1. **Scalability** — App badha, codebase badhe, par files ka organization remain clean rahe
2. **Testability** — Each layer independently test ho sake (unit tests likhi ja sakein)
3. **Maintainability** — Naya dev project join kare, toh folder structure dekh le toh samajh jaye kya kya hai
4. **Reusability** — Business logic multiple UI layers se reuse ho sake
5. **Team Collaboration** — Backend dev, mobile dev, UI dev — sab ek dusre ke code mein interfere na karein

Samajh le example se — Zomato backend architecture mein `UserService`, `OrderRepository`, `PaymentGateway` separate modules hote hain. Same philosophy apply karo Flutter app mein, toh production-grade code likha jata hai.

## Clean Architecture Layers

Clean Architecture typically **3-4 layers** mein organize hota hai:

```
┌─────────────────────────────────────────────────┐
│         PRESENTATION LAYER (UI)                 │
│   Pages, Widgets, BLoCs, State Management       │
├─────────────────────────────────────────────────┤
│       DOMAIN LAYER (Business Logic)             │
│   Entities, Use Cases, Repository Interfaces    │
├─────────────────────────────────────────────────┤
│         DATA LAYER (Implementation)             │
│   Remote/Local DataSources, Repository Impl     │
├─────────────────────────────────────────────────┤
│         EXTERNAL LAYER (APIs, DB)               │
│   HTTP Client, SQLite, SharedPreferences        │
└─────────────────────────────────────────────────┘
```

**Dependency Rule**: Inner layer dependencies outer layers ko access nahi kar sakte. Outer layers inner layers ko access kar sakte hain. Matlab presentation layer ko domain layer pata ho sakta hai, par domain layer ko presentation layer nahi pata chalna chahiye.

Ab jaanty hain har ek layer ko detail mein.

## 1. Domain Layer — Purest Business Logic

Domain layer mein **data models, repository interfaces, aur use cases** hote hain. Yeh layer completely **framework-independent** hota hai — Dart ke pure code, Flutter dependency nahi.

### 1.1 Entities — Data Structures

Entity = business object jo actual data represent karte hain. Ek `User` entity ya `Expense` entity.

```dart
// lib/domain/entities/user.dart
class User {
  final String id;
  final String name;
  final String email;
  final DateTime createdAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.createdAt,
  });

  // Equality operator — testing aur comparison ke liye zaroori
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is User &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          email == other.email &&
          createdAt == other.createdAt;

  @override
  int get hashCode =>
      id.hashCode ^ name.hashCode ^ email.hashCode ^ createdAt.hashCode;
}
```

```dart
// lib/domain/entities/expense.dart
enum ExpenseCategory { food, transport, entertainment, other }

class Expense {
  final String id;
  final String userId;
  final String title;
  final double amount;
  final ExpenseCategory category;
  final DateTime date;

  Expense({
    required this.id,
    required this.userId,
    required this.title,
    required this.amount,
    required this.category,
    required this.date,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Expense &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          userId == other.userId &&
          title == other.title &&
          amount == other.amount &&
          category == other.category &&
          date == other.date;

  @override
  int get hashCode =>
      id.hashCode ^
      userId.hashCode ^
      title.hashCode ^
      amount.hashCode ^
      category.hashCode ^
      date.hashCode;
}
```

**Key Point**: Entity mein **immutable data** hota hai, business logic implement karte hain, databases ya APIs ke bare mein kuch nahi pata.

### 1.2 Repository Interfaces — The Contract

Repository interface = abstract contract jo define karta hai "data ke liye ye methods hone chahiye". Implementation data layer mein hota hai, par domain layer mein sirf interface hota hai.

```dart
// lib/domain/repositories/user_repository.dart
abstract class UserRepository {
  // Data layer ye implement karega
  Future<User> getUserById(String id);
  Future<List<User>> getAllUsers();
  Future<void> createUser(User user);
  Future<void> updateUser(User user);
  Future<void> deleteUser(String id);
}
```

```dart
// lib/domain/repositories/expense_repository.dart
abstract class ExpenseRepository {
  Future<Expense> getExpenseById(String id);
  Future<List<Expense>> getUserExpenses(String userId);
  Future<List<Expense>> getExpensesByCategory(String userId, ExpenseCategory category);
  Future<void> addExpense(Expense expense);
  Future<void> deleteExpense(String id);
  Future<double> getTotalExpenses(String userId);
}
```

**Why abstract class?** Kyun-ki repository ka implementation data layer mein hoga (ek Firebase se ayega, ek SQLite se), par domain layer ko ye distinction nahi maloom chahiye. Bas contract pata chalti hai.

### 1.3 Use Cases — Business Logic

Use case = single business operation jo user perform karta hai. Jaise "Add New Expense" ya "Get All Expenses For User". Use cases repositories ko inject karte hain aur operations perform karte hain.

```dart
// lib/domain/usecases/add_expense_usecase.dart
class AddExpenseUseCase {
  final ExpenseRepository repository;

  AddExpenseUseCase(this.repository);

  // Execute method — use case ko call karte waqt call hota hai
  Future<void> call(Expense expense) async {
    // Validation logic
    if (expense.amount <= 0) {
      throw Exception('Amount must be positive');
    }
    
    if (expense.title.isEmpty) {
      throw Exception('Title cannot be empty');
    }

    // Repository call
    await repository.addExpense(expense);
  }
}
```

```dart
// lib/domain/usecases/get_user_expenses_usecase.dart
class GetUserExpensesUseCase {
  final ExpenseRepository repository;

  GetUserExpensesUseCase(this.repository);

  Future<List<Expense>> call(String userId) async {
    if (userId.isEmpty) {
      throw Exception('User ID cannot be empty');
    }
    return await repository.getUserExpenses(userId);
  }
}
```

```dart
// lib/domain/usecases/get_expense_summary_usecase.dart
class GetExpenseSummaryUseCase {
  final ExpenseRepository repository;

  GetExpenseSummaryUseCase(this.repository);

  Future<Map<ExpenseCategory, double>> call(String userId) async {
    final expenses = await repository.getUserExpenses(userId);
    
    final summary = <ExpenseCategory, double>{};
    for (final expense in expenses) {
      summary[expense.category] =
          (summary[expense.category] ?? 0) + expense.amount;
    }
    
    return summary;
  }
}
```

**Pattern**: Ek use case = ek responsibility = production use case ko easily test kar sakte ho.

## 2. Data Layer — API/Database Integration

Data layer mein **datasources (API, local DB)** aur **repository implementations** hote hain. Domain layer ke repository interface ko yahan implement karte hain.

### 2.1 DataSources — Raw Data Fetching

```dart
// lib/data/datasources/remote_user_datasource.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

abstract class RemoteUserDataSource {
  Future<Map<String, dynamic>> getUserById(String id);
  Future<List<Map<String, dynamic>>> getAllUsers();
  Future<void> createUser(Map<String, dynamic> userData);
}

class RemoteUserDataSourceImpl implements RemoteUserDataSource {
  final http.Client httpClient;
  final String baseUrl;

  RemoteUserDataSourceImpl({
    required this.httpClient,
    this.baseUrl = 'https://api.example.com',
  });

  @override
  Future<Map<String, dynamic>> getUserById(String id) async {
    final url = Uri.parse('$baseUrl/users/$id');
    
    try {
      final response = await httpClient.get(url);
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to fetch user: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getAllUsers() async {
    final url = Uri.parse('$baseUrl/users');
    
    final response = await httpClient.get(url);
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Failed to fetch users');
    }
  }

  @override
  Future<void> createUser(Map<String, dynamic> userData) async {
    final url = Uri.parse('$baseUrl/users');
    
    final response = await httpClient.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(userData),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Failed to create user');
    }
  }
}
```

```dart
// lib/data/datasources/local_expense_datasource.dart
import 'package:sqflite/sqflite.dart';

abstract class LocalExpenseDataSource {
  Future<Map<String, dynamic>> getExpenseById(String id);
  Future<List<Map<String, dynamic>>> getUserExpenses(String userId);
  Future<void> insertExpense(Map<String, dynamic> expenseData);
  Future<void> deleteExpense(String id);
}

class LocalExpenseDataSourceImpl implements LocalExpenseDataSource {
  final Database database;

  LocalExpenseDataSourceImpl(this.database);

  @override
  Future<Map<String, dynamic>> getExpenseById(String id) async {
    final result = await database.query(
      'expenses',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (result.isEmpty) {
      throw Exception('Expense not found');
    }
    
    return result.first;
  }

  @override
  Future<List<Map<String, dynamic>>> getUserExpenses(String userId) async {
    return await database.query(
      'expenses',
      where: 'userId = ?',
      whereArgs: [userId],
      orderBy: 'date DESC',
    );
  }

  @override
  Future<void> insertExpense(Map<String, dynamic> expenseData) async {
    await database.insert(
      'expenses',
      expenseData,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  @override
  Future<void> deleteExpense(String id) async {
    await database.delete(
      'expenses',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
```

### 2.2 Models — Data Serialization

Data layer mein **Models** define hote hain jo entities ko JSON/Database format mein convert karte hain.

```dart
// lib/data/models/user_model.dart
import 'package:knowlege_base/domain/entities/user.dart';

class UserModel {
  final String id;
  final String name;
  final String email;
  final DateTime createdAt;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.createdAt,
  });

  // JSON se model banao
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  // Model se JSON banao
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  // Model se Entity banao (domain layer ke liye)
  User toEntity() {
    return User(
      id: id,
      name: name,
      email: email,
      createdAt: createdAt,
    );
  }

  // Entity se Model banao
  factory UserModel.fromEntity(User entity) {
    return UserModel(
      id: entity.id,
      name: entity.name,
      email: entity.email,
      createdAt: entity.createdAt,
    );
  }
}
```

```dart
// lib/data/models/expense_model.dart
import 'package:knowlege_base/domain/entities/expense.dart';

class ExpenseModel {
  final String id;
  final String userId;
  final String title;
  final double amount;
  final String category; // String kyun-ki JSON mein string save hota hai
  final DateTime date;

  ExpenseModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.amount,
    required this.category,
    required this.date,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      amount: (json['amount'] as num).toDouble(),
      category: json['category'] as String,
      date: DateTime.parse(json['date'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'amount': amount,
      'category': category,
      'date': date.toIso8601String(),
    };
  }

  Expense toEntity() {
    return Expense(
      id: id,
      userId: userId,
      title: title,
      amount: amount,
      category: ExpenseCategory.values.firstWhere(
        (e) => e.toString().split('.').last == category,
        orElse: () => ExpenseCategory.other,
      ),
      date: date,
    );
  }

  factory ExpenseModel.fromEntity(Expense entity) {
    return ExpenseModel(
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      amount: entity.amount,
      category: entity.category.toString().split('.').last,
      date: entity.date,
    );
  }
}
```

### 2.3 Repository Implementation

Ab domain layer ke interface ko implement karte hain. Ye repository remote + local datasources ko combine karta hai.

```dart
// lib/data/repositories/expense_repository_impl.dart
import 'package:knowlege_base/domain/entities/expense.dart';
import 'package:knowlege_base/domain/repositories/expense_repository.dart';
import 'package:knowlege_base/data/datasources/remote_expense_datasource.dart';
import 'package:knowlege_base/data/models/expense_model.dart';

class ExpenseRepositoryImpl implements ExpenseRepository {
  final RemoteExpenseDataSource remoteDataSource;
  final LocalExpenseDataSource localDataSource;

  ExpenseRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Expense> getExpenseById(String id) async {
    try {
      // Pehle remote se fetch karo
      final data = await remoteDataSource.getExpenseById(id);
      final model = ExpenseModel.fromJson(data);
      
      // Local DB mein cache karo
      await localDataSource.insertExpense(model.toJson());
      
      return model.toEntity();
    } catch (e) {
      // Agar remote fail ho, local se lo
      try {
        final data = await localDataSource.getExpenseById(id);
        return ExpenseModel.fromJson(data).toEntity();
      } catch (_) {
        rethrow;
      }
    }
  }

  @override
  Future<List<Expense>> getUserExpenses(String userId) async {
    try {
      final dataList = await remoteDataSource.getUserExpenses(userId);
      final models = dataList
          .map((data) => ExpenseModel.fromJson(data))
          .toList();
      
      // Sync with local DB
      for (final model in models) {
        await localDataSource.insertExpense(model.toJson());
      }
      
      return models.map((m) => m.toEntity()).toList();
    } catch (e) {
      // Fallback to local cache
      try {
        final dataList = await localDataSource.getUserExpenses(userId);
        return dataList
            .map((data) => ExpenseModel.fromJson(data).toEntity())
            .toList();
      } catch (_) {
        rethrow;
      }
    }
  }

  @override
  Future<void> addExpense(Expense expense) async {
    final model = ExpenseModel.fromEntity(expense);
    
    try {
      // Remote mein save karo
      await remoteDataSource.addExpense(model.toJson());
      // Local mein bhi save karo (offline-first sync)
      await localDataSource.insertExpense(model.toJson());
    } catch (e) {
      // Agar remote fail ho toh local mein save karo
      // (Background sync baad mein implement kar sakte ho)
      await localDataSource.insertExpense(model.toJson());
      rethrow;
    }
  }

  @override
  Future<void> deleteExpense(String id) async {
    await remoteDataSource.deleteExpense(id);
    await localDataSource.deleteExpense(id);
  }

  @override
  Future<List<Expense>> getExpensesByCategory(
    String userId,
    ExpenseCategory category,
  ) async {
    final expenses = await getUserExpenses(userId);
    return expenses.where((e) => e.category == category).toList();
  }

  @override
  Future<double> getTotalExpenses(String userId) async {
    final expenses = await getUserExpenses(userId);
    return expenses.fold(0.0, (sum, e) => sum + e.amount);
  }
}
```

## 3. Presentation Layer — UI + State Management

Presentation layer mein **BLoCs (Business Logic Components), Pages, aur Widgets** hote hain. Yeh domain layer ko use karta hai.

### 3.1 Events and States

BLoC pattern mein **Events** (kya user karna chah raha hai) aur **States** (current UI state) hote hain.

```dart
// lib/presentation/bloc/expense_event.dart
abstract class ExpenseEvent {}

class FetchUserExpensesEvent extends ExpenseEvent {
  final String userId;
  FetchUserExpensesEvent(this.userId);
}

class AddExpenseEvent extends ExpenseEvent {
  final Expense expense;
  AddExpenseEvent(this.expense);
}

class DeleteExpenseEvent extends ExpenseEvent {
  final String expenseId;
  DeleteExpenseEvent(this.expenseId);
}

class FilterExpensesByCategoryEvent extends ExpenseEvent {
  final String userId;
  final ExpenseCategory category;
  FilterExpensesByCategoryEvent(this.userId, this.category);
}
```

```dart
// lib/presentation/bloc/expense_state.dart
abstract class ExpenseState {}

class ExpenseInitialState extends ExpenseState {}

class ExpenseLoadingState extends ExpenseState {}

class ExpenseLoadedState extends ExpenseState {
  final List<Expense> expenses;
  final double totalAmount;
  ExpenseLoadedState({required this.expenses, required this.totalAmount});
}

class ExpenseErrorState extends ExpenseState {
  final String message;
  ExpenseErrorState(this.message);
}
```

### 3.2 BLoC Implementation

```dart
// lib/presentation/bloc/expense_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:knowlege_base/domain/entities/expense.dart';
import 'package:knowlege_base/domain/usecases/get_user_expenses_usecase.dart';
import 'package:knowlege_base/domain/usecases/add_expense_usecase.dart';
import 'package:knowlege_base/domain/usecases/delete_expense_usecase.dart';

class ExpenseBloc extends Bloc<ExpenseEvent, ExpenseState> {
  final GetUserExpensesUseCase getUserExpensesUseCase;
  final AddExpenseUseCase addExpenseUseCase;
  final DeleteExpenseUseCase deleteExpenseUseCase;

  ExpenseBloc({
    required this.getUserExpensesUseCase,
    required this.addExpenseUseCase,
    required this.deleteExpenseUseCase,
  }) : super(ExpenseInitialState()) {
    // Events ko handlers se map karo
    on<FetchUserExpensesEvent>(_onFetchUserExpenses);
    on<AddExpenseEvent>(_onAddExpense);
    on<DeleteExpenseEvent>(_onDeleteExpense);
  }

  Future<void> _onFetchUserExpenses(
    FetchUserExpensesEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    emit(ExpenseLoadingState());
    
    try {
      final expenses = await getUserExpensesUseCase(event.userId);
      final total = expenses.fold(0.0, (sum, e) => sum + e.amount);
      
      emit(ExpenseLoadedState(expenses: expenses, totalAmount: total));
    } catch (e) {
      emit(ExpenseErrorState('Failed to fetch expenses: ${e.toString()}'));
    }
  }

  Future<void> _onAddExpense(
    AddExpenseEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    try {
      await addExpenseUseCase(event.expense);
      
      // Refresh list
      final state = this.state;
      if (state is ExpenseLoadedState) {
        emit(ExpenseLoadedState(
          expenses: [...state.expenses, event.expense],
          totalAmount: state.totalAmount + event.expense.amount,
        ));
      }
    } catch (e) {
      emit(ExpenseErrorState('Failed to add expense: ${e.toString()}'));
    }
  }

  Future<void> _onDeleteExpense(
    DeleteExpenseEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    try {
      await deleteExpenseUseCase(event.expenseId);
      
      // Remove from list
      final state = this.state;
      if (state is ExpenseLoadedState) {
        final updatedExpenses = state.expenses
            .where((e) => e.id != event.expenseId)
            .toList();
        final amount =
            state.expenses.firstWhere((e) => e.id == event.expenseId).amount;
        
        emit(ExpenseLoadedState(
          expenses: updatedExpenses,
          totalAmount: state.totalAmount - amount,
        ));
      }
    } catch (e) {
      emit(ExpenseErrorState('Failed to delete expense: ${e.toString()}'));
    }
  }
}
```

### 3.3 Pages and Widgets

```dart
// lib/presentation/pages/expenses_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class ExpensesPage extends StatefulWidget {
  final String userId;

  const ExpensesPage({Key? key, required this.userId}) : super(key: key);

  @override
  State<ExpensesPage> createState() => _ExpensesPageState();
}

class _ExpensesPageState extends State<ExpensesPage> {
  @override
  void initState() {
    super.initState();
    // Page load hone par expenses fetch karo
    context.read<ExpenseBloc>().add(
          FetchUserExpensesEvent(widget.userId),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Expenses'),
      ),
      body: BlocBuilder<ExpenseBloc, ExpenseState>(
        builder: (context, state) {
          if (state is ExpenseInitialState || state is ExpenseLoadingState) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ExpenseErrorState) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.message}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<ExpenseBloc>().add(
                            FetchUserExpensesEvent(widget.userId),
                          );
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state is ExpenseLoadedState) {
            return Column(
              children: [
                // Total amount card
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          const Text('Total Expenses'),
                          const SizedBox(height: 8),
                          Text(
                            '₹${state.totalAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                // Expenses list
                Expanded(
                  child: ListView.builder(
                    itemCount: state.expenses.length,
                    itemBuilder: (context, index) {
                      final expense = state.expenses[index];
                      return ExpenseListTile(
                        expense: expense,
                        onDelete: () {
                          context
                              .read<ExpenseBloc>()
                              .add(DeleteExpenseEvent(expense.id));
                        },
                      );
                    },
                  ),
                ),
              ],
            );
          }

          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddExpenseDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showAddExpenseDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AddExpenseDialog(
        userId: widget.userId,
        onAddExpense: (expense) {
          context.read<ExpenseBloc>().add(AddExpenseEvent(expense));
        },
      ),
    );
  }
}
```

```dart
// lib/presentation/widgets/expense_list_tile.dart
import 'package:flutter/material.dart';
import 'package:knowlege_base/domain/entities/expense.dart';

class ExpenseListTile extends StatelessWidget {
  final Expense expense;
  final VoidCallback onDelete;

  const ExpenseListTile({
    Key? key,
    required this.expense,
    required this.onDelete,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(expense.title),
      subtitle: Text(
        '${expense.category.toString().split('.').last} • ${expense.date.toString().split(' ')[0]}',
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '₹${expense.amount.toStringAsFixed(2)}',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete, color: Colors.red),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
```

## 4. Dependency Injection — Wiring It All Together

Ab tak layers alag alag likhte, par sabko kaise connect karein? **Dependency Injection** through. GetIt ya Riverpod use kar sakte ho, par yahan simple approach dikhate hain.

```dart
// lib/service_locator.dart
import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;
import 'package:sqflite/sqflite.dart';

import 'domain/repositories/expense_repository.dart';
import 'domain/usecases/add_expense_usecase.dart';
import 'domain/usecases/get_user_expenses_usecase.dart';
import 'data/repositories/expense_repository_impl.dart';
import 'data/datasources/remote_expense_datasource.dart';
import 'data/datasources/local_expense_datasource.dart';
import 'presentation/bloc/expense_bloc.dart';

final getIt = GetIt.instance;

Future<void> setupServiceLocator() async {
  // External dependencies
  getIt.registerSingleton<http.Client>(http.Client());
  
  // Database setup
  final database = await openDatabase('expense_tracker.db');
  getIt.registerSingleton<Database>(database);

  // DataSources
  getIt.registerSingleton<RemoteExpenseDataSource>(
    RemoteExpenseDataSourceImpl(httpClient: getIt<http.Client>()),
  );
  
  getIt.registerSingleton<LocalExpenseDataSource>(
    LocalExpenseDataSourceImpl(getIt<Database>()),
  );

  // Repositories
  getIt.registerSingleton<ExpenseRepository>(
    ExpenseRepositoryImpl(
      remoteDataSource: getIt<RemoteExpenseDataSource>(),
      localDataSource: getIt<LocalExpenseDataSource>(),
    ),
  );

  // Use Cases
  getIt.registerSingleton<GetUserExpensesUseCase>(
    GetUserExpensesUseCase(getIt<ExpenseRepository>()),
  );
  
  getIt.registerSingleton<AddExpenseUseCase>(
    AddExpenseUseCase(getIt<ExpenseRepository>()),
  );

  // BLoCs
  getIt.registerSingleton<ExpenseBloc>(
    ExpenseBloc(
      getUserExpensesUseCase: getIt<GetUserExpensesUseCase>(),
      addExpenseUseCase: getIt<AddExpenseUseCase>(),
      deleteExpenseUseCase: getIt<DeleteExpenseUseCase>(),
    ),
  );
}
```

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'service_locator.dart';
import 'presentation/bloc/expense_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupServiceLocator();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Expense Tracker',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: BlocProvider(
        create: (_) => getIt<ExpenseBloc>(),
        child: const ExpensesPage(userId: 'user123'),
      ),
    );
  }
}
```

> [!tip]
> **GetIt vs Riverpod vs Provider**:
> - **GetIt**: Simple, synchronous, good for DI. Bas registers aur retrieves karta hai.
> - **Provider**: Popular, reactive, state management bhi handle karta hai.
> - **Riverpod**: Modern, compile-time safe, immutable approach. Scope management achhi.

## 5. Complete Folder Structure — Real-World Example

Expense Tracker app ka complete structure:

```
lib/
├── domain/                          # Pure business logic
│   ├── entities/
│   │   ├── expense.dart
│   │   └── user.dart
│   ├── repositories/
│   │   ├── expense_repository.dart
│   │   └── user_repository.dart
│   └── usecases/
│       ├── add_expense_usecase.dart
│       ├── get_user_expenses_usecase.dart
│       ├── delete_expense_usecase.dart
│       └── get_expense_summary_usecase.dart
│
├── data/                            # API + Database layer
│   ├── datasources/
│   │   ├── remote_expense_datasource.dart
│   │   └── local_expense_datasource.dart
│   ├── models/
│   │   ├── expense_model.dart
│   │   └── user_model.dart
│   └── repositories/
│       └── expense_repository_impl.dart
│
├── presentation/                    # UI + State Management
│   ├── bloc/
│   │   ├── expense_bloc.dart
│   │   ├── expense_event.dart
│   │   └── expense_state.dart
│   ├── pages/
│   │   ├── expenses_page.dart
│   │   └── add_expense_page.dart
│   └── widgets/
│       ├── expense_list_tile.dart
│       └── expense_card.dart
│
├── service_locator.dart             # Dependency injection setup
└── main.dart
```

**Key Advantage**: Ek naye developer ko ye structure dekh le toh samajh jaye — "ah, expenses ka domain logic yahan hai, API calls yahan hai, UI yahan hai."

## 6. Testing — Why Clean Architecture Matters

Layering ke kaaran **testing bohat easy** hoti hai:

```dart
// test/domain/usecases/add_expense_usecase_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('AddExpenseUseCase', () {
    late AddExpenseUseCase useCase;
    late MockExpenseRepository mockRepository;

    setUp(() {
      mockRepository = MockExpenseRepository();
      useCase = AddExpenseUseCase(mockRepository);
    });

    test('should call repository.addExpense with valid expense', () async {
      // Arrange
      final expense = Expense(
        id: '1',
        userId: 'user1',
        title: 'Lunch',
        amount: 250.0,
        category: ExpenseCategory.food,
        date: DateTime.now(),
      );

      // Act
      await useCase(expense);

      // Assert
      verify(mockRepository.addExpense(expense)).called(1);
    });

    test('should throw exception when amount is negative', () async {
      // Arrange
      final expense = Expense(
        id: '1',
        userId: 'user1',
        title: 'Lunch',
        amount: -250.0, // Invalid
        category: ExpenseCategory.food,
        date: DateTime.now(),
      );

      // Act & Assert
      expect(() => useCase(expense), throwsException);
    });

    test('should throw exception when title is empty', () async {
      // Arrange
      final expense = Expense(
        id: '1',
        userId: 'user1',
        title: '', // Invalid
        amount: 250.0,
        category: ExpenseCategory.food,
        date: DateTime.now(),
      );

      // Act & Assert
      expect(() => useCase(expense), throwsException);
    });
  });
}
```

**BLoC Testing**:

```dart
// test/presentation/bloc/expense_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('ExpenseBloc', () {
    late ExpenseBloc expenseBloc;
    late MockGetUserExpensesUseCase mockGetUserExpensesUseCase;

    setUp(() {
      mockGetUserExpensesUseCase = MockGetUserExpensesUseCase();
      expenseBloc = ExpenseBloc(
        getUserExpensesUseCase: mockGetUserExpensesUseCase,
        addExpenseUseCase: MockAddExpenseUseCase(),
        deleteExpenseUseCase: MockDeleteExpenseUseCase(),
      );
    });

    blocTest<ExpenseBloc, ExpenseState>(
      'emits [ExpenseLoadingState, ExpenseLoadedState] when FetchUserExpensesEvent is added',
      build: () {
        when(mockGetUserExpensesUseCase('user1')).thenAnswer(
          (_) async => [
            Expense(
              id: '1',
              userId: 'user1',
              title: 'Lunch',
              amount: 250.0,
              category: ExpenseCategory.food,
              date: DateTime.now(),
            ),
          ],
        );
        return expenseBloc;
      },
      act: (bloc) => bloc.add(FetchUserExpensesEvent('user1')),
      expect: () => [
        isA<ExpenseLoadingState>(),
        isA<ExpenseLoadedState>()
            .having((state) => state.expenses.length, 'length', 1)
            .having((state) => state.totalAmount, 'totalAmount', 250.0),
      ],
    );
  });
}
```

> [!warning]
> **Common Mistakes**:
> - Presentation layer ko data layer se directly access karna (isse abstraction break hota hai)
> - UseCase mein business logic likh dena aur domain logic repository mein (responsibilities mix ho jati hain)
> - Models aur Entities ko merge kar dena (serialization concerns domain layer mein nahi chalni)

## 7. Comparison to Backend Architecture

Node.js/Express app ki architecture dekhi hoga. Clean Architecture same principles follow karta hai:

| Backend (Express) | Flutter |
|---|---|
| **Routes** | **Presentation Layer** (Pages, BLoCs) |
| **Controllers** | **BLoCs** (event handling) |
| **Services** | **Use Cases** (business logic) |
| **Models/DTOs** | **Models + Entities** (serialization + domain) |
| **Database Layer** | **Data Layer** (repositories, datasources) |
| **Dependency Injection** | **Service Locator / GetIt** |

Express mein jaise `userController.getUser()` method mein `userService` inject hota hai, same way BLoC mein `useCase` inject hota hai. Difference ye hai ki:

- Express mein **synchronous flow** hota hai (mostly): request → controller → service → DB → response
- Flutter mein **reactive flow** hota hai: event → BLoC → useCase → repository → state → UI rebuild

## 8. Best Practices — Production-Grade Code

### 8.1 Error Handling
```dart
// lib/domain/failures.dart — Define error types
abstract class Failure {
  final String message;
  Failure(this.message);
}

class NetworkFailure extends Failure {
  NetworkFailure(String message) : super(message);
}

class DatabaseFailure extends Failure {
  DatabaseFailure(String message) : super(message);
}

class ValidationFailure extends Failure {
  ValidationFailure(String message) : super(message);
}

// Use in repositories
class ExpenseRepositoryImpl implements ExpenseRepository {
  @override
  Future<List<Expense>> getUserExpenses(String userId) async {
    try {
      final dataList = await remoteDataSource.getUserExpenses(userId);
      return dataList.map((data) => ExpenseModel.fromJson(data).toEntity()).toList();
    } on NetworkException catch (e) {
      throw NetworkFailure(e.message);
    } on DatabaseException catch (e) {
      throw DatabaseFailure(e.message);
    }
  }
}
```

### 8.2 Caching Strategy
```dart
// Offline-first caching pattern
Future<List<Expense>> getUserExpenses(String userId) async {
  try {
    // Try remote first
    final expenses = await remoteDataSource.getUserExpenses(userId);
    
    // Update cache immediately
    for (final expense in expenses) {
      await localDataSource.insertExpense(expense);
    }
    
    return expenses;
  } catch (e) {
    // Fallback to cache
    return await localDataSource.getUserExpenses(userId);
  }
}
```

### 8.3 Validation in Use Cases
```dart
class AddExpenseUseCase {
  Future<void> call(Expense expense) async {
    // Input validation
    if (expense.amount <= 0) {
      throw ValidationFailure('Amount must be positive');
    }
    if (expense.title.isEmpty || expense.title.length > 100) {
      throw ValidationFailure('Title must be 1-100 characters');
    }
    if (expense.userId.isEmpty) {
      throw ValidationFailure('User ID required');
    }
    
    // Then delegate to repository
    await repository.addExpense(expense);
  }
}
```

## 9. Scaling Up — Multiple Data Sources

Jab production mein jao, toh multiple datasources chaiye:

```dart
// Firebase + Local DB
class ExpenseRepositoryImpl implements ExpenseRepository {
  final FirebaseExpenseDataSource firebaseDataSource;
  final LocalExpenseDataSource localDataSource;
  final CacheExpenseDataSource cacheDataSource; // Memory cache

  @override
  Future<List<Expense>> getUserExpenses(String userId) async {
    // 1. Check memory cache (fastest)
    var expenses = cacheDataSource.getUserExpenses(userId);
    if (expenses.isNotEmpty) return expenses;

    // 2. Check local DB (fast)
    try {
      expenses = await localDataSource.getUserExpenses(userId);
      if (expenses.isNotEmpty) {
        cacheDataSource.cacheExpenses(expenses);
        return expenses;
      }
    } catch (_) {}

    // 3. Fetch from remote (slow)
    try {
      expenses = await firebaseDataSource.getUserExpenses(userId);
      await localDataSource.saveExpenses(expenses);
      cacheDataSource.cacheExpenses(expenses);
      return expenses;
    } catch (e) {
      throw Exception('Failed to fetch expenses');
    }
  }
}
```

> [!info]
> **3-Tier Cache Strategy**:
> 1. **Memory Cache** — Fastest, session lifetime (RAM)
> 2. **Local DB** — Fast, persistent (SQLite/Hive)
> 3. **Remote API** — Slow, source of truth (Firebase/REST)

## Key Takeaways

- **Clean Architecture** mein 3 main layers hote hain: Domain (business logic), Data (API/DB), Presentation (UI)
- **Domain layer** framework-independent hota hai — pure Dart, no Flutter dependency
- **Repository Pattern** data sources ko abstract karta hai — remote + local interchangeable
- **Use Cases** ek-ek feature represent karte hain aur easily testable hote hain
- **BLoC** presentation layer ko manage karta hai — events receive, state emit
- **Models** aur **Entities** alag hote hain — models serialization handle karte hain, entities domain logic
- **Dependency Injection** (GetIt) sabko wire karta hai — loose coupling, testing easy
- **Testing** cleaner hota hai kyun-ki layers isolated hote hain — unit tests likho repositories ke bina
- **Node.js** pattern same apply karte ho Flutter mein — sirf state management reactive hoti hai
- **Caching strategy** important hai — offline-first approach production apps mein common
- **Error handling** ke liye custom Failure classes define karo — strong typing aur clarity

---

**Agla Chapter**: State Management Deep Dive — BLoC vs Riverpod vs Provider. Jo pattern production mein use karte ho, us ko optimize karte hain.


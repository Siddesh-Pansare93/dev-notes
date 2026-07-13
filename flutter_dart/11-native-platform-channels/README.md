# Native Platform Channels — iOS/Android Communication, Kotlin/Swift Integration

## Intro: Kya Problem Solve Karta Hai?

Dekho, ek second ke liye socho. Jab tum Zomato app chalate ho aur location share karte ho, ya camera use karte ho food photos lene ke liye — voh sab Flutter nahi kar raha. Ye sab Android aur iOS ke native APIs hain jo directly phone ka hardware access karte hain.

Flutter ek abstraction layer hai, na? Beautiful UIs banate hai, state management karte hain, lekin **hardware-level access** ke liye phone ke underlying platform (Android ka Kotlin, iOS ka Swift) se baat karni padti hai. Isi ke liye **Platform Channels** exist karte hain.

Platform Channels = **Dart aur Native Code ke beech ek bridge**. Dart-side se method call karo → native code execute ho → result wapas Dart ko mile.

Jaise Express.js se tum database call karte ho? Platform channels bilkul vaise hain — request bhejo, response wait karo.

---

## Kya Hote Hain Platform Channels?

Flutter app two-way communication karta hai:

```
┌─────────────────────────────────────────────────────────┐
│                   Flutter App (Dart)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  UI Layer (Widgets, State Management)             │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓ ↑                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Platform Channels                                │  │
│  │  (MethodChannel, EventChannel)                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           ↓ (JSON serialized) ↑
┌─────────────────────────────────────────────────────────┐
│           Native Layer (Platform-Specific)              │
│                                                          │
│  ┌─ Android ─────────────────┐  ┌─ iOS ─────────────┐  │
│  │ Kotlin Code               │  │ Swift Code       │  │
│  │ - Camera API              │  │ - Camera API     │  │
│  │ - GPS/Location            │  │ - GPS/Location   │  │
│  │ - Battery, etc.           │  │ - Battery, etc.  │  │
│  └───────────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Analogy**: Jaise Zomato app ka backend hai — tum UI se order karte ho (REST call), server process karta hai, response wapas milta hai. Platform channels bilkul same pattern hain, but native code ke saath.

---

## Architecture: Method Channels vs Event Channels

### Method Channels — One-Shot Requests

**Jab**: Single request-response chahiye.

**Example scenarios**:
- Device battery level get karna
- Camera permission check karna
- Device info fetch karna
- Bluetooth pairing initiate karna

**Flow**:

```
Dart Side           Native Side
  │                   │
  ├─ invokeMethod()─→ │ (channel name, method name, args)
  │                   ├─ Android: MethodChannel handler
  │                   ├─ iOS: FlutterMethodChannel handler
  │                   ├─ Work karo...
  │                   │
  │                ←─ reply/result
  │ (result receive)
  │
```

---

### Event Channels — Streaming Data

**Jab**: Continuous data flow chahiye (location updates, sensor readings, battery drain monitoring).

**Example scenarios**:
- Location tracking (real-time updates like IRCTC train tracking)
- Accelerometer data (gaming, step counting)
- Battery level streaming
- Sensor data (gyroscope, magnetometer)

**Flow**:

```
Native Side         Dart Side
  │                   │
  ├─ Stream start ────→ │ (user ke liye)
  │                     │
  ├─ Event 1 ────────→ │ (onEvent)
  ├─ Event 2 ────────→ │ (onEvent)
  ├─ Event 3 ────────→ │ (onEvent)
  │                     │
  │ ←─ cancel signal ── │ (user cleanup)
  │
```

---

## Deep Dive: Method Channels

### Setup: Platform-Side (Android - Kotlin)

```kotlin
// android/app/src/main/kotlin/com/example/myapp/MainActivity.kt

package com.example.myapp

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.dart.DartExecutor
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.myapp/battery"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Channel create karo
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getBatteryLevel" -> {
                    val batteryLevel = getBatteryLevel()
                    if (batteryLevel != -1) {
                        result.success(batteryLevel)
                    } else {
                        result.error("UNAVAILABLE", "Battery level unavailable", null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun getBatteryLevel(): Int {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }
}
```

### Setup: Platform-Side (iOS - Swift)

```swift
// ios/Runner/GeneratedPluginRegistrant.swift (auto-generated)
// BUT custom code goes here:
// ios/Runner/Info.plist aur ios/Runner/GeneratedPluginRegistrant.swift

// Custom method channel ke liye:
// ios/Runner/GeneratedPluginRegistrant.swift या नया file: BatteryMethodChannel.swift

import UIKit

class BatteryMethodChannel {
    static let channelName = "com.example.myapp/battery"

    static func setupMethodChannel(with controller: FlutterViewController) {
        let batteryChannel = FlutterMethodChannel(
            name: channelName,
            binaryMessenger: controller.binaryMessenger
        )

        batteryChannel.setMethodCallHandler { (call: FlutterMethodCall, result: @escaping FlutterResult) in
            switch call.method {
            case "getBatteryLevel":
                result(getBatteryLevel())
            default:
                result(FlutterMethodNotImplemented)
            }
        }
    }

    static func getBatteryLevel() -> Int {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let batteryLevel = Int(UIDevice.current.batteryLevel * 100)
        return batteryLevel
    }
}

// Integrate in GeneratedPluginRegistrant (AppDelegate.swift):
@UIApplicationMain
@objc class GeneratedPluginRegistrant: NSObject, UIApplicationDelegate {
    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let controller = window?.rootViewController as! FlutterViewController
        BatteryMethodChannel.setupMethodChannel(with: controller)
        return true
    }
}
```

### Dart Side: MethodChannel Usage

```dart
import 'package:flutter/services.dart';

class BatteryService {
  // Channel name must match native side
  static const platform = MethodChannel('com.example.myapp/battery');

  // Method: battery level fetch karo
  Future<int> getBatteryLevel() async {
    try {
      final int batteryLevel = await platform.invokeMethod<int>('getBatteryLevel');
      return batteryLevel ?? 0;
    } on PlatformException catch (e) {
      print("Error: ${e.message}");
      return -1;
    }
  }
}

// Usage in Widget:
class BatteryWidget extends StatefulWidget {
  @override
  State<BatteryWidget> createState() => _BatteryWidgetState();
}

class _BatteryWidgetState extends State<BatteryWidget> {
  final BatteryService _batteryService = BatteryService();
  int _batteryLevel = 0;

  @override
  void initState() {
    super.initState();
    _fetchBatteryLevel();
  }

  Future<void> _fetchBatteryLevel() async {
    final level = await _batteryService.getBatteryLevel();
    setState(() {
      _batteryLevel = level;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Battery Level')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Battery: $_batteryLevel%',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _fetchBatteryLevel,
              child: Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }
}
```

**Key Points**:
- Channel name dono taraf same hona chahiye (`com.example.myapp/battery`)
- Serialization automatic hota hai — Dart int → JSON → Kotlin Int
- Error handling zaruri hai (PlatformException)
- invokeMethod async hai, await karo

---

## Deep Dive: Event Channels (Streaming)

### Android - Kotlin (Location Streaming)

```kotlin
// MainActivity.kt

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.core.app.ActivityCompat
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel

class MainActivity: FlutterActivity() {
    private val LOCATION_CHANNEL = "com.example.myapp/location"
    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Event channel setup (streaming data ke liye)
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, LOCATION_CHANNEL)
            .setStreamHandler(object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    startLocationUpdates(events)
                }

                override fun onCancel(arguments: Any?) {
                    stopLocationUpdates()
                }
            })
    }

    private fun startLocationUpdates(events: EventChannel.EventSink?) {
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

        locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                // HashMap se map bana, events.success() call karo
                val locationMap = mapOf(
                    "latitude" to location.latitude,
                    "longitude" to location.longitude,
                    "accuracy" to location.accuracy,
                    "altitude" to location.altitude
                )
                events?.success(locationMap)
            }

            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {
                events?.error("PROVIDER_DISABLED", "Location provider disabled", null)
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        }

        // Permission check karo
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            locationManager?.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000, // 1 second interval
                0f,   // 0 meters minimum distance
                locationListener!!
            )
        } else {
            events?.error("PERMISSION_DENIED", "Location permission not granted", null)
        }
    }

    private fun stopLocationUpdates() {
        if (locationManager != null && locationListener != null) {
            locationManager?.removeUpdates(locationListener!!)
        }
    }
}
```

### iOS - Swift (Location Streaming)

```swift
import UIKit
import CoreLocation

class LocationEventChannel: NSObject, CLLocationManagerDelegate {
    static let channelName = "com.example.myapp/location"
    private var locationManager: CLLocationManager?
    private var eventSink: FlutterEventSink?

    static func setupEventChannel(with controller: FlutterViewController) {
        let locationChannel = FlutterEventChannel(
            name: channelName,
            binaryMessenger: controller.binaryMessenger
        )
        let handler = LocationEventChannel()
        locationChannel.setStreamHandler(handler)
    }
}

extension LocationEventChannel: FlutterStreamHandler {
    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        self.eventSink = events
        self.startLocationUpdates()
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        self.stopLocationUpdates()
        return nil
    }

    private func startLocationUpdates() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyBest
        locationManager?.requestWhenInUseAuthorization()
        locationManager?.startUpdatingLocation()
    }

    private func stopLocationUpdates() {
        locationManager?.stopUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        let locationData: [String: Any] = [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "altitude": location.altitude
        ]
        eventSink?(locationData)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        eventSink?(FlutterError(code: "LOCATION_ERROR", message: error.localizedDescription, details: nil))
    }
}
```

### Dart - EventChannel Usage

```dart
import 'package:flutter/services.dart';

class LocationService {
  static const eventChannel = EventChannel('com.example.myapp/location');

  Stream<LocationData> getLocationStream() {
    return eventChannel.receiveBroadcastStream().map((dynamic event) {
      return LocationData.fromMap(Map<String, dynamic>.from(event));
    }).handleError((error) {
      print('Location stream error: $error');
    });
  }
}

class LocationData {
  final double latitude;
  final double longitude;
  final double accuracy;
  final double altitude;

  LocationData({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.altitude,
  });

  factory LocationData.fromMap(Map<String, dynamic> map) {
    return LocationData(
      latitude: map['latitude'] ?? 0.0,
      longitude: map['longitude'] ?? 0.0,
      accuracy: map['accuracy'] ?? 0.0,
      altitude: map['altitude'] ?? 0.0,
    );
  }
}

// Usage in Widget:
class LiveLocationWidget extends StatefulWidget {
  @override
  State<LiveLocationWidget> createState() => _LiveLocationWidgetState();
}

class _LiveLocationWidgetState extends State<LiveLocationWidget> {
  final LocationService _locationService = LocationService();
  late StreamSubscription<LocationData> _locationSubscription;
  LocationData? _currentLocation;

  @override
  void initState() {
    super.initState();
    _startLocationTracking();
  }

  void _startLocationTracking() {
    _locationSubscription = _locationService.getLocationStream().listen(
      (LocationData location) {
        setState(() {
          _currentLocation = location;
        });
      },
      onError: (error) {
        print('Location error: $error');
      },
    );
  }

  @override
  void dispose() {
    _locationSubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Live Location')),
      body: _currentLocation == null
          ? Center(child: CircularProgressIndicator())
          : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Latitude: ${_currentLocation!.latitude.toStringAsFixed(6)}'),
                  Text('Longitude: ${_currentLocation!.longitude.toStringAsFixed(6)}'),
                  Text('Accuracy: ${_currentLocation!.accuracy.toStringAsFixed(2)}m'),
                ],
              ),
            ),
    );
  }
}
```

---

## Real-World Example: Camera Permission + Photo Capture

Dekho, ek practical example — Zomato mein jab tum food ka photo click karte ho na, usse pehle permission mangta hai. Same pattern:

### Android - Kotlin (Camera Setup)

```kotlin
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.MediaStore
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity: FlutterActivity() {
    private val CAMERA_CHANNEL = "com.example.myapp/camera"
    private val CAMERA_REQUEST_CODE = 1001
    private var cameraResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CAMERA_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "capturePhoto" -> {
                        cameraResult = result
                        if (ContextCompat.checkSelfPermission(
                                this,
                                Manifest.permission.CAMERA
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
                            launchCamera()
                        } else {
                            ActivityCompat.requestPermissions(
                                this,
                                arrayOf(Manifest.permission.CAMERA),
                                CAMERA_REQUEST_CODE
                            )
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun launchCamera() {
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        startActivityForResult(cameraIntent, CAMERA_REQUEST_CODE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == CAMERA_REQUEST_CODE && resultCode == RESULT_OK) {
            val imageBitmap = data?.getParcelableExtra<android.graphics.Bitmap>("data")
            // Save and return path
            val savedPath = saveImageToFile(imageBitmap)
            cameraResult?.success(savedPath)
        } else {
            cameraResult?.error("CAMERA_CANCELLED", "User cancelled", null)
        }
    }

    private fun saveImageToFile(bitmap: android.graphics.Bitmap?): String {
        // Implementation to save bitmap to file
        return "/path/to/saved/image.jpg"
    }
}
```

### Dart - Camera Integration

```dart
import 'package:flutter/services.dart';

class CameraService {
  static const platform = MethodChannel('com.example.myapp/camera');

  Future<String?> capturePhoto() async {
    try {
      final String imagePath = await platform.invokeMethod<String>('capturePhoto') ?? '';
      return imagePath;
    } on PlatformException catch (e) {
      print("Failed: ${e.message}");
      return null;
    }
  }
}

// Usage:
class FoodPhotoWidget extends StatefulWidget {
  @override
  State<FoodPhotoWidget> createState() => _FoodPhotoWidgetState();
}

class _FoodPhotoWidgetState extends State<FoodPhotoWidget> {
  final CameraService _cameraService = CameraService();
  String? _photoPath;

  Future<void> _takePhoto() async {
    final path = await _cameraService.capturePhoto();
    if (path != null) {
      setState(() {
        _photoPath = path;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Photo saved: $path')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Capture Food Photo')),
      body: Center(
        child: ElevatedButton(
          onPressed: _takePhoto,
          child: Text('Take Photo'),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _takePhoto,
        child: Icon(Icons.camera),
      ),
    );
  }
}
```

---

## Writing Custom Plugins

Agar tum production app banate ho, direct MainActivity mein code likhna acha nahi. Better approach: **Plugin package** banao.

### Step 1: Plugin Project Structure

```
my_battery_plugin/
├── pubspec.yaml
├── lib/
│   └── my_battery_plugin.dart
├── android/
│   └── src/main/kotlin/com/example/my_battery_plugin/
│       └── MyBatteryPlugin.kt
└── ios/
    └── my_battery_plugin.podspec
    └── Classes/
        └── MyBatteryPlugin.swift
```

### Step 2: pubspec.yaml

```yaml
name: my_battery_plugin
description: A battery level plugin for Flutter
version: 1.0.0
environment:
  sdk: '>=2.18.0 <4.0.0'
  flutter: '>=2.8.0'

flutter:
  plugin:
    platforms:
      android:
        package: com.example.my_battery_plugin
        pluginClass: MyBatteryPlugin
      ios:
        pluginClass: MyBatteryPlugin
```

### Step 3: Dart Wrapper (lib/my_battery_plugin.dart)

```dart
import 'package:flutter/services.dart';

class MyBatteryPlugin {
  static const platform = MethodChannel('com.example.my_battery_plugin/battery');

  static Future<int> getBatteryLevel() async {
    try {
      final int result = await platform.invokeMethod<int>('getBatteryLevel') ?? 0;
      return result;
    } on PlatformException catch (e) {
      throw Exception('Failed to get battery level: ${e.message}');
    }
  }

  static Future<bool> isBatteryLow(int threshold) async {
    try {
      final bool result = await platform.invokeMethod<bool>(
        'isBatteryLow',
        {'threshold': threshold},
      ) ?? false;
      return result;
    } on PlatformException catch (e) {
      throw Exception('Failed to check battery: ${e.message}');
    }
  }
}
```

### Step 4: Android Implementation (Kotlin)

```kotlin
// android/src/main/kotlin/com/example/my_battery_plugin/MyBatteryPlugin.kt

package com.example.my_battery_plugin

import android.content.Context
import android.content.IntentFilter
import android.os.BatteryManager
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MyBatteryPlugin {
    companion object {
        @JvmStatic
        fun registerWith(flutterEngine: FlutterEngine, context: Context) {
            val channel = MethodChannel(
                flutterEngine.dartExecutor.binaryMessenger,
                "com.example.my_battery_plugin/battery"
            )

            channel.setMethodCallHandler { call, result ->
                when (call.method) {
                    "getBatteryLevel" -> {
                        val level = getBatteryLevel(context)
                        result.success(level)
                    }
                    "isBatteryLow" -> {
                        val threshold = call.argument<Int>("threshold") ?: 20
                        val level = getBatteryLevel(context)
                        result.success(level < threshold)
                    }
                    else -> result.notImplemented()
                }
            }
        }

        private fun getBatteryLevel(context: Context): Int {
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            return batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        }
    }
}
```

---

## Error Handling & Best Practices

### Common Pitfalls

| Problem | Solution |
|---------|----------|
| **Channel name mismatch** | Exactly same string on both sides. Use constant. |
| **Permission denied** | Check permissions before calling native code. Handle `PlatformException`. |
| **Null safety issues** | Cast result properly: `await platform.invokeMethod<int>('method') ?? 0` |
| **Serialization errors** | Pass simple types (int, String, List, Map). Not custom objects. |
| **Memory leaks** | Always `cancel()` streams in `dispose()`. |
| **ANR (Application Not Responding)** | Don't do heavy work in main thread. Use background isolates. |

### Error Handling Pattern

```dart
Future<T> _safeInvoke<T>(String method, [dynamic args]) async {
  try {
    final result = await platform.invokeMethod<T>(method, args);
    return result as T;
  } on PlatformException catch (e) {
    // Platform-specific error (e.code, e.message, e.details)
    print('PlatformException: ${e.code}, ${e.message}');
    rethrow; // or return default value
  } on MissingPluginException catch (e) {
    // Plugin not implemented
    print('Plugin not implemented');
    rethrow;
  } catch (e) {
    // Unexpected error
    print('Unexpected error: $e');
    rethrow;
  }
}
```

### Timeouts (Important!)

Native code slow ho raha hai? Timeout set karo:

```dart
Future<int> getBatteryLevelWithTimeout() async {
  try {
    final int level = await platform
        .invokeMethod<int>('getBatteryLevel')
        .timeout(Duration(seconds: 5));
    return level ?? 0;
  } on TimeoutException {
    print('Native call timed out');
    return -1;
  } on PlatformException catch (e) {
    print('Platform error: ${e.message}');
    return -1;
  }
}
```

---

## Debugging Platform Code

### Android - Logcat

```bash
# Logcat dekho real-time mein
adb logcat | grep "MyTag"

# Or Android Studio mein:
# Run → Edit Configurations → Logcat tab
```

```kotlin
// Kotlin mein logging add karo
import android.util.Log

Log.d("MyBatteryPlugin", "Battery level: $batteryLevel")
Log.e("MyBatteryPlugin", "Error occurred", exception)
```

### iOS - Console

```swift
// Swift mein logging
NSLog("Battery level: %d", batteryLevel)
print("DEBUG: Location: \(location.coordinate)")
```

Xcode Console dekho (Cmd + Shift + Y).

### Dart-Side Debugging

```dart
// Dart mein channel calls monitor karo
const debugPrintChannel = MethodChannel('...');

// Or use: flutter logs --grep="platform"
// Terminal mein
```

---

## Performance Considerations

### When NOT to Use Platform Channels

- Simple UI/widget stuff → pure Flutter use karo
- Network requests → use `http` package
- Local storage → use `shared_preferences` or `hive`
- Animations → pure Dart/Flutter

### When to Use Platform Channels

- Hardware access (camera, GPS, Bluetooth)
- OS-specific APIs (notifications, permissions)
- Performance-critical operations (image processing, video encoding)
- Device-specific features (NFC, biometric)

### Optimization Tips

1. **Batch operations**: Multiple calls avoid karo. Single call mein sab data bhejo.

```dart
// Bad ❌
for (int i = 0; i < 100; i++) {
  await platform.invokeMethod('processData', {'value': i});
}

// Good ✅
await platform.invokeMethod('processDataBatch', {
  'values': List.generate(100, (i) => i)
});
```

2. **Background isolates** for heavy work:

```dart
import 'dart:isolate';

void _heavyNativeWork() async {
  final result = await Isolate.run(() async {
    return await platform.invokeMethod('heavyOperation');
  });
  print('Result: $result');
}
```

3. **Caching**: Results ko cache karo agar frequent calls ho.

```dart
class CachedBatteryService {
  int? _cachedBatteryLevel;
  DateTime? _lastFetched;

  Future<int> getBatteryLevel() async {
    if (_lastFetched != null &&
        DateTime.now().difference(_lastFetched!).inSeconds < 5) {
      return _cachedBatteryLevel ?? 0;
    }

    final level = await platform.invokeMethod<int>('getBatteryLevel') ?? 0;
    _cachedBatteryLevel = level;
    _lastFetched = DateTime.now();
    return level;
  }
}
```

---

## Complete Example: Biometric Authentication

Real-world use case — fingerprint authentication like Google Pay ya BHIM app.

### Android - Kotlin (Biometric)

```kotlin
// MainActivity.kt
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import io.flutter.plugin.common.MethodChannel

private val BIOMETRIC_CHANNEL = "com.example.myapp/biometric"

override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)

    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, BIOMETRIC_CHANNEL)
        .setMethodCallHandler { call, result ->
            when (call.method) {
                "authenticateWithBiometric" -> {
                    val prompt = BiometricPrompt(
                        this,
                        object : BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationSucceeded(
                                result: BiometricPrompt.AuthenticationResult
                            ) {
                                super.onAuthenticationSucceeded(result)
                                result.success(true)
                            }

                            override fun onAuthenticationError(
                                errorCode: Int,
                                errString: CharSequence
                            ) {
                                super.onAuthenticationError(errorCode, errString)
                                result.error("AUTH_ERROR", errString.toString(), null)
                            }

                            override fun onAuthenticationFailed() {
                                super.onAuthenticationFailed()
                                result.success(false)
                            }
                        }
                    )

                    val promptInfo = BiometricPrompt.PromptInfo.Builder()
                        .setTitle("Fingerprint Authentication")
                        .setSubtitle("Authenticate using your fingerprint")
                        .setNegativeButtonText("Cancel")
                        .build()

                    prompt.authenticate(promptInfo)
                }
                else -> result.notImplemented()
            }
        }
}
```

### Dart - Biometric Widget

```dart
class BiometricService {
  static const platform = MethodChannel('com.example.myapp/biometric');

  Future<bool> authenticateWithBiometric() async {
    try {
      final bool isAuthenticated = 
          await platform.invokeMethod<bool>('authenticateWithBiometric') ?? false;
      return isAuthenticated;
    } on PlatformException catch (e) {
      print('Authentication error: ${e.message}');
      return false;
    }
  }
}

class BiometricLoginScreen extends StatefulWidget {
  @override
  State<BiometricLoginScreen> createState() => _BiometricLoginScreenState();
}

class _BiometricLoginScreenState extends State<BiometricLoginScreen> {
  final BiometricService _biometricService = BiometricService();
  bool _isAuthenticating = false;
  String _status = 'Ready to authenticate';

  Future<void> _authenticate() async {
    setState(() => _isAuthenticating = true);

    final isAuthenticated = await _biometricService.authenticateWithBiometric();

    setState(() {
      _isAuthenticating = false;
      _status = isAuthenticated ? 'Authentication successful!' : 'Authentication failed';
    });

    if (isAuthenticated) {
      // Navigate to home or unlock feature
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Secure Login')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.fingerprint, size: 80, color: Colors.blue),
            SizedBox(height: 20),
            Text(_status, style: Theme.of(context).textTheme.headlineSmall),
            SizedBox(height: 30),
            _isAuthenticating
                ? CircularProgressIndicator()
                : ElevatedButton.icon(
                    onPressed: _authenticate,
                    icon: Icon(Icons.lock),
                    label: Text('Authenticate with Fingerprint'),
                  ),
          ],
        ),
      ),
    );
  }
}
```

---

## Testing Platform Code

### Unit Testing (Dart Side)

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BatteryService', () {
    const platform = MethodChannel('com.example.myapp/battery');

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(platform, null);
    });

    test('getBatteryLevel returns correct value', () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(platform, (MethodCall methodCall) async {
        if (methodCall.method == 'getBatteryLevel') {
          return 85; // Mock response
        }
        return null;
      });

      final batteryService = BatteryService();
      final level = await batteryService.getBatteryLevel();

      expect(level, 85);
    });

    test('getBatteryLevel handles error', () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(platform, (MethodCall methodCall) async {
        throw PlatformException(code: 'UNAVAILABLE', message: 'Battery unavailable');
      });

      final batteryService = BatteryService();
      expect(
        () => batteryService.getBatteryLevel(),
        throwsException,
      );
    });
  });
}
```

---

## Why Native Matters (When Pure Flutter Fails)

| Scenario | Why Flutter Alone Isn't Enough |
|----------|--------------------------------|
| **Advanced Camera** | Need fine control over camera HAL, post-processing |
| **Video Encoding** | Hardware codec access (MediaCodec on Android, VideoToolbox on iOS) |
| **Bluetooth/NFC** | Low-level protocol handling |
| **Background Tasks** | OS-level scheduling (WorkManager, BackgroundModes) |
| **Deep OS Integration** | System-level features (widgets, voice assist, notifications) |
| **Performance** | Native C/C++ for compute-heavy tasks |

---

## Gotchas & Common Mistakes

### 1. Channel Name Typos

```dart
// ❌ This won't work
const channel = MethodChannel('com.example.myapp/Battery'); // Capital B

// ✅ Correct
const channel = MethodChannel('com.example.myapp/battery');
```

### 2. Forgetting Permissions (Android)

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### 3. Result Called Twice

```kotlin
// ❌ Bad
channel.setMethodCallHandler { call, result ->
    result.success("first")
    result.success("second") // Crash!
}

// ✅ Good
channel.setMethodCallHandler { call, result ->
    if (!result.responded) {
        result.success("only once")
    }
}
```

### 4. Serialization Issues

```dart
// ❌ This fails (custom class)
class User {
  String name;
  int age;
}
await platform.invokeMethod('processUser', User('John', 30));

// ✅ This works (Map)
await platform.invokeMethod('processUser', {
  'name': 'John',
  'age': 30,
});
```

### 5. Main Thread Blocking

```kotlin
// ❌ Bad — UI freeze
channel.setMethodCallHandler { call, result ->
    val data = fetchDataFromInternet() // Network call!
    result.success(data)
}

// ✅ Good — use coroutines
channel.setMethodCallHandler { call, result ->
    CoroutineScope(Dispatchers.Main).launch {
        val data = withContext(Dispatchers.IO) {
            fetchDataFromInternet()
        }
        result.success(data)
    }
}
```

---

## Key Takeaways

- **Platform Channels = Bridge** between Dart aur native code (Kotlin/Swift). Jab hardware access chahiye ya OS-specific features.

- **Two Types**: MethodChannel (request-response) aur EventChannel (streaming). MethodChannel simple calls ke liye, EventChannel continuous data ke liye.

- **Channel Name Consistency** critical hai. Dono sides (Dart aur native) mein exact same string.

- **Error Handling Mandatory**. PlatformException handle karo, timeouts set karo.

- **Serialization Simple Types** ke liye. Int, String, List, Map. Custom objects nahi.

- **Permissions** explicitly check aur request karo (Android). iOS mein Info.plist entry zaruri hai.

- **Memory Management**. Streams ko always cancel karo `dispose()` mein. Listeners remove karo.

- **Performance First**. Heavy work background isolate mein karo. Main thread block mat karo.

- **Plugin Package** use karo production code ke liye. Direct MainActivity mein code likhnaa scalable nahi.

- **Test Early**. Mock MethodChannel calls Dart tests mein. Native side mein unit tests alag.

- **Avoid When Possible**. Pure Flutter solution existing hai toh use karo. Platform channels overhead add karte hain (serialization, IPC latency).

- **Debugging Tools**. Logcat (Android), Console (iOS), Flutter devtools. Use 'em!

---

**Platform channels production apps ka backbone hote hain. Camera, GPS, payments, biometric — sab ke peeche koi na koi platform channel hota hai. Ab tum ready ho custom integrations likhne ke liye. Happy coding!**

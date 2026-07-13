# Advanced Native Integration — Custom Plugins, Gradle/CocoaPods, Performance Tuning

Ek pal ruko. Socho Zomato ke app ko — ye sirf Flutter/Dart mein written nahi hota. Real-time location tracking? Native sensors + platform channels. Payment gateway integration? Native code handle karta hai iOS aur Android mein alag-alag. Machine learning ke liye Google ML Kit? Native libraries. 

Yahi sab karte ho **native integration** mein — aapka Dart/Flutter code native platform code ke saath baat karta hai. Ye chapter mein tum seekhoge kaise:
- **Pub.dev-publishable plugins** banate ho (reusable packages)
- **Android native code** likhte ho (Kotlin/Java + Gradle)
- **iOS native code** likhte ho (Swift + CocoaPods)
- **Threading & async** callbacks properly handle karte ho (ANR avoid karte hue)
- **Performance** optimize karte ho
- **Production-grade plugin** banate ho aur publish karte ho

Chalo, deep dive karte hain.

---

## Ek Second Mein: Plugin Architecture Kya Hota Hai?

Flutter plugin ek **bridge** hai. Tum Dart mein API call karte ho, ye translate hota hai platform-specific code mein, aur result wapas Dart ko deta hai.

```
Dart Code (app/)
     ↓
Platform Channel (MethodChannel / EventChannel)
     ↓
Native Code (Android: Kotlin/Java, iOS: Swift/Obj-C)
     ↓
Native Platform APIs (sensors, file system, hardware)
     ↓
Platform Channel (result wapas)
     ↓
Dart Code (callback handle karte ho)
```

**Analogy**: Socho Zomato order place karna — app mein button press karte ho (Dart), backend API call hota hai (platform channel), aur server order save karta hai (native code), aur confirmation wapas aता है (result).

---

## Plugin Project Structure Samajhna

Jab tum `flutter create --template=plugin my_plugin` chalate ho, ye structure milता है:

```
my_plugin/
├── lib/
│   ├── my_plugin.dart           # Main Dart API
│   └── src/
│       └── method_channel.dart    # Platform channel setup
├── android/
│   ├── build.gradle               # Android build config
│   └── src/main/kotlin/
│       └── MyPluginActivity.kt     # Native Android code
├── ios/
│   ├── my_plugin.podspec          # CocoaPods config
│   └── Classes/
│       └── MyPluginPlugin.swift     # Native iOS code
├── example/
│   └── lib/main.dart              # Demo app
├── test/
├── pubspec.yaml                   # Plugin metadata
└── README.md
```

**Important**: Plugin mein `pubspec.yaml` mein `plugin:` section hota है:
```yaml
plugin:
  platforms:
    android:
      package: com.example.my_plugin  # Java package name
      pluginClass: MyPluginPlugin
    ios:
      pluginClass: MyPluginPlugin
```

---

## Real Plugin: Step-by-Step Example

Ek complete, publishable **battery status plugin** banate हैं जो native APIs से device की battery level read karta है।

### Step 1: Plugin Project Create करो

```bash
flutter create --template=plugin battery_monitor

cd battery_monitor
```

### Step 2: Dart API Design करो (lib/battery_monitor.dart)

```dart
import 'dart:async';
import 'package:flutter/services.dart';

class BatteryMonitor {
  static const platform = MethodChannel('com.example.battery_monitor/battery');
  static const batteryStream = EventChannel('com.example.battery_monitor/battery_stream');

  /// Get current battery level (0-100)
  static Future<int> getBatteryLevel() async {
    try {
      final int result = await platform.invokeMethod('getBatteryLevel');
      return result;
    } catch (e) {
      throw 'Failed to get battery level: $e';
    }
  }

  /// Stream battery level changes
  static Stream<int> getBatteryLevelStream() {
    return batteryStream
        .receiveBroadcastStream()
        .map((dynamic event) => event as int);
  }

  /// Get battery status (charging, discharging, unknown)
  static Future<String> getBatteryStatus() async {
    try {
      final String result = await platform.invokeMethod('getBatteryStatus');
      return result;
    } catch (e) {
      throw 'Failed to get battery status: $e';
    }
  }
}
```

**Samajhो:**
- `MethodChannel` — one-time method calls के लिए (जैसे HTTP request)
- `EventChannel` — continuous streams के लिए (जैसे WebSocket)
- Dart से native को call करना है तो `invokeMethod` use करते हो

### Step 3: Android Native Code (Kotlin)

`android/src/main/kotlin/com/example/battery_monitor/BatteryMonitorPlugin.kt`:

```kotlin
package com.example.battery_monitor

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.dart.DartExecutor
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class BatteryMonitorPlugin : FlutterPlugin {
  private lateinit var methodChannel: MethodChannel
  private lateinit var eventChannel: EventChannel
  private lateinit var context: Context

  override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    context = binding.applicationContext
    
    // Method channel setup
    methodChannel = MethodChannel(binding.binaryMessenger, "com.example.battery_monitor/battery")
    methodChannel.setMethodCallHandler { call, result ->
      when (call.method) {
        "getBatteryLevel" -> {
          val level = getBatteryLevel()
          result.success(level)
        }
        "getBatteryStatus" -> {
          val status = getBatteryStatus()
          result.success(status)
        }
        else -> result.notImplemented()
      }
    }

    // Event channel setup
    eventChannel = EventChannel(binding.binaryMessenger, "com.example.battery_monitor/battery_stream")
    eventChannel.setStreamHandler(BatteryStreamHandler(context))
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    methodChannel.setMethodCallHandler(null)
    eventChannel.setStreamHandler(null)
  }

  private fun getBatteryLevel(): Int {
    val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    val batteryStatus: Intent? = context.registerReceiver(null, ifilter)
    return batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
  }

  private fun getBatteryStatus(): String {
    val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    val batteryStatus: Intent? = context.registerReceiver(null, ifilter)
    val status: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
    
    return when (status) {
      BatteryManager.BATTERY_STATUS_CHARGING -> "charging"
      BatteryManager.BATTERY_STATUS_DISCHARGING -> "discharging"
      BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "not_charging"
      BatteryManager.BATTERY_STATUS_FULL -> "full"
      else -> "unknown"
    }
  }
}

// Stream handler for continuous battery updates
class BatteryStreamHandler(private val context: Context) : EventChannel.StreamHandler {
  private var eventSink: EventChannel.EventSink? = null
  private var batteryReceiver: BatteryReceiver? = null

  override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
    eventSink = events
    batteryReceiver = BatteryReceiver(eventSink!!)
    val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    context.registerReceiver(batteryReceiver, ifilter)
  }

  override fun onCancel(arguments: Any?) {
    context.unregisterReceiver(batteryReceiver)
    eventSink = null
  }
}

// Broadcast receiver for battery changes
class BatteryReceiver(private val eventSink: EventChannel.EventSink) : android.content.BroadcastReceiver() {
  override fun onReceive(context: Context?, intent: Intent?) {
    val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    eventSink.success(level)
  }
}
```

**Important Kotlin concepts:**
- `FlutterPlugin` interface implement करते हो
- `MethodChannel` में handler register करते हो
- `EventChannel` में `StreamHandler` register करते हो
- **Threading**: Android main thread blocking नहीं करना चाहिए। Heavy operations के लिए `Handler(Looper.getMainLooper())` या thread pool use करो

### Step 4: Android Gradle Dependencies (android/build.gradle)

```gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 33
    }
}

dependencies {
    // Android framework मात्र ही चाहिए, कोई extra dependency नहीं
}
```

### Step 5: iOS Native Code (Swift)

`ios/Classes/BatteryMonitorPlugin.swift`:

```swift
import Flutter
import UIKit

public class BatteryMonitorPlugin: NSObject, FlutterPlugin {
  public static func dummy(methodCall: FlutterMethodCall) {}
  
  public static func register(with registrar: FlutterPluginRegistry) {
    // iOS 12+ में यह automatically register होता है
  }
  
  public static func dummyMethodToEnforceBundling() {
    // Bundler को dummy method दिखाना पड़ता है
  }
}

// MARK: - Method Channel Handler
public class BatteryMonitorMethodHandler: NSObject, FlutterPlugin {
  public static func dummyMethodToEnforceBundling() {}
  
  public static func register(with registrar: FlutterPluginRegistry) {
    let methodChannel = FlutterMethodChannel(
      name: "com.example.battery_monitor/battery",
      binaryMessenger: registrar.messenger()
    )
    let eventChannel = FlutterEventChannel(
      name: "com.example.battery_monitor/battery_stream",
      binaryMessenger: registrar.messenger()
    )
    
    let handler = BatteryMonitorMethodHandler()
    methodChannel.setMethodCallHandler(handler.handleMethod)
    eventChannel.setStreamHandler(BatteryStreamHandler())
  }
  
  func handleMethod(call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "getBatteryLevel":
      UIDevice.current.isBatteryMonitoringEnabled = true
      let level = Int(UIDevice.current.batteryLevel * 100)
      result(level)
      
    case "getBatteryStatus":
      UIDevice.current.isBatteryMonitoringEnabled = true
      let status = getBatteryStatus()
      result(status)
      
    default:
      result(FlutterMethodNotImplemented)
    }
  }
  
  private func getBatteryStatus() -> String {
    let state = UIDevice.current.batteryState
    switch state {
    case .charging:
      return "charging"
    case .discharging:
      return "discharging"
    case .full:
      return "full"
    default:
      return "unknown"
    }
  }
}

// MARK: - Event Channel Handler
class BatteryStreamHandler: NSObject, FlutterStreamHandler {
  private var batteryObserver: NSObjectProtocol?
  
  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    UIDevice.current.isBatteryMonitoringEnabled = true
    
    batteryObserver = NotificationCenter.default.addObserver(
      forName: UIDevice.batteryLevelDidChangeNotification,
      object: nil,
      queue: .main
    ) { _ in
      let level = Int(UIDevice.current.batteryLevel * 100)
      events(level)
    }
    
    return nil
  }
  
  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    if let observer = batteryObserver {
      NotificationCenter.default.removeObserver(observer)
    }
    UIDevice.current.isBatteryMonitoringEnabled = false
    return nil
  }
}
```

### Step 6: iOS CocoaPods Config (ios/battery_monitor.podspec)

```ruby
Pod::Spec.new do |s|
  s.name             = 'battery_monitor'
  s.version          = '0.0.1'
  s.summary          = 'Flutter plugin for battery monitoring'
  s.description      = 'Get battery level and status on iOS and Android'
  s.homepage         = 'https://github.com/yourusername/battery_monitor'
  s.license          = { :file => '../LICENSE' }
  s.author           = { 'Your Name' => 'your.email@example.com' }
  s.source           = { :path => '.' }
  s.source_files     = 'Classes/**/*'
  s.public_header_files = 'Classes/**/*.h'
  
  s.platform         = :ios, '11.0'
  s.ios.deployment_target = '11.0'
  
  # Swift version
  s.swift_version = '5.0'
end
```

### Step 7: Example App (example/lib/main.dart)

```dart
import 'package:flutter/material.dart';
import 'package:battery_monitor/battery_monitor.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Battery Monitor',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const BatteryPage(),
    );
  }
}

class BatteryPage extends StatefulWidget {
  const BatteryPage({Key? key}) : super(key: key);

  @override
  State<BatteryPage> createState() => _BatteryPageState();
}

class _BatteryPageState extends State<BatteryPage> {
  int _batteryLevel = 0;
  String _batteryStatus = 'unknown';
  late StreamSubscription<int> _batteryStream;

  @override
  void initState() {
    super.initState();
    _updateBatteryLevel();
    _updateBatteryStatus();
    
    // Stream को listen करो continuous updates के लिए
    _batteryStream = BatteryMonitor.getBatteryLevelStream().listen(
      (level) {
        setState(() => _batteryLevel = level);
      },
      onError: (error) => print('Stream error: $error'),
    );
  }

  Future<void> _updateBatteryLevel() async {
    try {
      final level = await BatteryMonitor.getBatteryLevel();
      setState(() => _batteryLevel = level);
    } catch (e) {
      print('Error: $e');
    }
  }

  Future<void> _updateBatteryStatus() async {
    try {
      final status = await BatteryMonitor.getBatteryStatus();
      setState(() => _batteryStatus = status);
    } catch (e) {
      print('Error: $e');
    }
  }

  @override
  void dispose() {
    _batteryStream.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Battery Monitor')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Battery Level',
              style: Theme.of(context).textTheme.headline5,
            ),
            Text(
              '$_batteryLevel%',
              style: Theme.of(context).textTheme.headline2?.copyWith(
                color: _batteryLevel > 30 ? Colors.green : Colors.red,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Status: $_batteryStatus',
              style: Theme.of(context).textTheme.headline6,
            ),
            const SizedBox(height: 30),
            ElevatedButton(
              onPressed: () {
                _updateBatteryLevel();
                _updateBatteryStatus();
              },
              child: const Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## Threading & Async Handling: ANR Avoid करना

**ANR (Application Not Responding)** — जब Android का main thread 5 seconds से ज़्यादा block हो जाए।

### The Problem:
```dart
// ❌ WRONG: Dart में heavy sync work करना
final result = await BatteryMonitor.getBatteryLevel();
// Agar native code main thread block करे तो ANR!
```

### The Solution: Native Thread Pool

**Android (Kotlin):**
```kotlin
import java.util.concurrent.Executors

private val executor = Executors.newFixedThreadPool(2)

override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    methodChannel = MethodChannel(binding.binaryMessenger, "com.example.battery_monitor/battery")
    methodChannel.setMethodCallHandler { call, result ->
      when (call.method) {
        "getHeavyData" -> {
          // ❌ WRONG:
          // val data = doHeavyWork() // Main thread block होगा
          
          // ✅ RIGHT: Background thread पर काम करो
          executor.execute {
            val data = doHeavyWork()
            // Main thread पर वापस जाके result भेजो
            Handler(Looper.getMainLooper()).post {
              result.success(data)
            }
          }
        }
        else -> result.notImplemented()
      }
    }
}

private fun doHeavyWork(): String {
  Thread.sleep(2000) // Simulate heavy work
  return "Data ready!"
}
```

**iOS (Swift):**
```swift
func handleMethod(call: FlutterMethodCall, result: @escaping FlutterResult) {
  switch call.method {
  case "getHeavyData":
    // ❌ WRONG:
    // let data = doHeavyWork() // Main thread block होगा
    
    // ✅ RIGHT: Background thread पर काम करो
    DispatchQueue.global(qos: .userInitiated).async {
      let data = self.doHeavyWork()
      // Main thread पर वापस जाके result भेजो
      DispatchQueue.main.async {
        result(data)
      }
    }
  default:
    result(FlutterMethodNotImplemented)
  }
}

private func doHeavyWork() -> String {
  Thread.sleep(forTimeInterval: 2.0)
  return "Data ready!"
}
```

---

## Performance Tuning: Native Code का Overhead

Native code call करना fast है, पर अगर बार-बार करो तो expensive हो सकता है।

### Benchmark: Method Call vs Direct Dart

```
100 calls to getBatteryLevel():
  Native: ~50ms (0.5ms per call)
  Pure Dart: ~2ms
  
Overhead per call: ~0.48ms (negligible for most apps)
```

### Performance Best Practices:

**1. Batch Calls करो:**
```dart
// ❌ WRONG: 100 बार call करना
for (int i = 0; i < 100; i++) {
  await BatteryMonitor.getBatteryLevel();
}

// ✅ RIGHT: Single call with loop in native code
final List<int> levels = await BatteryMonitor.getBatteryLevelsBatch(100);
```

**2. Caching Use करो:**
```dart
class BatteryMonitor {
  static int? _cachedLevel;
  static DateTime? _cachedTime;
  static const _cacheDuration = Duration(seconds: 5);

  static Future<int> getBatteryLevel({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedLevel != null && _cachedTime != null) {
      if (DateTime.now().difference(_cachedTime!).inSeconds < _cacheDuration.inSeconds) {
        return _cachedLevel!;
      }
    }

    final level = await platform.invokeMethod('getBatteryLevel');
    _cachedLevel = level;
    _cachedTime = DateTime.now();
    return level;
  }
}
```

**3. Streams का सही तरीक़ा use करो:**
```dart
// ❌ WRONG: हर second call करना
Timer.periodic(Duration(seconds: 1), (_) {
  BatteryMonitor.getBatteryLevel();
});

// ✅ RIGHT: Native stream को listen करो
BatteryMonitor.getBatteryLevelStream().listen((level) {
  print('Battery: $level%');
});
```

---

## Real-World Example: Google ML Kit Face Detection Plugin

Ab एक production-grade example करते हैं — **face_detection** plugin जो Google ML Kit use करता है।

### Step 1: Dart API (lib/face_detection.dart)

```dart
import 'dart:typed_data';
import 'package:flutter/services.dart';

class Face {
  final double x;
  final double y;
  final double width;
  final double height;
  final double confidence;

  Face({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.confidence,
  });

  factory Face.fromMap(Map<dynamic, dynamic> map) {
    return Face(
      x: map['x'].toDouble(),
      y: map['y'].toDouble(),
      width: map['width'].toDouble(),
      height: map['height'].toDouble(),
      confidence: map['confidence'].toDouble(),
    );
  }
}

class FaceDetection {
  static const platform = MethodChannel('com.example.face_detection/faces');

  static Future<List<Face>> detectFaces(Uint8List imageBytes) async {
    try {
      final List<dynamic> result = await platform.invokeMethod(
        'detectFaces',
        {'imageBytes': imageBytes},
      );

      return result.map((dynamic face) => Face.fromMap(face as Map<dynamic, dynamic>)).toList();
    } catch (e) {
      throw 'Face detection failed: $e';
    }
  }
}
```

### Step 2: Android (Kotlin + ML Kit)

`android/build.gradle`:
```gradle
dependencies {
    // ML Kit dependency
    implementation 'com.google.mlkit:face-detection:16.1.5'
}
```

`android/src/main/kotlin/.../FaceDetectionPlugin.kt`:
```kotlin
package com.example.face_detection

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.Executors

class FaceDetectionPlugin : FlutterPlugin {
  private lateinit var methodChannel: MethodChannel
  private val executor = Executors.newSingleThreadExecutor()
  private val options = FaceDetectorOptions.Builder()
    .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
    .build()
  private val detector = FaceDetection.getClient(options)

  override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    methodChannel = MethodChannel(binding.binaryMessenger, "com.example.face_detection/faces")
    methodChannel.setMethodCallHandler { call, result ->
      if (call.method == "detectFaces") {
        val imageBytes = call.argument<ByteArray>("imageBytes")
        if (imageBytes != null) {
          detectFacesAsync(imageBytes, result)
        } else {
          result.error("INVALID_ARG", "imageBytes required", null)
        }
      } else {
        result.notImplemented()
      }
    }
  }

  private fun detectFacesAsync(imageBytes: ByteArray, result: MethodChannel.Result) {
    executor.execute {
      try {
        val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        val image = InputImage.fromBitmap(bitmap, 0)

        detector.process(image)
          .addOnSuccessListener { faces ->
            val faceList = faces.map { face ->
              mapOf(
                "x" to face.boundingBox.left,
                "y" to face.boundingBox.top,
                "width" to face.boundingBox.width(),
                "height" to face.boundingBox.height(),
                "confidence" to (face.trackingId?.toFloat() ?: 0.0f)
              )
            }
            result.success(faceList)
          }
          .addOnFailureListener { e ->
            result.error("DETECTION_ERROR", e.message, null)
          }
      } catch (e: Exception) {
        result.error("DECODE_ERROR", e.message, null)
      }
    }
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    methodChannel.setMethodCallHandler(null)
    detector.close()
    executor.shutdown()
  }
}
```

### Step 3: iOS (Swift + ML Kit)

`ios/Podfile`:
```ruby
target 'Runner' do
  flutter_root = File.expand_path(File.join(packages_dir, 'flutter'))
  load File.join(flutter_root, 'packages', 'flutter_tools', 'bin', 'podhelper.rb')

  flutter_ios_podfile_setup

  # Add ML Kit dependency
  pod 'GoogleMLKit/FaceDetection'
end
```

`ios/Classes/FaceDetectionPlugin.swift`:
```swift
import Flutter
import MLKitVision
import MLKitFaceDetection

public class FaceDetectionPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistry) {
    let methodChannel = FlutterMethodChannel(
      name: "com.example.face_detection/faces",
      binaryMessenger: registrar.messenger()
    )
    let handler = FaceDetectionMethodHandler()
    methodChannel.setMethodCallHandler(handler.handle)
  }
  
  public static func dummyMethodToEnforceBundling() {}
}

class FaceDetectionMethodHandler: NSObject {
  private let faceDetector = FaceDetector.faceDetector(
    options: FaceDetectorOptions()
  )

  func handle(call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "detectFaces":
      guard let args = call.arguments as? [String: Any],
            let imageBytes = args["imageBytes"] as? FlutterStandardTypedData else {
        result(FlutterError(code: "INVALID_ARG", message: "imageBytes required", details: nil))
        return
      }

      detectFacesAsync(imageBytes.data, result: result)

    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func detectFacesAsync(_ imageData: Data, result: @escaping FlutterResult) {
    DispatchQueue.global(qos: .userInitiated).async {
      guard let uiImage = UIImage(data: imageData) else {
        result(FlutterError(code: "DECODE_ERROR", message: "Failed to decode image", details: nil))
        return
      }

      let visionImage = VisionImage(image: uiImage)
      
      var faces: [[String: Any]] = []
      do {
        let detectedFaces = try self.faceDetector.results(in: visionImage)
        
        for face in detectedFaces {
          let frame = face.frame
          faces.append([
            "x": frame.origin.x,
            "y": frame.origin.y,
            "width": frame.size.width,
            "height": frame.size.height,
            "confidence": face.smilingProbability
          ])
        }

        DispatchQueue.main.async {
          result(faces)
        }
      } catch let error {
        DispatchQueue.main.async {
          result(FlutterError(code: "DETECTION_ERROR", message: error.localizedDescription, details: nil))
        }
      }
    }
  }
}
```

### Step 4: Example App

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:face_detection/face_detection.dart';

class FaceDetectionPage extends StatefulWidget {
  @override
  State<FaceDetectionPage> createState() => _FaceDetectionPageState();
}

class _FaceDetectionPageState extends State<FaceDetectionPage> {
  File? _selectedImage;
  List<Face> _detectedFaces = [];
  bool _isDetecting = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    
    if (pickedFile != null) {
      setState(() => _selectedImage = File(pickedFile.path));
      _detectFaces();
    }
  }

  Future<void> _detectFaces() async {
    if (_selectedImage == null) return;

    setState(() => _isDetecting = true);
    try {
      final bytes = await _selectedImage!.readAsBytes();
      final faces = await FaceDetection.detectFaces(bytes);
      setState(() => _detectedFaces = faces);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Detection error: $e')),
      );
    } finally {
      setState(() => _isDetecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Face Detection')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_selectedImage != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(_selectedImage!),
            ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _pickImage,
            icon: const Icon(Icons.image),
            label: const Text('Pick Image'),
          ),
          const SizedBox(height: 16),
          if (_isDetecting)
            const Center(child: CircularProgressIndicator())
          else if (_detectedFaces.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Faces Detected: ${_detectedFaces.length}',
                  style: Theme.of(context).textTheme.headline6,
                ),
                const SizedBox(height: 12),
                ..._detectedFaces.asMap().entries.map((entry) {
                  final face = entry.value;
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Face ${entry.key + 1}'),
                          Text('Position: (${face.x.toStringAsFixed(0)}, ${face.y.toStringAsFixed(0)})'),
                          Text('Size: ${face.width.toStringAsFixed(0)}x${face.height.toStringAsFixed(0)}'),
                          Text('Confidence: ${(face.confidence * 100).toStringAsFixed(0)}%'),
                        ],
                      ),
                    ),
                  );
                })
              ],
            )
          else
            Text(
              'No faces detected',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
        ],
      ),
    );
  }
}
```

---

## Debugging Native Code

### Android Debugging

```bash
# Kotlin code को logcat में देखो
adb logcat | grep "flutter"

# Or Android Studio मein:
# 1. Run -> Attach Debugger to Android Process
# 2. Device + package select करो
# 3. Kotlin code मein breakpoint लगा

# Logcat से print करना:
Log.d("FaceDetection", "Detected ${faces.size} faces")
```

**Dart से native code को call करते समय error handle करो:**
```dart
try {
  final faces = await FaceDetection.detectFaces(bytes);
} on PlatformException catch (e) {
  print('Native error: ${e.code}'); // "DETECTION_ERROR"
  print('Message: ${e.message}'); // "Failed to decode image"
  print('Details: ${e.details}');
}
```

### iOS Debugging

```bash
# Xcode में:
# 1. Xcode -> Product -> Scheme -> Edit Scheme
# 2. Diagnostics tab -> Enable NSLog
# 3. Run करो

# Or Swift code मein print():
print("Detected \(faces.count) faces")
```

**Real-world debugging strategy:**
```dart
import 'dart:developer' as developer;

Future<List<Face>> detectFacesWithDebug(Uint8List imageBytes) async {
  developer.Timeline.startSync('face_detection');
  
  try {
    final faces = await FaceDetection.detectFaces(imageBytes);
    developer.Timeline.finishSync();
    return faces;
  } catch (e) {
    developer.Timeline.finishSync();
    developer.log('Detection failed: $e');
    rethrow;
  }
}
```

---

## WebView Integration: Native Web Content

Kabhi-kabhi web content को native mein render करना पड़ता है। जैसे payment gateway या documentation।

**Dart side:**
```dart
import 'package:webview_flutter/webview_flutter.dart';

class WebViewPlugin extends StatefulWidget {
  @override
  State<WebViewPlugin> createState() => _WebViewPluginState();
}

class _WebViewPluginState extends State<WebViewPlugin> {
  late WebViewController _webViewController;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xffffffff))
      ..loadRequest(
        Uri.parse('https://example.com'),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('WebView')),
      body: WebViewWidget(controller: _webViewController),
    );
  }
}
```

**Method channel से JavaScript को call करना:**
```dart
await _webViewController.runJavaScript(
  '''
  window.paymentGateway = {
    pay: function(amount) {
      console.log('Paying ' + amount);
    }
  };
  '''
);

// Native handler से JS result लेना:
final result = await _webViewController.runJavaScriptReturningResult(
  'document.title'
);
```

---

## Publishing Plugin to Pub.dev

Pub.dev पर plugin publish करने से पहले:

### Step 1: pubspec.yaml ठीक करो

```yaml
name: face_detection
description: ML Kit-based face detection plugin for Flutter.
version: 1.0.0
homepage: https://github.com/yourusername/face_detection
repository: https://github.com/yourusername/face_detection

environment:
  sdk: ">=2.17.0 <4.0.0"
  flutter: ">=3.0.0"

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  plugin:
    platforms:
      android:
        package: com.example.face_detection
        pluginClass: FaceDetectionPlugin
      ios:
        pluginClass: FaceDetectionPlugin
```

### Step 2: README.md लिखो (Installation + Usage Example)

```markdown
# Face Detection Plugin

ML Kit face detection for Flutter.

## Installation

```yaml
dependencies:
  face_detection: ^1.0.0
```

## Usage

```dart
import 'package:face_detection/face_detection.dart';

final faces = await FaceDetection.detectFaces(imageBytes);
for (final face in faces) {
  print('Face at (${face.x}, ${face.y})');
}
```
```

### Step 3: LICENSE फ़ाइल (MIT recommended)

```
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

### Step 4: Publish करो

```bash
# First time publish करने से पहले login करो
dart pub login

# Publish करो
cd path/to/face_detection
flutter pub pub publish

# या:
dart pub publish
```

**Pub.dev guidelines:**
- Plugin का नाम unique होना चाहिए
- Changelog update करो (version changes)
- Documentation comprehensive होनी चाहिए
- Example app working होनी चाहिए
- License explicitly mention करो

---

## Common Pitfalls & Solutions

### 1. "MissingPluginException"

```
❌ Error: MissingPluginException(No implementation found for method getBatteryLevel)
```

**Reason**: Plugin अभी install नहीं हुई या rebuild करना पड़ा।

**Solution**:
```bash
flutter clean
flutter pub get
flutter run
```

### 2. "Unhandled Exception: FileSystemException"

```kotlin
// ❌ WRONG: File system operations को block करते हो
val data = File("/sdcard/image.jpg").readBytes()

// ✅ RIGHT: Background thread पर करो
DispatchQueue.global().async {
  let data = try Data(contentsOf: url)
  DispatchQueue.main.async {
    result(data)
  }
}
```

### 3. Memory Leaks

```kotlin
// ❌ WRONG: Event receiver को unregister नहीं करते
override fun onListen(args: Any?, events: EventChannel.EventSink?) {
  context.registerReceiver(receiver, filter)
  // 🔴 onCancel नहीं है!
}

// ✅ RIGHT: Cleanup करो
override fun onCancel(args: Any?) {
  context.unregisterReceiver(receiver)
}
```

### 4. Null Safety Issues

```dart
// ❌ WRONG: Null check नहीं करते
final result = await platform.invokeMethod('getData');
print(result.length); // Runtime error अगर result null हो

// ✅ RIGHT: Null safety maintain करो
final result = await platform.invokeMethod<String>('getData');
if (result != null) {
  print(result.length);
} else {
  print('No data returned');
}
```

---

## Architecture Diagram: Plugin Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Flutter App (Dart Code)                                     │
│                                                              │
│  Future<List<Face>> faces =                                 │
│    await FaceDetection.detectFaces(imageBytes);             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ (Method Channel)
                       │ imageBytes serialized
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ↓                             ↓
    ┌────────────┐            ┌────────────┐
    │ Android    │            │ iOS        │
    │ (Kotlin)   │            │ (Swift)    │
    │            │            │            │
    │ ML Kit     │            │ ML Kit     │
    │ FaceDetector            │ FaceDetector
    └────────────┘            └────────────┘
        ↓                             ↓
    Detect faces               Detect faces
        ↓                             ↓
    ┌────────────┐            ┌────────────┐
    │ List<Map>  │            │ List<Map>  │
    │ serialized │            │ serialized │
    └────────────┘            └────────────┘
        └──────────────┬──────────────┘
                       │
                       ↓ (Result serialized)
                       │
┌──────────────────────┴──────────────────────────────────────┐
│ Flutter App (Dart Code)                                     │
│                                                              │
│  List<Face> = List.from(result).map(Face.fromMap).toList()  │
│  → setState() → rebuild UI                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Performance Checklist

| Task | Performance | Best Practice |
|------|-------------|---|
| Battery level read | ~0.5ms | Cache results, use streams |
| Face detection (image) | ~200-500ms | Background thread, batch processing |
| File operations | ~10-50ms | Use buffering, avoid sync calls |
| Sensor reads | Real-time | Stream subscribers, not polling |
| Native → Dart callback | ~1-2ms overhead | Batch callbacks जहाँ possible हो |

---

## Key Takeaways

- **Plugin architecture** — Dart ↔ Platform Channel ↔ Native code — bridge है data के लिए
- **MethodChannel** one-off calls के लिए; **EventChannel** continuous streams के लिए
- **Android threading** — Heavy work को background thread पर करो, ANR avoid करने के लिए; `Executors.newFixedThreadPool()` use करो
- **iOS threading** — `DispatchQueue.global()` पर heavy work, `DispatchQueue.main` पर UI updates
- **Caching** — Native calls expensive हैं relatively; cache करो जहाँ possible हो
- **Batch operations** — 100 calls की जगह 1 call with loop करो native code में
- **Streams** — Continuous updates के लिए EventChannel बेहतर है polling से
- **Error handling** — PlatformException catch करो aur user-friendly message दो
- **Memory cleanup** — onCancel में receivers/observers unregister करो, memory leaks avoid करने के लिए
- **Pub.dev publishing** — LICENSE, README, example app सब होनी चाहिए; `dart pub publish` से upload करो
- **ML Kit** — Google ML Kit native SDKs के लिए excellent है; face detection, text recognition, etc.
- **Debugging** — Logcat (Android) aur Xcode console (iOS) में logs देखो; PlatformException से error info मिलता है
- **WebView** — Native web content के लिए `webview_flutter` package use करो; JavaScript ↔ Dart communication possible है
- **Gradle & CocoaPods** — Android dependencies `android/build.gradle` में, iOS dependencies `Podfile` में add करते हो

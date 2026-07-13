# Deployment और CI/CD — Play Store, App Store, GitHub Actions, FastLane

Socho ek second ke liye — jab tum Zomato app chalate ho, wo ki sirf ek simple build hota hai jo market mein aata hai? Bilkul nahi! Behind the scenes har release ke liye signing keys hote hain, version management hote hain, automated testing and building hote hain. Aur agar kisi release mein bug lage to rollback karna padta hai.

Yeh chapter mein dekthenge:
- **Android build process** (APK और AAB kya hota hai)
- **iOS build process** (IPA और TestFlight)
- **Store submissions** (Play Store, App Store)
- **Versioning strategies** (semantic versioning, build numbers)
- **CI/CD pipelines** (GitHub Actions se fully automated)
- **FastLane** (automation ka boss)
- **Real production example** (har tag pe automatically deploy)
- **Beta releases और monitoring**
- **Rollbacks** (jab plans fail ho jayein)

---

## Understanding Build Artifacts — APK, AAB, IPA

Mobile apps ko publish karne se pehle, hum different formats mein build karte hain. Node.js/Express mein tum `npm run build` karke compiled code mil jaata hai. Mobile mein bhi same concept, bas format different hote hain.

### Android: APK vs AAB

**APK (Android Package)** = ek single file jo user directly install kar sakta hai. Pehle time mein, Play Store pe APK files upload hote the. But ab Google ne AAB introduce kiya.

**AAB (Android App Bundle)** = modern way. Google Play Console ye file accept karta hai, aur internally isey device-specific APKs mein split karke deliver karta hai. Isse app ka size kam rehta hai user ke device pe.

**Analogy**: Mano Zomato ne ordering feature hai. Pehle Zomato poora restaurant menu ke saath apko app de deta tha (APK — poori build). Ab Zomato tujhe sirf wo dishes deता है jo teri city/cuisine preference mein hain (AAB — optimized delivery).

### iOS: IPA और Provisioning

**IPA (iOS App Package)** = single file jo iOS app represent karta hai. But directly install nahi kar sakte. Provisioning profiles, certificates, aur app signing keys zaroori hote hain.

**TestFlight** = Apple ka beta distribution tool. Production mein jाne se pehle internal testers ko beta version de sakte ho.

---

## Android Release Build — APK और AAB Creation

### Step 1: Signing Key Setup

Release build banane se pehle, tujhe ek signing key create karni padti hai. Yeh key permanent rahne wali cheez hai — isko securely rakhna zaroori hai kyunki isi se future updates sign hote hain.

```bash
# Signing key create kar (first time only)
keytool -genkey -v -keystore ~/release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release-key

# Yeh command prompt karega:
# - Keystore password
# - Key password
# - Name, organization, city, country details
```

**Important**: `release-key.jks` ko `.gitignore` mein add kar. **Kabhi GitHub pe commit mat kar**. Yeh like tere database password hota hai.

### Step 2: Flutter pubspec.yaml Setup

```yaml
# pubspec.yaml

name: zomato_clone
description: A Zomato clone app in Flutter.
publish_to: 'none'

version: 1.0.0+1
# version format: major.minor.patch+buildNumber
# 1.0.0 = app version (user ko dikhta hai)
# +1 = build number (internal counter, har release mein badhta hai)

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  riverpod: ^2.4.0
  # ... other deps
```

### Step 3: Build Release APK

```bash
cd flutter_app

# APK (single file, for direct installation or testing)
flutter build apk \
  --release \
  --target-platform android-arm64,android-arm,android-x86_64

# Output mil jaega: build/app/outputs/apk/release/app-release.apk
```

### Step 4: Build AAB (for Play Store)

```bash
# AAB (recommended for Play Store)
flutter build appbundle \
  --release \
  --target-platform android-arm64,android-arm,android-x86_64

# Output: build/app/outputs/bundle/release/app-release.aab
```

**Key difference**:
- **APK**: Fast to build, direct install, larger filesize
- **AAB**: Smaller per-device, Google Play Console mein submit karte ho

### Step 5: Signing Configuration (automated)

```bash
# Manual way (not recommended for CI/CD):
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore ~/release-key.jks \
  build/app/outputs/bundle/release/app-release.aab \
  release-key
```

**Better way** — Flutter ke built-in signing use kar. Create `android/key.properties`:

```properties
# android/key.properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=release-key
storeFile=/path/to/release-key.jks
```

Phir `android/app/build.gradle` mein:

```gradle
// android/app/build.gradle

def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
  // ...
  
  signingConfigs {
    release {
      keyAlias keystoreProperties['keyAlias']
      keyPassword keystoreProperties['keyPassword']
      storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
      storePassword keystoreProperties['storePassword']
    }
  }

  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

Ab `flutter build appbundle --release` automatically sign kar dega.

---

## iOS Release Build — IPA और TestFlight

### Step 1: Create App ID aur Certificates

iOS is **way more complex** than Android. Apple ne strict provisioning requirements rakhe hain.

```bash
# Xcode mein manually ya command line se:
# 1. Apple Developer Account mein login kar
# 2. Create App ID (unique identifier like com.zomato.clone)
# 3. Create Distribution Certificate
# 4. Create Provisioning Profile (distribution type)
# 5. Download certificates aur profiles
```

**Better approach** — Xcode automatically handle kar.

### Step 2: Flutter pubspec.yaml (already done above)

Same `version: 1.0.0+1` format used for iOS too.

### Step 3: Build Release IPA

```bash
flutter build ipa \
  --release \
  --export-options-template

# Yeh command generate karega:
# build/ios/ipa/ExportOptions.plist
```

Edit `ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>method</key>
  <string>app-store</string>
  <!-- app-store for App Store, ad-hoc for testing -->
</dict>
</plist>
```

Build with export options:

```bash
flutter build ipa \
  --release \
  --export-options-plist=build/ios/ipa/ExportOptions.plist
```

Output: `build/ios/ipa/Zomato.ipa`

### Step 4: Upload to TestFlight (Beta)

```bash
# Using Transporter (Apple's official tool)
xcrun altool --upload-app \
  --file build/ios/ipa/Zomato.ipa \
  --type ios \
  -u YOUR_APPLE_ID \
  -p YOUR_APP_SPECIFIC_PASSWORD

# Or using Xcode direct upload
# Open Organizer > select build > Distribute App > TestFlight
```

TestFlight pe upload hone ke baad:
1. Internal testers ko immediately access mil jaata hai
2. External testers ko Apple se approval mil jane ke baad access mil jaata hai (~48 hours)

---

## Version Management — pubspec.yaml Version Format

```yaml
version: 1.0.0+1
        ^ ^ ^  ^
        | | |  |
        | | |  build number (har build mein increment)
        | | patch version (bug fixes)
        | minor version (new features)
        major version (breaking changes)
```

**Semantic Versioning best practices**:

```yaml
# 0.0.1+1   - Alpha/Early development
# 0.1.0+5   - Beta (multiple builds)
# 1.0.0+1   - First production release
# 1.1.0+15  - Minor feature release
# 1.1.1+16  - Bug fix release
# 2.0.0+1   - Major breaking change
```

**Dart code mein version access kar**:

```dart
// pubspec.yaml se read karne ke liye, package_info_plus use kar

import 'package:package_info_plus/package_info_plus.dart';

void printAppVersion() async {
  PackageInfo packageInfo = await PackageInfo.fromPlatform();
  
  print('App Name: ${packageInfo.appName}');           // "Zomato Clone"
  print('Version: ${packageInfo.version}');             // "1.0.0"
  print('Build Number: ${packageInfo.buildNumber}');    // "1"
}
```

**CI/CD mein automatically update karna** (later in GitHub Actions section):

```bash
#!/bin/bash
# Bash script jo build number increment kare

# pubspec.yaml se current version read kar
CURRENT_VERSION=$(grep "^version:" pubspec.yaml | sed 's/.*: //' | cut -d'+' -f1)
CURRENT_BUILD=$(grep "^version:" pubspec.yaml | sed 's/.*+//')

# Increment build number
NEW_BUILD=$((CURRENT_BUILD + 1))
NEW_VERSION="${CURRENT_VERSION}+${NEW_BUILD}"

# Update pubspec.yaml
sed -i "s/^version:.*/version: ${NEW_VERSION}/" pubspec.yaml
```

---

## Play Store Setup और App Submission

### Step 1: Google Play Console Register

```
1. https://play.google.com/console mein ja
2. Create new app
3. App name, default language, app category fill kar
4. App type (Games, Apps) select kar
```

### Step 2: App Signing Setup

Google Play Console ke paas ek special feature hai — **Google Play App Signing**. 

```
Flow:
┌─────────────────────┐
│ Your Signing Key    │
│ (release-key.jks)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Upload to          │
│  Play Console       │
│  (AAB file)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Google re-signs     │
│ with Play key       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Optimized APKs      │
│ delivered to users  │
└─────────────────────┘
```

First upload mein:
1. Play Console se SHA-1 fingerprint note kar
2. Har future update mein same key se sign karna (nahi to update nahi hoga)

### Step 3: Create App Store Listing

```
Play Console > All apps > [Your App] > 
  - Manage app details
  - Add app icon, screenshots, description
  - Add privacy policy URL
  - Content rating (IARC form bharna padta hai)
  - Pricing & distribution settings
```

### Step 4: Upload AAB

```
Play Console > Releases > Internal Testing > Create Release
  1. Upload app-release.aab
  2. Add release notes
  3. Review app content
  4. Start rollout (% users ko gradually roll out kar sakte ho)
```

**Stages**:
1. **Internal Testing** — sirf dev team
2. **Closed Testing** — limited external users
3. **Open Testing** — public beta
4. **Production** — sab ko available

---

## App Store Setup और iOS Submission

### Step 1: App Store Connect Register

```
1. https://appstoreconnect.apple.com mein ja
2. Create new app
3. Bundle ID (com.yourcompany.appname) set kar
4. SKU (unique identifier for your records)
```

### Step 2: App Store Listing Fill

```
App Store Connect > [Your App] >
  - App information (name, subtitle, description)
  - Screenshots (6+ images per device type)
  - Keywords
  - Support URL, privacy policy
  - Rating (age rating)
```

### Step 3: Build, Version, Release

```
App Store Connect > TestFlight > iOS Builds
  1. Upload IPA from Xcode Organizer
  2. Export Compliance questionnaire bharna padta hai
  3. Build processing (~5-10 mins)
```

### Step 4: App Review Submit

```
App Store Connect > Version Release > Submit for Review
  - Review guidelines check kar (Apple bahut strict hai)
  - App privacy policy valid hona zaroori hai
  - App ka functionality clear hona zaroori hai
```

**Approval timeline**: Typically 24-48 hours, par kabhí zyada bhi lag sakta hai.

---

## CI/CD with GitHub Actions — Automated Builds

Ab tak manual process tha. Ab automate kar dete hain.

### Full Workflow: GitHub Actions Setup

Yeh workflow tar ke kar denge:
1. **On tag push** (e.g., `v1.0.0`), automatically build kare
2. **Tests run** kare
3. **Build APK/AAB aur IPA** kare
4. **Play Store/App Store ko push** kare

**Create `.github/workflows/deploy.yml`**:

```yaml
name: Build and Deploy

on:
  push:
    tags:
      - 'v*'  # Triggers on v1.0.0, v1.0.1, etc.

env:
  FLUTTER_VERSION: '3.16.5'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run tests
        run: flutter test
      
      - name: Extract version from tag
        id: version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "build_number=$(echo $VERSION | tr '.' ' ' | awk '{print $1*1000+$2*100+$3}')" >> $GITHUB_OUTPUT

      - name: Update pubspec.yaml version
        run: |
          sed -i 's/version: .*/version: ${{ steps.version.outputs.version }}+${{ steps.version.outputs.build_number }}/' pubspec.yaml

  build-android:
    needs: build-and-test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Get dependencies
        run: flutter pub get

      - name: Setup signing key
        run: |
          echo "${{ secrets.ANDROID_SIGNING_KEY }}" | base64 -d > ~/release-key.jks
          echo "storePassword=${{ secrets.STORE_PASSWORD }}" >> android/key.properties
          echo "keyPassword=${{ secrets.KEY_PASSWORD }}" >> android/key.properties
          echo "keyAlias=${{ secrets.KEY_ALIAS }}" >> android/key.properties
          echo "storeFile=/home/runner/release-key.jks" >> android/key.properties

      - name: Build AAB
        run: flutter build appbundle --release

      - name: Upload to Play Store (Closed Testing)
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.example.zomato_clone
          releaseFiles: 'build/app/outputs/bundle/release/app-release.aab'
          track: 'internal'  # or 'beta', 'production'
          status: 'draft'    # Auto-promote to production after testing

  build-ios:
    needs: build-and-test
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Get dependencies
        run: flutter pub get

      - name: Setup iOS signing
        env:
          PROVISIONING_PROFILE: ${{ secrets.PROVISIONING_PROFILE }}
          SIGNING_CERTIFICATE: ${{ secrets.SIGNING_CERTIFICATE }}
          SIGNING_CERTIFICATE_PASSWORD: ${{ secrets.SIGNING_CERTIFICATE_PASSWORD }}
        run: |
          # Decode and install certificate
          echo "$SIGNING_CERTIFICATE" | base64 -d > certificate.p12
          security create-keychain -p password build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p password build.keychain
          security import certificate.p12 -k build.keychain -P "$SIGNING_CERTIFICATE_PASSWORD" -A

      - name: Build IPA
        run: |
          flutter build ipa \
            --release \
            --export-options-plist=ios/ExportOptions.plist

      - name: Upload to TestFlight
        uses: yukiarrr/ios-build-action@v1.5.0
        with:
          project-path: ios/Runner.xcodeproj
          p8-base64: ${{ secrets.APP_STORE_CONNECT_P8 }}
          appstore-connect-username: ${{ secrets.APPSTORE_CONNECT_USERNAME }}
          appstore-connect-password: ${{ secrets.APPSTORE_CONNECT_PASSWORD }}
          app-id: com.example.zomato_clone
          bundle-id: com.example.zomato_clone

  create-release:
    needs: [build-android, build-ios]
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: |
            ## Release ${{ github.ref_name }}
            
            - Android: Uploaded to Play Store Internal Testing
            - iOS: Uploaded to TestFlight
            - Changelog: See commits since last tag
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### GitHub Secrets Setup

Action ko signing keys pass karne ke liye GitHub Secrets use karte hain:

```
Settings > Secrets and variables > Actions > New repository secret

Secrets to add:
- ANDROID_SIGNING_KEY (base64 encoded release-key.jks)
- STORE_PASSWORD
- KEY_PASSWORD
- KEY_ALIAS
- PLAY_STORE_SERVICE_ACCOUNT (JSON file)
- PROVISIONING_PROFILE
- SIGNING_CERTIFICATE (base64 encoded .p12)
- SIGNING_CERTIFICATE_PASSWORD
- APP_STORE_CONNECT_P8
- APPSTORE_CONNECT_USERNAME
- APPSTORE_CONNECT_PASSWORD
```

**How to encode signing key**:

```bash
# Android key
base64 -i ~/release-key.jks | pbcopy  # macOS
base64 -w 0 ~/release-key.jks | xclip -selection clipboard  # Linux

# iOS certificate
base64 -i ~/certificate.p12 | pbcopy
```

---

## FastLane — Automation का Boss

FastLane ek gem (Ruby tool) hai jo iOS aur Android dono ke liye automated release pipelines setup karte hain. Basically GitHub Actions se bhi zyada powerful.

### FastLane Setup

```bash
# Install (macOS)
sudo gem install fastlane -NV

# Navigate to Flutter project
cd flutter_app

# Initialize FastLane
fastlane init

# Yeh prompt karega:
# 1. What app platform? (iOS / Android / Both)
# 2. Apple ID
# 3. Other credentials
```

### Android FastLane Setup

**Create `android/fastlane/Fastfile`**:

```ruby
default_platform(:android)

platform :android do
  desc "Upload release to Play Store Internal Testing"
  lane :internal_release do
    # Build AAB
    build_app(
      project_dir: ".",
      build_type: "Release",
      task: "bundle",
      export_dir: "../build/app/outputs/"
    )

    # Upload to Play Store
    upload_to_play_store(
      package_name: "com.example.zomato_clone",
      json_key_data: ENV["PLAY_STORE_JSON_KEY"],
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      track: "internal",
      rollout: 0.5  # 50% rollout initially
    )
  end

  desc "Promote internal release to production"
  lane :promote_to_production do
    upload_to_play_store(
      package_name: "com.example.zomato_clone",
      json_key_data: ENV["PLAY_STORE_JSON_KEY"],
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      track: "internal",
      version_code: ENV["VERSION_CODE"],
      skip_upload_aab: true,
      skip_upload_apk: true,
      track_promote_to: "production",
      rollout: 1.0  # Full rollout
    )
  end
end
```

**Run FastLane lane**:

```bash
fastlane android internal_release

# Or with environment variables
PLAY_STORE_JSON_KEY="$(cat ~/.play-store-key.json)" \
  fastlane android internal_release
```

### iOS FastLane Setup

**Create `ios/fastlane/Fastfile`**:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta_release do
    build_app(
      project: "Runner.xcodeproj",
      destination: "generic/platform=iOS",
      configuration: "Release",
      sdk: "iphoneos",
      skip_package_ipa: false,
      output_directory: "../build/ios/ipa",
      export_options: {
        method: "app-store",
        teamID: ENV["APPLE_TEAM_ID"],
        signingStyle: "automatic"
      }
    )

    upload_to_testflight(
      apple_id: ENV["APPLE_ID"],
      app_identifier: "com.example.zomato-clone",
      ipa: "../build/ios/ipa/Zomato.ipa",
      skip_submission: true,
      skip_waiting_for_build_processing: false
    )
  end

  desc "Submit to App Store"
  lane :release do
    upload_to_app_store(
      app_identifier: "com.example.zomato-clone",
      apple_id: ENV["APPLE_ID"],
      ipa: "../build/ios/ipa/Zomato.ipa",
      skip_metadata: false,
      automatic_release: false  # Manual release control
    )
  end
end
```

### FastLane in CI/CD (GitHub Actions)

Update `.github/workflows/deploy.yml` to use FastLane:

```yaml
# ... earlier steps ...

  build-android:
    needs: build-and-test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Setup Ruby for FastLane
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: android
      
      - name: Install FastLane
        run: |
          cd android
          gem install fastlane

      - name: Setup signing key
        run: |
          echo "${{ secrets.ANDROID_SIGNING_KEY }}" | base64 -d > ~/release-key.jks
          echo "storePassword=${{ secrets.STORE_PASSWORD }}" >> android/key.properties
          echo "keyPassword=${{ secrets.KEY_PASSWORD }}" >> android/key.properties
          echo "keyAlias=${{ secrets.KEY_ALIAS }}" >> android/key.properties
          echo "storeFile=/home/runner/release-key.jks" >> android/key.properties

      - name: Run FastLane release
        run: |
          cd android
          fastlane android internal_release
        env:
          PLAY_STORE_JSON_KEY: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
```

---

## Real Production Example — Complete Automated Pipeline

Yeh ek production-ready setup hai jo completely automated hai:

**Flow diagram**:

```
┌──────────────────────┐
│ Developer pushes tag │
│ git tag v1.2.0       │
│ git push origin tag  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│ GitHub Actions Triggers          │
│ (deploy.yml workflow)            │
└──────────┬───────────────────────┘
           │
    ┌──────┴──────┬──────────────┐
    ▼             ▼              ▼
┌─────────┐ ┌─────────┐  ┌──────────┐
│Test     │ │Build    │  │Build     │
│Flutter  │ │Android  │  │iOS       │
│Code     │ │AAB      │  │IPA       │
└────┬────┘ └────┬────┘  └────┬─────┘
     │           │            │
     └─────┬─────┴────┬───────┘
           │          │
           ▼          ▼
    ┌─────────────┬──────────────┐
    │Play Store   │TestFlight    │
    │Internal     │Beta Build    │
    └────┬────────┴────┬─────────┘
         │             │
         ▼             ▼
    ┌─────────────────────────────┐
    │Create GitHub Release        │
    │(with APK/IPA links)         │
    └─────────────────────────────┘
```

**Complete GitHub Actions Workflow (`deploy.yml`)**:

```yaml
name: Release Pipeline

on:
  push:
    tags:
      - 'v*'

env:
  FLUTTER_VERSION: '3.16.5'

jobs:
  setup:
    name: Extract version
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.extract.outputs.version }}
      build_num: ${{ steps.extract.outputs.build_num }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Extract version from tag
        id: extract
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          BUILD_NUM=$(date +%s | cut -c1-5)  # Unix timestamp last 5 digits
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "build_num=${BUILD_NUM}" >> $GITHUB_OUTPUT
          echo "Release: v${VERSION} (build ${BUILD_NUM})"

  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: setup
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run unit tests
        run: flutter test
      
      - name: Analyze code
        run: flutter analyze

  android-release:
    name: Build Android Release
    runs-on: ubuntu-latest
    needs: [setup, test]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Setup JDK
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Update version
        run: |
          sed -i 's/version: .*/version: ${{ needs.setup.outputs.version }}+${{ needs.setup.outputs.build_num }}/' pubspec.yaml

      - name: Setup Android signing
        run: |
          echo "${{ secrets.ANDROID_SIGNING_KEY }}" | base64 -d > $GITHUB_WORKSPACE/keystore.jks
          echo "storePassword=${{ secrets.STORE_PASSWORD }}" >> android/key.properties
          echo "keyPassword=${{ secrets.KEY_PASSWORD }}" >> android/key.properties
          echo "keyAlias=${{ secrets.KEY_ALIAS }}" >> android/key.properties
          echo "storeFile=$GITHUB_WORKSPACE/keystore.jks" >> android/key.properties

      - name: Build AAB
        run: flutter build appbundle --release

      - name: Upload to Play Store (Internal Testing)
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.example.zomato_clone
          releaseFiles: 'build/app/outputs/bundle/release/app-release.aab'
          track: 'internal'
          status: 'draft'
          mappingFile: 'build/app/outputs/mapping/release/mapping.txt'

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: android-aab
          path: build/app/outputs/bundle/release/app-release.aab

  ios-release:
    name: Build iOS Release
    runs-on: macos-latest
    needs: [setup, test]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Update version
        run: |
          sed -i '' 's/version: .*/version: ${{ needs.setup.outputs.version }}+${{ needs.setup.outputs.build_num }}/' pubspec.yaml

      - name: Setup iOS certificates
        env:
          CERTIFICATE_P8: ${{ secrets.IOS_CERTIFICATE_P8 }}
          CERTIFICATE_PASSWORD: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
        run: |
          echo "$CERTIFICATE_P8" | base64 -d > certificate.p12
          security create-keychain -p password build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p password build.keychain
          security import certificate.p12 -k build.keychain -P "$CERTIFICATE_PASSWORD" -A

      - name: Build IPA
        run: |
          flutter build ipa \
            --release \
            --export-options-plist=ios/ExportOptions.plist

      - name: Upload to TestFlight
        uses: yukiarrr/ios-build-action@v1.5.0
        with:
          project-path: ios/Runner.xcodeproj
          p8-base64: ${{ secrets.APPSTORE_CONNECT_P8 }}
          appstore-connect-username: ${{ secrets.APPSTORE_CONNECT_USERNAME }}
          appstore-connect-password: ${{ secrets.APPSTORE_CONNECT_PASSWORD }}
          app-id: ${{ secrets.IOS_APP_ID }}
          team-id: ${{ secrets.APPLE_TEAM_ID }}

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: ios-ipa
          path: build/ios/ipa/Zomato.ipa

  release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    needs: [setup, android-release, ios-release]
    if: success()
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            android-aab/app-release.aab
            ios-ipa/Zomato.ipa
          body: |
            ## v${{ needs.setup.outputs.version }} Release
            
            **Build Number**: ${{ needs.setup.outputs.build_num }}
            **Released**: ${{ github.event.head_commit.timestamp }}
            
            ### Deployment Status
            ✅ Android: Uploaded to Play Store (Internal Testing)
            ✅ iOS: Uploaded to TestFlight
            
            ### Changes
            ${{ github.event.head_commit.message }}
            
            ### Testing
            1. **Android**: Check Play Store Console > Internal Testing > Test on your device
            2. **iOS**: Check TestFlight app, you'll see new build in 5-10 minutes
            
            ### Next Steps
            - Test thoroughly on internal track
            - If approved, promote to beta/production via Play Store Console
          draft: false
          prerelease: ${{ contains(github.ref, 'alpha') || contains(github.ref, 'beta') }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  notify-slack:
    name: Send Slack notification
    runs-on: ubuntu-latest
    needs: [setup, release]
    if: success()
    
    steps:
      - uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "🚀 Release v${{ needs.setup.outputs.version }} deployed!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "🚀 *Release v${{ needs.setup.outputs.version }}*\n\n*Status*: ✅ Deployed to Play Store (Internal) & TestFlight\n*Build*: ${{ needs.setup.outputs.build_num }}\n*Commit*: ${{ github.event.head_commit.message }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**How to trigger release**:

```bash
# Locally
git tag -a v1.2.0 -m "Release v1.2.0: Added order tracking"
git push origin v1.2.0

# Automatically:
# - Tests run
# - Build Android AAB + iOS IPA
# - Upload to Play Store Internal + TestFlight
# - GitHub Release created with artifacts
# - Slack notification sent
# - Done! 🎉
```

---

## Beta Releases और Monitoring

Beta releases kya hote hain? Production se pehle limited users ko new version de dete ho testing ke liye.

### Android: Closed Testing Track

```
Play Console > Internal Testing > Create Release
  │
  ├─ Internal Testing (dev team only)
  ├─ Closed Testing (selected beta users)
  └─ Open Testing (public beta)
```

**Workflow**:

```yaml
# GitHub Actions workflow section (modified)
- name: Upload to Closed Testing
  uses: r0adkll/upload-google-play@v1
  with:
    serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
    packageName: com.example.zomato_clone
    releaseFiles: 'build/app/outputs/bundle/release/app-release.aab'
    track: 'beta'  # Closed testing track
    status: 'inProgress'  # Let humans promote to production
    rollout: 0.25  # 25% rollout to be safe
```

**Promotion to Production**:

```bash
# Manual step (don't automate full production rollout)
fastlane android promote_to_production

# Or via Play Console UI:
# 1. Go to Closed Testing > Latest version
# 2. Click "Promote to Production"
# 3. Select rollout % (start with 25%, then 50%, then 100%)
```

### iOS: TestFlight Management

TestFlight pe upload ke baad:

```
App Store Connect > TestFlight > iOS Builds
  1. Select build
  2. Add beta testers (by email)
  3. They get access in ~5 mins
  4. Monitor crash logs aur performance
```

**Crash reporting in TestFlight**:

```dart
// ios/Runner/GeneratedPluginRegistrant.m mein Sentry add kar
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'https://your-sentry-dsn@sentry.io/project-id';
      options.environment = 'beta';
      options.tracesSampleRate = 1.0;
    },
    appRunner: () => runApp(const ZomatoApp()),
  );
}
```

TestFlight automatically sends crash reports jo tum view kar sakte ho:

```
App Store Connect > TestFlight > Crashes > Review crash logs
```

### Monitoring Metrics

```dart
// Track user analytics in beta
import 'package:firebase_analytics/firebase_analytics.dart';

class AppAnalytics {
  static final FirebaseAnalytics _analytics = FirebaseAnalytics.instance;
  
  static Future<void> trackAppStart() async {
    await _analytics.logAppOpen();
  }
  
  static Future<void> trackFeatureUsage(String featureName) async {
    await _analytics.logEvent(
      name: 'feature_used',
      parameters: {
        'feature': featureName,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }
  
  static Future<void> trackCrash(String errorMessage) async {
    await _analytics.logEvent(
      name: 'app_crash',
      parameters: {
        'error': errorMessage,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }
}
```

---

## Rollbacks — Jab Plans Fail Ho Jayein

Sometimes release mein critical bug milta hai. Tujhe rollback karna padta hai.

### Android Rollback Strategy

```
Play Console > Production > Manage Releases
  
Scenario:
  - v1.3.0 release kiya (100% users ko)
  - Crash report aaya
  - Immediately v1.2.9 (previous working build) ko re-release kar
```

**Steps**:

```bash
# 1. Create hotfix branch from previous tag
git checkout v1.2.9
git checkout -b hotfix/critical-crash

# 2. Fix bug
# ... make changes ...

# 3. Tag as v1.2.10 (patch version increment)
git tag -a v1.2.10 -m "Hotfix: Fix crash in order page"
git push origin v1.2.10

# 4. GitHub Actions automatically:
#    - Builds v1.2.10
#    - Uploads to Play Store Internal
#    - Create release with artifacts
```

**Gradual Rollout (safer approach)**:

```yaml
# Don't do 100% rollout immediately
- name: Upload to Production (25% rollout)
  uses: r0adkll/upload-google-play@v1
  with:
    packageName: com.example.zomato_clone
    releaseFiles: 'build/app/outputs/bundle/release/app-release.aab'
    track: 'production'
    rollout: 0.25  # Start with 25%

# Wait 24 hours, monitor metrics
# If stable, increase to 50%
# After another 24h, go to 100%
```

### iOS Rollback Strategy

iOS mein rollback sikit different hai. App Store pe already approved version hota hai.

```
App Store Connect > App Store > Versions
  
Current situation:
  - v1.3.0 live (critical bug)
  - v1.2.9 previous version (stable)

Options:
  1. Prepare v1.2.10 hotfix aur submit for review (~24h)
  2. Contact Apple Support (risky aur slow)
  3. Immediate action: Remove app from sale, then re-enable with fixed version
```

**Recommended flow**:

```dart
// In app code, add kill-switch for known bugs
class FeatureGate {
  static final _enabledFeatures = {
    'order_tracking': true,
    'new_payment_method': false,  // Disable if bug found
    'rating_review': true,
  };
  
  static bool isEnabled(String featureName) {
    return _enabledFeatures[featureName] ?? false;
  }
}

// In UI
if (FeatureGate.isEnabled('new_payment_method')) {
  return NewPaymentMethodWidget();
} else {
  return LegacyPaymentMethodWidget();
}
```

Isse crash na ho aur users ko directly impact na ho.

**Proper iOS rollback**:

```bash
# 1. Hotfix version
git checkout v1.2.9
git checkout -b hotfix/ios-crash

# 2. Make fix
# ...

# 3. Tag and push
git tag -a v1.2.10-ios-only -m "iOS hotfix"
git push origin v1.2.10-ios-only

# 4. Manually build and submit to App Store Connect
flutter build ipa --release

# Upload via Xcode Organizer aur submit for review
```

---

## Production Checklist — Release Se Pehle

**Har release ke liye yeh checklist follow kar**:

```
Pre-Release Checklist:
☑ Code review completed
☑ All tests passing (flutter test)
☑ No analyzer warnings (flutter analyze)
☑ Version bumped in pubspec.yaml
☑ Changelog updated
☑ Screenshots updated (if UI changes)
☑ App store listings reviewed
☑ Privacy policy linked correctly
☑ Signing keys in secure location
☑ GitHub Secrets updated (if needed)
☑ Testers added to TestFlight / Play Store beta
☑ Rollback plan documented

Release:
☑ Tag pushed (v1.2.0)
☑ GitHub Actions completed successfully
☑ Build available on Play Store Internal / TestFlight
☑ Internal test passed (3-5 days)
☑ Promoted to beta/closed testing
☑ Monitored for crashes (2-3 days)
☑ Metrics reviewed (crash rate, user engagement)
☑ Gradual rollout started (25% -> 50% -> 100%)

Post-Release:
☑ Monitor crash reports daily
☑ Check user reviews/ratings
☑ Respond to user feedback
☑ Plan for next release
☑ Document learnings
```

---

## Performance Optimization — Release Size

Build size matter karta hai, especially emerging markets mein (India, Southeast Asia).

### Check Build Size

```bash
flutter build apk --analyze-size --release

# Output:
# Dart AOT symbols: 2.1 MB
# Flutter framework: 3.4 MB
# Dart runtime: 1.2 MB
# Dependencies: 8.5 MB
# Total: ~15 MB

flutter build appbundle --analyze-size --release
# AAB typically 20-30% smaller than APK
```

### Size Reduction Tips

```bash
# 1. Minify Dart code (already enabled in release)
# 2. Remove unused dependencies
flutter pub deps --no-dev
flutter pub remove package_name

# 3. Compress images
flutter pub get
# Use tools like TinyPNG for assets

# 4. Use deferred loading for large features
import 'heavy_feature.dart' deferred as heavy;

void loadFeature() {
  heavy.loadLibrary().then((_) {
    // Use heavy feature
  });
}

# 5. Check APK contents
unzip -l build/app/outputs/apk/release/app-release.apk | head -50
```

**Typical Zomato clone sizes**:
- APK: 45-60 MB (unoptimized)
- AAB: 15-25 MB (per device)

---

## Key Takeaways

- **Build Artifacts**: APK (single file, Android), AAB (Google Play recommended), IPA (iOS)
- **Signing Keys**: Critical security asset. Never commit to git. Store securely in CI/CD secrets.
- **Version Format**: `major.minor.patch+buildNumber` in pubspec.yaml. Build number increments automatically.
- **Play Store**: Register app, create signing key, upload AAB, fill store listing, review guidelines
- **App Store**: Register on App Store Connect, create provisioning profiles, upload IPA, TestFlight for beta
- **GitHub Actions**: Fully automate builds on tag push. Tests run, then Android/iOS builds, then upload to stores
- **FastLane**: Ruby automation tool for complex iOS workflows (builds, certificates, TestFlight uploads)
- **CI/CD Pipeline**: `git tag v1.2.0` → GitHub Actions → Test → Build → Upload → Release created
- **Beta Strategy**: Upload to internal testing first, monitor crashes for 24-48h, gradual rollout (25% → 50% → 100%)
- **Monitoring**: Use Firebase Analytics, Sentry for crash reporting, TestFlight/Play Store built-in metrics
- **Rollbacks**: Create hotfix branch from last stable tag, increment patch version, push new tag to trigger re-release
- **Release Checklist**: Code review, tests passing, version bumped, testers added, rollback plan ready
- **Build Size**: Check with `--analyze-size`, minify, remove unused deps, compress assets, target ~20-25 MB AAB

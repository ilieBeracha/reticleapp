# Expo Development & Preview Builds Guide

## Understanding the Build Types

### 1. **Development Build** (Recommended for daily work)
- ✅ Fast to build
- ✅ Works with `expo-dev-client`
- ✅ Hot reload & fast refresh
- ✅ Download to phone via QR code
- ✅ Debug JS remotely
- ⏱️ Build time: ~5-10 minutes

### 2. **Preview Build** (For testing before production)
- ✅ Dev client enabled (with our fix)
- ✅ Test with preview updates channel
- ✅ Internal distribution
- ⏱️ Build time: ~5-10 minutes

### 3. **Production Build** (For App Store)
- ✅ Optimized & minified
- ✅ Ready for app stores
- ❌ No dev tools
- ⏱️ Build time: ~15-20 minutes

---

## Quick Start: Development Workflow

### Step 1: Build a Development Client (One-time setup)

```bash
# iOS (physical device)
eas build --profile development --platform ios

# Android (physical device)
eas build --profile development --platform android

# iOS Simulator (Mac only - faster for testing)
eas build --profile development --platform ios --local
```

**Wait for build to complete** (~5-10 minutes). You'll get a QR code or download link.

### Step 2: Install the Dev Client on Your Phone

**iOS:**
- Open the link from EAS build in Safari
- Tap "Install" when prompted
- Trust the certificate: Settings → General → VPN & Device Management

**Android:**
- Download the APK from the link
- Install it (may need to allow "Unknown sources")

**iOS Simulator (Mac):**
- Build will automatically install to simulator

### Step 3: Start Development Server

```bash
# Start Expo dev server
npx expo start --dev-client

# Or just
npm start
```

### Step 4: Open on Your Device

**Option A: QR Code (Recommended)**
- Scan the QR code with your camera app (iOS) or Expo Go app (Android)
- Your dev client will open automatically

**Option B: Manual**
- Open the dev client app on your phone
- Tap "Enter URL manually"
- Enter the URL shown in terminal (e.g., `exp://192.168.1.100:8081`)

---

## Preview Build Workflow (For Testing)

### Step 1: Build Preview Version

```bash
# iOS
eas build --profile preview --platform ios

# Android
eas build --profile preview --platform android
```

### Step 2: Install Preview Build

Same as development build - you'll get a download link.

### Step 3: Test with Preview Updates

```bash
# Publish an update to preview channel
eas update --branch preview --message "Testing new feature"
```

Your preview build will automatically fetch the update!

---

## Common Issues & Solutions

### ❌ "Unable to download build to phone"

**Problem:** Build completed but won't install

**Solutions:**

**iOS:**
1. Check if you're signed in to the correct Apple account
2. Device must be registered in Apple Developer Portal
3. Trust the certificate: Settings → General → VPN & Device Management

**Android:**
1. Enable "Install unknown apps" for your browser
2. Download may be blocked by Play Protect - allow it
3. Check you have enough storage space

---

### ❌ "Expo Go says 'Not compatible'"

**Problem:** Your app uses native modules (camera, etc.)

**Solution:** You CANNOT use Expo Go. You MUST use a development build:

```bash
# Build a dev client first
eas build --profile development --platform ios
```

---

### ❌ "Build is stuck or taking forever"

**Check build status:**
```bash
# See all your builds
eas build:list

# View specific build
eas build:view [build-id]
```

**Common causes:**
- First build of the day (cold start) - takes longer
- EAS servers are busy - just wait
- Build failed - check logs with `eas build:view`

---

### ❌ "QR code doesn't work"

**Solutions:**
1. Make sure phone and computer are on same WiFi
2. Try manual URL entry instead
3. Check firewall isn't blocking port 8081
4. Try `npx expo start --dev-client --tunnel` (slower but works anywhere)

---

## Recommended Development Workflow

### 🔥 **Daily Development** (Fastest)

```bash
# One-time: Build & install dev client to your phone
eas build --profile development --platform ios

# Daily: Just start the dev server
npm start
# Scan QR → Instant updates with Fast Refresh
```

### 🧪 **Testing New Features**

```bash
# Build preview version
eas build --profile preview --platform ios

# Test and iterate with OTA updates
eas update --branch preview --message "Bug fix"
```

### 🚀 **Production Release**

```bash
# Build production version
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Local Development (No Phone Needed)

### iOS Simulator (Mac Only)

```bash
# Build for simulator (much faster)
eas build --profile development --platform ios --local

# Or use Expo's built-in simulator
npm run ios
```

### Android Emulator

```bash
# Start emulator first, then:
npm run android
```

---

## Update Channels Explained

With our fixed `eas.json`:

- **development** → No channel (always loads from local dev server)
- **preview** → `preview` channel (for testing)
- **production** → `production` channel (for live users)

### Publishing Updates

```bash
# Preview testing
eas update --branch preview --message "New feature"

# Production hotfix
eas update --branch production --message "Critical bug fix"
```

Users on each build will only receive updates for their channel!

---

## Quick Commands Reference

```bash
# Start dev server
npm start

# Build development client
eas build --profile development --platform ios

# Build preview
eas build --profile preview --platform ios

# Build production
eas build --profile production --platform all

# Publish update to preview
eas update --branch preview --message "Update message"

# Publish update to production
eas update --branch production --message "Update message"

# View builds
eas build:list

# View specific build
eas build:view [build-id]

# Check account
eas whoami

# Login
eas login
```

---

## Pro Tips

### 💡 Speed Up Development

1. **Use iOS Simulator** (Mac): Much faster than physical device builds
   ```bash
   npm run ios
   ```

2. **Keep one dev client installed**: Rebuild only when you change native code

3. **Use OTA updates**: Publish JS changes instantly without rebuilding
   ```bash
   eas update --branch preview
   ```

### 💡 Team Collaboration

1. **Share preview builds**: Send the download link to teammates
2. **Use channels**: Each team member can test different branches
3. **QR codes**: Easy way to distribute internal tests

### 💡 Debugging

```bash
# Open React DevTools
npm start
# Then press 'j' in terminal

# View device logs
npm start
# Then press 'i' (iOS) or 'a' (Android) in terminal

# Remote debugging
npm start
# Then press 'd' to open debug menu on device
```

---

## Next Steps

1. **Build your first dev client:**
   ```bash
   eas build --profile development --platform ios
   ```

2. **Install it on your phone** using the provided link

3. **Start developing:**
   ```bash
   npm start
   ```

4. **Scan QR code** and start building! 🚀

---

## Need Help?

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Development Builds**: https://docs.expo.dev/develop/development-builds/introduction/
- **EAS Update**: https://docs.expo.dev/eas-update/introduction/
- **Check build status**: `eas build:list`
- **View logs**: `eas build:view [build-id]`


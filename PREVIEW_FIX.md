# Quick Fix: Why Preview Won't Download

## ✅ Fixed

I've updated your `eas.json` to add `developmentClient: true` to the preview profile.

## What Was Wrong

**Before:**
```json
"preview": {
  "distribution": "internal"  // ❌ Creates standalone build (slow, hard to install)
}
```

**After:**
```json
"preview": {
  "developmentClient": true,  // ✅ Creates dev client build (fast, easy to install)
  "distribution": "internal",
  "channel": "preview"
}
```

---

## Next Steps

### Option 1: Use Development Build (Recommended)

This is **fastest** and **easiest** for daily development:

```bash
# 1. Build once (takes ~5-10 min)
eas build --profile development --platform ios

# 2. Install on your phone from the link you get

# 3. Daily development - just start server
npm start

# 4. Scan QR code → instant updates!
```

### Option 2: Use Preview Build (For testing)

Now that it's fixed:

```bash
# Build preview version
eas build --profile preview --platform ios

# Install from link
# Then publish updates with:
eas update --branch preview --message "Testing feature"
```

---

## Can't Wait for Build? Use Simulator

**Mac users:**

```bash
# Much faster - no build needed!
npm run ios
```

This opens iOS Simulator instantly.

---

## Still Not Working?

### Check Your EAS Login

```bash
eas whoami
# Should show: ilieberacha
```

Not logged in?
```bash
eas login
```

### Check Build Status

```bash
# See all your builds
eas build:list

# View latest build details
eas build:view
```

### Common Issues

**iOS: "Unable to install"**
- ✅ Device must be registered in Apple Developer Portal
- ✅ Trust certificate: Settings → General → VPN & Device Management

**Android: "App not installed"**
- ✅ Enable "Install unknown apps" in Settings
- ✅ Disable Play Protect temporarily

**QR Code doesn't work**
- ✅ Make sure phone & computer on same WiFi
- ✅ Try manual URL entry
- ✅ Or use tunnel mode: `npm start -- --tunnel`

---

## TL;DR - What to Do Now

```bash
# 1. Build a dev client (one-time, ~10 min)
eas build --profile development --platform ios

# 2. Install it on your phone from the link

# 3. Start dev server
npm start

# 4. Scan QR code on your phone

# 5. Done! Now you can develop with instant updates 🚀
```

---

See `EXPO_PREVIEW_GUIDE.md` for complete documentation.


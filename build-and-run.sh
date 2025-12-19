#!/bin/bash

# Retic App - Development Setup Script

echo "🎯 Stretic Development Setup"
echo ""
echo "Choose an option:"
echo ""
echo "1) 📱 Build Dev Client for iOS (one-time setup)"
echo "2) 🤖 Build Dev Client for Android (one-time setup)"
echo "3) 🖥️  Run on iOS Simulator (fastest - Mac only)"
echo "4) 🚀 Start Dev Server (after dev client is installed)"
echo "5) 🔍 Check Build Status"
echo "6) 📦 Build Preview Version"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
  1)
    echo ""
    echo "🔨 Building dev client for iOS..."
    echo "This will take 5-10 minutes."
    echo "You'll get a link to install on your phone."
    echo ""
    eas build --profile development --platform ios
    echo ""
    echo "✅ Build submitted! Check the link above to install on your iPhone."
    echo "After installing, run option 4 to start developing."
    ;;
  2)
    echo ""
    echo "🔨 Building dev client for Android..."
    echo "This will take 5-10 minutes."
    echo "You'll get a link to download the APK."
    echo ""
    eas build --profile development --platform android
    echo ""
    echo "✅ Build submitted! Download the APK from the link above."
    echo "After installing, run option 4 to start developing."
    ;;
  3)
    echo ""
    echo "🖥️  Starting iOS Simulator..."
    echo "This is the fastest way to develop!"
    echo ""
    npm run ios
    ;;
  4)
    echo ""
    echo "🚀 Starting Expo Dev Server..."
    echo ""
    echo "📱 On your phone:"
    echo "   1. Open the dev client app"
    echo "   2. Scan the QR code that appears"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    npm start
    ;;
  5)
    echo ""
    echo "📊 Checking build status..."
    echo ""
    eas build:list --limit 5
    ;;
  6)
    echo ""
    echo "📦 Building preview version..."
    echo ""
    echo "Choose platform:"
    echo "1) iOS"
    echo "2) Android"
    echo "3) Both"
    read -p "Enter choice [1-3]: " platform_choice
    
    case $platform_choice in
      1) eas build --profile preview --platform ios ;;
      2) eas build --profile preview --platform android ;;
      3) eas build --profile preview --platform all ;;
      *) echo "❌ Invalid choice" ;;
    esac
    ;;
  *)
    echo ""
    echo "❌ Invalid choice"
    echo ""
    ;;
esac

echo ""
echo "📚 Need help? Check these files:"
echo "   - PREVIEW_FIX.md (quick start)"
echo "   - EXPO_PREVIEW_GUIDE.md (detailed guide)"
echo ""



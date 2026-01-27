#!/bin/bash
# Screenshot capture helper for Reticle product video

SCREENSHOT_DIR="./public/screenshots"
mkdir -p "$SCREENSHOT_DIR"

capture() {
    local name=$1
    xcrun simctl io booted screenshot "$SCREENSHOT_DIR/$name.png"
    echo "✓ Captured: $name.png"
}

case "$1" in
    "engagement-1") capture "engagement-1" ;;
    "engagement-2") capture "engagement-2" ;;
    "engagement-3") capture "engagement-3" ;;
    "scanning-1") capture "scanning-1" ;;
    "scanning-2") capture "scanning-2" ;;
    "scanning-3") capture "scanning-3" ;;
    "insights-1") capture "insights-1" ;;
    "insights-2") capture "insights-2" ;;
    "insights-3") capture "insights-3" ;;
    "all")
        echo "Capturing all 9 screenshots..."
        for i in 1 2 3; do
            capture "engagement-$i"
            capture "scanning-$i"
            capture "insights-$i"
        done
        ;;
    *)
        echo "Usage: ./capture.sh [screenshot-name]"
        echo ""
        echo "Screenshots needed:"
        echo "  engagement-1  - Home with Start Engagement button"
        echo "  engagement-2  - Engagement config modal"
        echo "  engagement-3  - Weapon picker"
        echo "  scanning-1    - Camera view with target"
        echo "  scanning-2    - Detection overlay"
        echo "  scanning-3    - Results card"
        echo "  insights-1    - Insights dashboard"
        echo "  insights-2    - Charts/trends"
        echo "  insights-3    - AI recommendations"
        ;;
esac

# Reticle Product Video

App Store Preview video for Reticle - 30 seconds, dark tactical theme.

## Quick Start

```bash
cd video
npm install
npm run preview
```

This opens Remotion Studio in your browser where you can preview and edit the video.

## Add Your Screenshots

Place 9 screenshots in `public/screenshots/`:

| Scene | Filename | Content |
|-------|----------|---------|
| Engagement | `engagement-1.png` | Home with "Start Engagement" |
| Engagement | `engagement-2.png` | Config modal |
| Engagement | `engagement-3.png` | Weapon picker |
| Scanning | `scanning-1.png` | Camera view |
| Scanning | `scanning-2.png` | Detection overlay |
| Scanning | `scanning-3.png` | Results card |
| Insights | `insights-1.png` | Dashboard |
| Insights | `insights-2.png` | Charts |
| Insights | `insights-3.png` | AI recommendations |

**Recommended size**: 1170x2532px (iPhone 15 Pro)

## Render Final Video

```bash
npm run build
```

Output: `out/reticle-preview.mp4` (1080x1920, 30fps)

## Structure

```
video/
├── src/
│   ├── Root.tsx              # Entry point
│   ├── ProductVideo.tsx      # Main composition
│   ├── scenes/               # 5 scene components
│   └── components/           # Reusable pieces
├── public/
│   └── screenshots/          # Your app screenshots
└── out/                      # Rendered videos
```

## Customization

- **Timing**: Edit `ProductVideo.tsx` to adjust scene durations
- **Text**: Edit scene files to change overlay text
- **Colors**: Orange accent is `#F97316` throughout
- **Logo**: Replace the placeholder in `IntroScene.tsx` and `OutroScene.tsx`

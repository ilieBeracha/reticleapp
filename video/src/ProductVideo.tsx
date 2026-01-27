import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "./components/Background";
import { IntroScene } from "./scenes/IntroScene";
import { EngagementScene } from "./scenes/EngagementScene";
import { ScanningScene } from "./scenes/ScanningScene";
import { InsightsScene } from "./scenes/InsightsScene";
import { OutroScene } from "./scenes/OutroScene";

// Timing constants (in frames @ 30fps)
const FPS = 30;
const INTRO_DURATION = 3 * FPS; // 3 seconds
const SCENE_DURATION = 8 * FPS; // 8 seconds each
const OUTRO_DURATION = 3 * FPS; // 3 seconds

export const ProductVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />

      {/* Intro: Logo reveal */}
      <Sequence from={0} durationInFrames={INTRO_DURATION}>
        <IntroScene />
      </Sequence>

      {/* Scene 1: Start Engagement */}
      <Sequence from={INTRO_DURATION} durationInFrames={SCENE_DURATION}>
        <EngagementScene />
      </Sequence>

      {/* Scene 2: Target Scanning */}
      <Sequence
        from={INTRO_DURATION + SCENE_DURATION}
        durationInFrames={SCENE_DURATION}
      >
        <ScanningScene />
      </Sequence>

      {/* Scene 3: Insights */}
      <Sequence
        from={INTRO_DURATION + SCENE_DURATION * 2}
        durationInFrames={SCENE_DURATION}
      >
        <InsightsScene />
      </Sequence>

      {/* Outro: CTA */}
      <Sequence
        from={INTRO_DURATION + SCENE_DURATION * 3}
        durationInFrames={OUTRO_DURATION}
      >
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

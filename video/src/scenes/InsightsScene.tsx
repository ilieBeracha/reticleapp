import { AbsoluteFill } from "remotion";
import { DeviceFrame } from "../components/DeviceFrame";
import { TextOverlay } from "../components/TextOverlay";

// Screenshots for this scene (add your actual screenshot filenames)
const SCREENSHOTS = [
  "screenshots/insights-1.png", // Dashboard overview
  "screenshots/insights-2.png", // Charts/trends
  "screenshots/insights-3.png", // AI recommendations
];

export const InsightsScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <DeviceFrame screenshots={SCREENSHOTS} />
      <TextOverlay text="Track your progress" position="bottom" delay={15} />
    </AbsoluteFill>
  );
};

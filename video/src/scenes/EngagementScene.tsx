import { AbsoluteFill } from "remotion";
import { DeviceFrame } from "../components/DeviceFrame";
import { TextOverlay } from "../components/TextOverlay";

// Screenshots for this scene (add your actual screenshot filenames)
const SCREENSHOTS = [
  "screenshots/engagement-1.png", // Home with Start Engagement
  "screenshots/engagement-2.png", // Config modal
  "screenshots/engagement-3.png", // Weapon picker
];

export const EngagementScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <DeviceFrame screenshots={SCREENSHOTS} />
      <TextOverlay text="Set up your drill" position="bottom" delay={15} />
    </AbsoluteFill>
  );
};

import { AbsoluteFill } from "remotion";
import { DeviceFrame } from "../components/DeviceFrame";
import { TextOverlay } from "../components/TextOverlay";

// Screenshots for this scene (add your actual screenshot filenames)
const SCREENSHOTS = [
  "screenshots/scanning-1.png", // Camera view
  "screenshots/scanning-2.png", // Detection overlay
  "screenshots/scanning-3.png", // Results card
];

export const ScanningScene: React.FC = () => {
  return (
    <AbsoluteFill>
      <DeviceFrame screenshots={SCREENSHOTS} />
      <TextOverlay text="Capture your results" position="bottom" delay={15} />
    </AbsoluteFill>
  );
};

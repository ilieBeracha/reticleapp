import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

interface TextOverlayProps {
  text: string;
  position?: "top" | "bottom";
  delay?: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  position = "bottom",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const entryProgress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const translateY = interpolate(entryProgress, [0, 1], [40, 0]);
  const opacity = interpolate(entryProgress, [0, 1], [0, 1]);
  const scale = interpolate(entryProgress, [0, 1], [0.9, 1]);

  // Letter-by-letter reveal
  const letterCount = text.length;
  const revealProgress = interpolate(
    adjustedFrame,
    [0, 20],
    [0, letterCount],
    { extrapolateRight: "clamp" }
  );

  // Subtle glow pulse
  const glowIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.3, 0.6]
  );

  // Line animation
  const lineWidth = interpolate(
    adjustedFrame,
    [5, 25],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === "top" ? "flex-start" : "flex-end",
        alignItems: "center",
        padding: position === "top" ? "180px 40px" : "140px 40px",
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          opacity,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 15,
        }}
      >
        {/* Decorative line above */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            background: `linear-gradient(90deg, transparent, #F97316, transparent)`,
            opacity: 0.8,
          }}
        />

        <h2
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 52,
            fontWeight: 700,
            color: "#FFFFFF",
            margin: 0,
            textShadow: `
              0 4px 20px rgba(0,0,0,0.5),
              0 0 40px rgba(249,115,22,${glowIntensity})
            `,
            letterSpacing: "-0.02em",
          }}
        >
          {text.split("").map((letter, i) => (
            <span
              key={i}
              style={{
                opacity: i < revealProgress ? 1 : 0,
                display: "inline-block",
                transform: i < revealProgress ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.1s",
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </h2>

        {/* Decorative line below */}
        <div
          style={{
            width: lineWidth * 0.6,
            height: 2,
            background: `linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)`,
            opacity: 0.6,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

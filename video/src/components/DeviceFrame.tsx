import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Easing,
} from "remotion";

interface DeviceFrameProps {
  screenshots: string[];
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ screenshots }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate which screenshot to show based on time
  const screenshotDuration = durationInFrames / screenshots.length;
  const activeIndex = Math.min(
    Math.floor(frame / screenshotDuration),
    screenshots.length - 1
  );

  // Frame within current screenshot
  const localFrame = frame % screenshotDuration;

  // Entry animation - dramatic swing in
  const entryProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  // Dynamic device rotation based on active screenshot
  const baseRotateY = interpolate(activeIndex, [0, 1, 2], [-8, 0, 8]);
  const baseRotateX = interpolate(activeIndex, [0, 1, 2], [3, 0, -3]);

  // Smooth transition between rotations
  const rotateY = interpolate(
    localFrame,
    [0, 20],
    [baseRotateY - 5, baseRotateY],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const rotateX = interpolate(
    localFrame,
    [0, 20],
    [baseRotateX + 3, baseRotateX],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // Floating animation
  const floatY = Math.sin(frame * 0.04) * 8;
  const floatX = Math.cos(frame * 0.03) * 4;

  // Scale pulse on screenshot change
  const scalePulse = interpolate(
    localFrame,
    [0, 10, 25],
    [0.95, 1.02, 1],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) }
  );

  const scale = interpolate(entryProgress, [0, 1], [0.5, 1]) * scalePulse;
  const translateY = interpolate(entryProgress, [0, 1], [200, 0]);
  const opacity = interpolate(entryProgress, [0, 1], [0, 1]);

  // Screenshot slide-in animation
  const slideX = interpolate(
    localFrame,
    [0, 15],
    [50, 0],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const screenshotOpacity = interpolate(
    localFrame,
    [0, 10],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Glow intensity pulses
  const glowIntensity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.6]
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        perspective: 1200,
      }}
    >
      {/* Animated glow behind device */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 900,
          background: `radial-gradient(ellipse, rgba(249,115,22,${glowIntensity}) 0%, transparent 60%)`,
          filter: "blur(80px)",
          transform: `translateY(${floatY}px)`,
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => {
        const particleY = interpolate(
          (frame + i * 50) % 120,
          [0, 120],
          [400, -400]
        );
        const particleX = Math.sin((frame + i * 30) * 0.02) * 150 + (i - 2.5) * 80;
        const particleOpacity = interpolate(
          (frame + i * 50) % 120,
          [0, 30, 90, 120],
          [0, 0.6, 0.6, 0]
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              borderRadius: "50%",
              background: "#F97316",
              opacity: particleOpacity,
              transform: `translate(${particleX}px, ${particleY}px)`,
              boxShadow: "0 0 10px #F97316",
            }}
          />
        );
      })}

      <div
        style={{
          transform: `
            scale(${scale})
            translateY(${translateY + floatY}px)
            translateX(${floatX}px)
            rotateY(${rotateY}deg)
            rotateX(${rotateX}deg)
          `,
          opacity,
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Reflection/shadow underneath */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: "50%",
            transform: "translateX(-50%) rotateX(80deg)",
            width: 300,
            height: 100,
            background: "radial-gradient(ellipse, rgba(249,115,22,0.3) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* iPhone 15 Pro Frame */}
        <div
          style={{
            width: 380,
            height: 780,
            background: "linear-gradient(145deg, #3A3A3A 0%, #1A1A1A 50%, #2A2A2A 100%)",
            borderRadius: 55,
            padding: 12,
            boxShadow: `
              0 50px 100px rgba(0,0,0,0.6),
              0 20px 40px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.15),
              inset 0 -1px 0 rgba(0,0,0,0.3),
              0 0 60px rgba(249,115,22,${glowIntensity * 0.3})
            `,
            position: "relative",
          }}
        >
          {/* Screen bezel */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#000",
              borderRadius: 45,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Dynamic Island */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                width: 120,
                height: 35,
                background: "#000",
                borderRadius: 20,
                zIndex: 10,
              }}
            />

            {/* Screenshot with slide animation */}
            {screenshots[activeIndex] && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translateX(${slideX}px)`,
                  opacity: screenshotOpacity,
                }}
              >
                <Img
                  src={staticFile(screenshots[activeIndex])}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}

            {/* Screen reflection overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Placeholder when no screenshot */}
            {!screenshots[activeIndex] && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#666",
                  fontSize: 14,
                  fontFamily: "system-ui",
                }}
              >
                Screenshot {activeIndex + 1}
              </div>
            )}
          </div>

          {/* Side button (power) */}
          <div
            style={{
              position: "absolute",
              right: -3,
              top: 180,
              width: 4,
              height: 80,
              background: "linear-gradient(90deg, #2A2A2A, #3A3A3A)",
              borderRadius: 2,
            }}
          />

          {/* Volume buttons */}
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 140,
              width: 4,
              height: 35,
              background: "linear-gradient(90deg, #3A3A3A, #2A2A2A)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 190,
              width: 4,
              height: 60,
              background: "linear-gradient(90deg, #3A3A3A, #2A2A2A)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 260,
              width: 4,
              height: 60,
              background: "linear-gradient(90deg, #3A3A3A, #2A2A2A)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

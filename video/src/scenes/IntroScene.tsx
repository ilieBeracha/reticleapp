import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered animations
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const textProgress = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const taglineProgress = spring({
    frame: Math.max(0, frame - 35),
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Logo animations
  const logoScale = interpolate(logoProgress, [0, 1], [0.3, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoRotate = interpolate(logoProgress, [0, 1], [-180, 0]);

  // Text animations
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [30, 0]);
  const textScale = interpolate(textProgress, [0, 1], [0.8, 1]);

  // Tagline animations
  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineProgress, [0, 1], [20, 0]);

  // Crosshair animations
  const crosshairRotation = frame * 0.5;
  const crosshairScale = interpolate(
    frame,
    [0, 30, 60, 90],
    [0.5, 1.2, 1, 1.1],
    { extrapolateRight: "clamp" }
  );
  const crosshairOpacity = interpolate(frame, [0, 20], [0, 0.15]);

  // Pulse effect
  const pulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.95, 1.05]);

  // Ring expansion
  const ringScale1 = interpolate(frame % 60, [0, 60], [0.8, 1.5]);
  const ringOpacity1 = interpolate(frame % 60, [0, 30, 60], [0.3, 0.15, 0]);
  const ringScale2 = interpolate((frame + 30) % 60, [0, 60], [0.8, 1.5]);
  const ringOpacity2 = interpolate((frame + 30) % 60, [0, 30, 60], [0.3, 0.15, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Animated crosshair behind logo */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          opacity: crosshairOpacity,
          transform: `rotate(${crosshairRotation}deg) scale(${crosshairScale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent, #F97316, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 2,
            background: "linear-gradient(180deg, transparent, #F97316, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 120,
            height: 120,
            border: "2px solid #F97316",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 240,
            height: 240,
            border: "1px solid #F97316",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 360,
            height: 360,
            border: "1px solid #F97316",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Expanding rings */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          border: "2px solid #F97316",
          borderRadius: "50%",
          transform: `scale(${ringScale1})`,
          opacity: ringOpacity1,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          border: "2px solid #F97316",
          borderRadius: "50%",
          transform: `scale(${ringScale2})`,
          opacity: ringOpacity2,
        }}
      />

      {/* Logo container */}
      <div
        style={{
          transform: `scale(${logoScale * pulse})`,
          opacity: logoOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 25,
        }}
      >
        {/* Reticle icon */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 35,
            background: "linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: `
              0 20px 60px rgba(249,115,22,0.5),
              0 0 100px rgba(249,115,22,0.3),
              inset 0 1px 0 rgba(255,255,255,0.3)
            `,
            transform: `rotate(${logoRotate}deg)`,
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              border: "4px solid white",
              borderRadius: "50%",
              position: "relative",
              boxShadow: "0 0 20px rgba(255,255,255,0.3)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: -12,
                right: -12,
                height: 4,
                background: "white",
                transform: "translateY(-50%)",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -12,
                bottom: -12,
                width: 4,
                background: "white",
                transform: "translateX(-50%)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* Logo text */}
        <h1
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 80,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            letterSpacing: "-0.03em",
            transform: `translateY(${textY}px) scale(${textScale})`,
            opacity: textOpacity,
            textShadow: "0 0 60px rgba(249,115,22,0.5)",
          }}
        >
          Reticle
        </h1>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: "linear-gradient(90deg, transparent, #F97316)",
            }}
          />
          <p
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 26,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              margin: 0,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Master Your Accuracy
          </p>
          <div
            style={{
              width: 40,
              height: 2,
              background: "linear-gradient(90deg, #F97316, transparent)",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

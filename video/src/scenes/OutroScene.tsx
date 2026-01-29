import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered entry animations
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const textProgress = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const ctaProgress = spring({
    frame: Math.max(0, frame - 25),
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Logo animations
  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoY = interpolate(logoProgress, [0, 1], [50, 0]);

  // Text animations
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [30, 0]);

  // CTA animations
  const ctaScale = interpolate(ctaProgress, [0, 1], [0.8, 1]);
  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaY = interpolate(ctaProgress, [0, 1], [20, 0]);

  // Pulse and glow effects
  const pulse = interpolate(Math.sin(frame * 0.2), [-1, 1], [1, 1.08]);
  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.4, 0.8]);

  // Particle burst
  const particles = [...Array(12)].map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const distance = interpolate(frame, [0, 40], [0, 200], { extrapolateRight: "clamp" });
    const particleOpacity = interpolate(frame, [10, 30, 50], [0, 0.6, 0], { extrapolateRight: "clamp" });
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: particleOpacity,
      size: 4 + (i % 3) * 2,
    };
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Particle burst */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "#F97316",
            boxShadow: "0 0 10px #F97316",
            transform: `translate(${p.x}px, ${p.y - 100}px)`,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale}) translateY(${logoY}px)`,
            opacity: logoOpacity,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 25,
              background: "linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: `
                0 20px 50px rgba(249,115,22,0.5),
                0 0 80px rgba(249,115,22,${glowIntensity}),
                inset 0 1px 0 rgba(255,255,255,0.3)
              `,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                border: "3px solid white",
                borderRadius: "50%",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: -10,
                  right: -10,
                  height: 3,
                  background: "white",
                  transform: "translateY(-50%)",
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: -10,
                  bottom: -10,
                  width: 3,
                  background: "white",
                  transform: "translateX(-50%)",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        </div>

        {/* App name */}
        <h1
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 64,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            letterSpacing: "-0.03em",
            transform: `translateY(${textY}px)`,
            opacity: textOpacity,
            textShadow: "0 0 40px rgba(249,115,22,0.4)",
          }}
        >
          Reticle
        </h1>

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${ctaScale * pulse}) translateY(${ctaY}px)`,
            opacity: ctaOpacity,
            marginTop: 20,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
              padding: "24px 60px",
              borderRadius: 20,
              boxShadow: `
                0 15px 50px rgba(249,115,22,0.5),
                0 0 60px rgba(249,115,22,${glowIntensity * 0.5}),
                inset 0 1px 0 rgba(255,255,255,0.3)
              `,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Shine effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: interpolate(frame, [30, 60], [-100, 300], { extrapolateRight: "clamp" }),
                width: 60,
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                transform: "skewX(-20deg)",
              }}
            />
            <span
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "0.02em",
                position: "relative",
              }}
            >
              Download Now
            </span>
          </div>
        </div>

        {/* App Store text */}
        <p
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 18,
            fontWeight: 500,
            color: "rgba(255,255,255,0.5)",
            margin: 0,
            marginTop: 10,
            transform: `translateY(${ctaY}px)`,
            opacity: ctaOpacity * 0.8,
          }}
        >
          Available on the App Store
        </p>
      </div>
    </AbsoluteFill>
  );
};

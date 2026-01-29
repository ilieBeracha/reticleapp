import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();

  // Animated gradient rotation
  const gradientAngle = interpolate(frame, [0, 900], [180, 220]);

  // Pulsing glow
  const glowOpacity = interpolate(Math.sin(frame * 0.03), [-1, 1], [0.2, 0.4]);

  // Grid movement
  const gridOffset = frame * 0.3;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #050505 0%, #0A0A0A 30%, #111111 70%, #0A0A0A 100%)`,
      }}
    >
      {/* Moving grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: -100,
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          transform: `translateY(${gridOffset % 80}px)`,
        }}
      />

      {/* Diagonal lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(249,115,22,0.02) 100px,
            rgba(249,115,22,0.02) 101px
          )`,
        }}
      />

      {/* Animated corner accents */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          width: 150,
          height: 150,
          borderLeft: "2px solid rgba(249,115,22,0.3)",
          borderTop: "2px solid rgba(249,115,22,0.3)",
          opacity: interpolate(Math.sin(frame * 0.05), [-1, 1], [0.3, 0.8]),
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          width: 150,
          height: 150,
          borderRight: "2px solid rgba(249,115,22,0.3)",
          borderBottom: "2px solid rgba(249,115,22,0.3)",
          opacity: interpolate(Math.sin(frame * 0.05 + 1), [-1, 1], [0.3, 0.8]),
        }}
      />

      {/* Center reticle - rotates slowly */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${frame * 0.2}deg)`,
          width: 300,
          height: 300,
          opacity: 0.08,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "#F97316",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            background: "#F97316",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 60,
            height: 60,
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
            width: 120,
            height: 120,
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
            width: 200,
            height: 200,
            border: "1px solid #F97316",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Top ambient glow */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 600,
          background:
            "radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 60%)",
          opacity: glowOpacity,
          filter: "blur(100px)",
        }}
      />

      {/* Bottom accent glow */}
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          background:
            "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

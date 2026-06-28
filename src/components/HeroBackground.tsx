export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#0a1628]" />

      {/* SVG Cityscape */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* Grid lines — financial chart feel */}
        <g opacity="0.06">
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="1440" y2={i * 40} stroke="white" strokeWidth="1" />
          ))}
          {Array.from({ length: 36 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="800" stroke="white" strokeWidth="1" />
          ))}
        </g>

        {/* City skyline silhouette — far layer */}
        <g opacity="0.15">
          <rect x="80" y="480" width="60" height="320" fill="white" />
          <rect x="160" y="420" width="45" height="380" fill="white" />
          <rect x="220" y="500" width="70" height="300" fill="white" />
          <rect x="310" y="360" width="50" height="440" fill="white" />
          <rect x="380" y="440" width="80" height="360" fill="white" />
          <rect x="480" y="320" width="55" height="480" fill="white" />
          <rect x="550" y="400" width="65" height="400" fill="white" />
          <rect x="640" y="280" width="70" height="520" fill="white" />
          <rect x="730" y="380" width="50" height="420" fill="white" />
          <rect x="800" y="340" width="85" height="460" fill="white" />
          <rect x="900" y="420" width="55" height="380" fill="white" />
          <rect x="970" y="300" width="60" height="500" fill="white" />
          <rect x="1050" y="380" width="75" height="420" fill="white" />
          <rect x="1140" y="350" width="50" height="450" fill="white" />
          <rect x="1210" y="440" width="65" height="360" fill="white" />
          <rect x="1300" y="400" width="80" height="400" fill="white" />
        </g>

        {/* City skyline — near layer, taller buildings */}
        <g opacity="0.08">
          <rect x="120" y="350" width="80" height="450" fill="white" rx="2" />
          <rect x="280" y="280" width="60" height="520" fill="white" rx="2" />
          <rect x="420" y="200" width="90" height="600" fill="white" rx="2" />
          <rect x="580" y="250" width="70" height="550" fill="white" rx="2" />
          <rect x="720" y="180" width="100" height="620" fill="white" rx="2" />
          <rect x="900" y="220" width="75" height="580" fill="white" rx="2" />
          <rect x="1060" y="260" width="85" height="540" fill="white" rx="2" />
          <rect x="1220" y="300" width="65" height="500" fill="white" rx="2" />
        </g>

        {/* Glowing accent dots — like city lights */}
        <g>
          <circle cx="150" cy="520" r="2" fill="#00d4ff" opacity="0.6" />
          <circle cx="240" cy="480" r="1.5" fill="#00d4ff" opacity="0.4" />
          <circle cx="340" cy="400" r="2" fill="#6366f1" opacity="0.5" />
          <circle cx="450" cy="350" r="2.5" fill="#00d4ff" opacity="0.7" />
          <circle cx="520" cy="380" r="1.5" fill="#6366f1" opacity="0.4" />
          <circle cx="660" cy="300" r="3" fill="#00d4ff" opacity="0.8" />
          <circle cx="750" cy="360" r="2" fill="#6366f1" opacity="0.5" />
          <circle cx="840" cy="320" r="2" fill="#00d4ff" opacity="0.6" />
          <circle cx="930" cy="400" r="1.5" fill="#6366f1" opacity="0.4" />
          <circle cx="1000" cy="340" r="2.5" fill="#00d4ff" opacity="0.7" />
          <circle cx="1100" cy="380" r="2" fill="#6366f1" opacity="0.5" />
          <circle cx="1200" cy="420" r="1.5" fill="#00d4ff" opacity="0.4" />
          <circle cx="1320" cy="380" r="2" fill="#6366f1" opacity="0.6" />
        </g>

        {/* Financial chart line */}
        <g opacity="0.12">
          <polyline
            points="0,600 120,580 240,550 360,520 480,480 600,440 720,380 840,350 960,320 1080,280 1200,250 1320,220 1440,200"
            stroke="url(#chartGradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0" />
              <stop offset="30%" stopColor="#00d4ff" />
              <stop offset="70%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </g>

        {/* Radial glow behind the card area */}
        <radialGradient id="cardGlow" cx="70%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </radialGradient>
        <rect width="1440" height="800" fill="url(#cardGlow)" />
      </svg>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 via-transparent to-[#0a1628]/30" />
    </div>
  );
}

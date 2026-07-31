const BODY_PATH =
  "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z";
const EYE_PATH = "M16 10h.01";
const TAIL_PATH = "M2 8v1a2 2 0 0 0 2 2h1";

export function PigLoader({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full pig-loader-svg"
      >
        <g style={{ filter: "drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.22))" }}>
          <path d={BODY_PATH} />
          <path d={EYE_PATH} />
          <path d={TAIL_PATH} />
        </g>
        <path
          className="pig-loader-chase"
          stroke="hsl(var(--primary))"
          pathLength={100}
          d={`${BODY_PATH} ${TAIL_PATH}`}
        />
      </svg>
      <style>{`
        .pig-loader-chase {
          stroke-dasharray: 18 100;
          animation: pig-loader-chase 2.6s linear infinite;
        }
        @keyframes pig-loader-chase {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -118; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pig-loader-chase { animation-duration: 8s; }
        }
      `}</style>
    </div>
  );
}

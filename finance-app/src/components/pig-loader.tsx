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
        {/*
          Duas trilhas de animação independentes (corpo e rabinho), cada uma com o seu
          próprio pathLength normalizado. Combinar os dois traços num único "d" fazia o
          traço "saltar" no ponto de descontinuidade entre eles (o rabinho é um subtraço
          separado do corpo) — por isso cada um percorre o seu próprio contorno em loop.
        */}
        <path
          className="pig-loader-chase pig-loader-chase-body"
          stroke="hsl(var(--primary))"
          pathLength={100}
          d={BODY_PATH}
        />
        <path
          className="pig-loader-chase pig-loader-chase-tail"
          stroke="hsl(var(--primary))"
          pathLength={100}
          d={TAIL_PATH}
        />
      </svg>
      <style>{`
        .pig-loader-chase {
          stroke-dasharray: 22 100;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .pig-loader-chase-body {
          animation-name: pig-loader-chase;
          animation-duration: 2.6s;
        }
        .pig-loader-chase-tail {
          animation-name: pig-loader-chase;
          animation-duration: 1.1s;
        }
        @keyframes pig-loader-chase {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -122; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pig-loader-chase-body { animation-duration: 8s; }
          .pig-loader-chase-tail { animation-duration: 3.5s; }
        }
      `}</style>
    </div>
  );
}

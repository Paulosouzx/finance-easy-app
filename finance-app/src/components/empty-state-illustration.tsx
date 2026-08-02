import { useUserPreferences } from "@/contexts/user-preferences";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Ilustração "em construção" mostrada acima de mensagens de estado vazio, com a cor a acompanhar o tema ativo (roxo ou verde). */
export function EmptyStateIllustration({ className = "w-48 h-48 mb-3 opacity-90" }: { className?: string }) {
  const { theme } = useUserPreferences();
  const isGreenTheme = theme === "green-light" || theme === "green-dark";
  const src = `${BASE}/assets/work-in-progress-${isGreenTheme ? "green" : "purple"}.svg`;
  return <img src={src} alt="" className={className} />;
}

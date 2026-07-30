import type { AppTheme } from "@/contexts/user-preferences";

export type ThemeOption = {
  key: AppTheme;
  label: string;
  description: string;
  bg: string;
  card: string;
  primary: string;
  text: string;
  subtext: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    key: "light",
    label: "Tema Claro",
    description: "Fundo branco, texto escuro",
    bg: "#F8F7FF",
    card: "#FFFFFF",
    primary: "#7B2FF7",
    text: "#180A3D",
    subtext: "#6B7280",
  },
  {
    key: "dark",
    label: "Tema Escuro Suave",
    description: "Cinza-azulado, não preto puro",
    bg: "#171726",
    card: "#222338",
    primary: "#9B5FFA",
    text: "#E8EAF2",
    subtext: "#8A8FAE",
  },
  {
    key: "green-light",
    label: "Tema Verde Claro",
    description: "Fundo branco, primária verde",
    bg: "#F3FAF7",
    card: "#FFFFFF",
    primary: "#10B981",
    text: "#0A2419",
    subtext: "#6B7280",
  },
  {
    key: "green-dark",
    label: "Tema Verde Escuro",
    description: "Fundo escuro verde, primária esmeralda",
    bg: "#0D1A12",
    card: "#152019",
    primary: "#10B981",
    text: "#E2EDE8",
    subtext: "#6B9480",
  },
];

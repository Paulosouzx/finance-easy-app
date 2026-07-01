import { useUserPreferences, type AppTheme } from "@/contexts/user-preferences";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeOption = {
  key: AppTheme;
  label: string;
  description: string;
  bg: string;
  card: string;
  primary: string;
  text: string;
  subtext: string;
};

const THEME_OPTIONS: ThemeOption[] = [
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

type ModuleOption = {
  key: string;
  label: string;
  description: string;
  locked?: boolean;
};

const MODULE_OPTIONS: ModuleOption[] = [
  { key: "dashboard", label: "Dashboard", description: "Resumo e visão geral", locked: true },
  { key: "transactions", label: "Transações", description: "Receitas e despesas", locked: true },
  { key: "accounts", label: "Contas", description: "Contas bancárias e carteiras", locked: true },
  { key: "credit-cards", label: "Cartões de Crédito", description: "Gestão de cartões e faturas" },
  { key: "bills", label: "Contas a Pagar", description: "Contas e despesas recorrentes" },
  { key: "budgets", label: "Orçamentos", description: "Limites de gastos por categoria" },
  { key: "goals", label: "Metas", description: "Objetivos de poupança" },
  { key: "categories", label: "Categorias", description: "Organização de transações" },
  { key: "reports", label: "Relatórios", description: "Gráficos e análises detalhadas" },
];

function ThemeSwatch({ option, selected, onSelect }: { option: ThemeOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative rounded-xl overflow-hidden border-2 transition-all text-left w-full",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
      )}
    >
      {/* Mini preview */}
      <div className="h-24 p-2 flex gap-1.5" style={{ backgroundColor: option.bg }}>
        {/* Sidebar strip */}
        <div className="w-8 rounded-lg flex flex-col gap-1 p-1" style={{ backgroundColor: option.card, opacity: 0.9 }}>
          <div className="w-4 h-1.5 rounded-sm" style={{ backgroundColor: option.primary }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="w-5 h-1 rounded-sm opacity-40" style={{ backgroundColor: option.text }} />
          ))}
        </div>
        {/* Main area */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-7 rounded-lg p-1.5" style={{ backgroundColor: option.card }}>
                <div className="w-full h-1 rounded-sm mb-1" style={{ backgroundColor: option.subtext, opacity: 0.4 }} />
                <div className="w-3/4 h-1.5 rounded-sm" style={{ backgroundColor: option.text, opacity: 0.7 }} />
              </div>
            ))}
          </div>
          <div className="flex-1 rounded-lg p-1.5" style={{ backgroundColor: option.card }}>
            <div className="w-2/3 h-1 rounded-sm" style={{ backgroundColor: option.subtext, opacity: 0.4 }} />
            <div className="mt-1 w-full h-3 rounded-sm" style={{ backgroundColor: option.primary, opacity: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-3 py-2 bg-card border-t">
        <p className="text-sm font-semibold leading-none">{option.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
      </div>

      {/* Selected badge */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

export default function Settings() {
  const { theme, setTheme, isModuleEnabled, toggleModule } = useUserPreferences();

  return (
    <div className="space-y-6 max-w-2xl mx-auto w-full pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Definições</h2>
        <p className="text-muted-foreground">Personaliza a tua conta e as preferências da app.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>As tuas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">U</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="font-semibold text-lg leading-none">Utilizador</h4>
              <p className="text-sm text-muted-foreground">utilizador@exemplo.com</p>
              <Badge variant="secondary" className="mt-1">Plano Gratuito</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Escolhe o tema visual da aplicação. A alteração é imediata.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map(option => (
              <ThemeSwatch
                key={option.key}
                option={option}
                selected={theme === option.key}
                onSelect={() => setTheme(option.key)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos</CardTitle>
          <CardDescription>Ativa ou desativa secções da sidebar. Os dados não se perdem ao desativar.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {MODULE_OPTIONS.map(mod => (
            <div key={mod.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">{mod.label}</Label>
                  {mod.locked && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Sempre ativo</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
              </div>
              <Switch
                checked={mod.locked ? true : isModuleEnabled(mod.key)}
                disabled={mod.locked}
                onCheckedChange={() => {
                  if (!mod.locked) toggleModule(mod.key);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências Regionais</CardTitle>
          <CardDescription>Configurações de moeda e região.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Moeda</Label>
              <p className="text-sm text-muted-foreground">Moeda base para todos os valores.</p>
            </div>
            <div className="font-semibold px-3 py-1 bg-secondary rounded-lg">EUR (€)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

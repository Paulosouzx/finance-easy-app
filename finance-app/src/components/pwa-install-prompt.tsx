import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/contexts/pwa-install";

export function PwaInstallPrompt() {
  const { isStandalone, isIos, isMobile, canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("pwa-install-dismissed") === "1"
  );

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  if (dismissed || isStandalone || !isMobile) return null;

  if (isIos) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg flex items-start gap-3 max-w-sm mx-auto">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar Finance Easy</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toca em <strong>Partilhar</strong> → <strong>Adicionar ao Ecrã Principal</strong>
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-3 max-w-sm mx-auto">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Download className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Instalar Finance Easy</p>
        <p className="text-xs text-muted-foreground mt-0.5">Acesso rápido sem browser</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={handleInstall}>Instalar</Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

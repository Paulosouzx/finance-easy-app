import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserPreferences } from "@/contexts/user-preferences";
import { THEME_OPTIONS } from "@/lib/theme-options";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useUserPreferences();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full bg-card/80 backdrop-blur-sm"
          aria-label="Alterar tema"
        >
          <Palette className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Escolhe um tema</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((option) => (
            <DialogClose asChild key={option.key}>
              <button
                type="button"
                onClick={() => setTheme(option.key)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all",
                  theme === option.key ? "border-primary" : "border-border hover:border-primary/40"
                )}
                style={{ backgroundColor: option.bg }}
              >
                <span
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: option.primary }}
                />
                <span className="text-xs font-medium" style={{ color: option.text }}>
                  {option.label.replace("Tema ", "")}
                </span>
                {theme === option.key && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </span>
                )}
              </button>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

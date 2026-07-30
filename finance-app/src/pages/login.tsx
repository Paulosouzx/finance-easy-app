import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      toast({
        title: "Não foi possível entrar",
        description: err instanceof Error ? err.message : "Verifica as tuas credenciais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, name);
      toast({ title: "Conta criada", description: "Verifica o teu email para confirmar a conta." });
    } catch (err) {
      toast({
        title: "Não foi possível criar a conta",
        description: err instanceof Error ? err.message : "Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast({
        title: "Não foi possível continuar com o Google",
        description: err instanceof Error ? err.message : "Tenta novamente.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-lg font-black">F</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">FinanceApp</h1>
          <p className="text-sm text-muted-foreground">{t("auth.appTagline")}</p>
        </div>

        {!configured && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 text-xs text-amber-600 dark:text-amber-400">
              O Supabase ainda não está configurado. Define <code>VITE_SUPABASE_URL</code> e{" "}
              <code>VITE_SUPABASE_ANON_KEY</code> no ficheiro <code>.env</code>.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{t("auth.welcome")}</CardTitle>
            <CardDescription>{t("auth.tagline")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={googleLoading || !configured}
              onClick={handleGoogle}
            >
              {googleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FcGoogle className="w-4 h-4 mr-2" />}
              {t("auth.continueGoogle")}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("auth.orEmail")}</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form className="space-y-4" onSubmit={handleSignIn}>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">{t("auth.email")}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">{t("auth.password")}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !configured}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("auth.signIn")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form className="space-y-4" onSubmit={handleSignUp}>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">{t("auth.name")}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">{t("auth.email")}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">{t("auth.password")}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !configured}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("auth.signUp")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

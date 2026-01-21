import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Eye, EyeOff, LogIn } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { signIn } = useSupabaseAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä kaikki kentät", "Please fill all fields"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: t("Kirjautuminen onnistui", "Login successful"),
        description: t("Tervetuloa hallintapaneeliin", "Welcome to admin panel"),
      });
      
      onLoginSuccess(user);
      onClose();
      setEmail("");
      setPassword("");
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: t("Kirjautuminen epäonnistui", "Login failed"),
        description: error.message || t("Tarkista sähköposti ja salasana", "Check your email and password"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-center justify-center">
            <Lock className="w-5 h-5" />
            <span>{t("Hallintapaneeli - Kirjaudu sisään", "Admin Panel - Login")}</span>
          </DialogTitle>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg text-gray-600 dark:text-gray-300">
              Tirvan Kahvila
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Kirjaudu sisään hallintapaneeliin", "Login to admin panel")}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{t("Sähköposti", "Email")}</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@tirvankahvila.fi"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>{t("Salasana", "Password")}</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t("Kirjaudutaan...", "Logging in...")}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>{t("Kirjaudu sisään", "Login")}</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
                <p>{t("Oletustunnukset:", "Default credentials:")}</p>
                <p className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  info@tirvankahvila.fi
                </p>
                <p className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  antonio@2025
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
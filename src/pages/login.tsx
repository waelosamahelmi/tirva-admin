import { useState } from "react";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { useAndroid } from "@/lib/android-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Bell } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn } = useSupabaseAuth();
  const { 
    isAndroid, 
    hasNetworkPermission,
    requestNetworkPermission,
    requestNotificationPermission,
    requestBluetoothPermission
  } = useAndroid();
  const [, setLocation] = useLocation();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { user, error } = await signIn(email, password);
      if (error) {
        setError(error.message || "Login failed");
        return;
      }
      if (user) {
        // Auto-request all permissions after successful login
        if (isAndroid) {
          await Promise.all([
            requestNetworkPermission(),
            requestNotificationPermission(),
            requestBluetoothPermission()
          ]);
        }
        setLocation("/admin");
      }
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionRequest = async () => {
    await Promise.all([
      requestNetworkPermission(),
      requestNotificationPermission(),
      requestBluetoothPermission()
    ]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-orange-600 mr-2" />
              <CardTitle className="text-2xl">PlateOS</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Kitchen Management System
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">\n              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tirvankahvila.fi"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

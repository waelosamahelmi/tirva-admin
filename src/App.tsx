import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SupabaseAuthProvider } from "@/lib/supabase-auth-context";
import { AndroidProvider } from "@/lib/android-context";
import { CartProvider } from "@/lib/cart-context";
import { PrinterProvider } from "@/lib/printer-context";
import { AppWrapper } from "@/components/app-wrapper";
import { UpdateChecker } from "@/components/update-checker";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import LocationsAdmin from "@/pages/locations-admin";
import BranchesAdmin from "@/pages/branches-admin";
import LounasAdmin from "@/pages/lounas-admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Admin} />
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={Login} />
      <Route path="/locations" component={LocationsAdmin} />
      <Route path="/branches" component={BranchesAdmin} />
      <Route path="/lounas" component={LounasAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <CartProvider>
            <SupabaseAuthProvider>
              <AndroidProvider>
                <PrinterProvider>
                  <AppWrapper>
                    <TooltipProvider>
                      <Toaster />
                      <UpdateChecker />
                      <Router />
                    </TooltipProvider>
                  </AppWrapper>
                </PrinterProvider>
              </AndroidProvider>
            </SupabaseAuthProvider>
          </CartProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;




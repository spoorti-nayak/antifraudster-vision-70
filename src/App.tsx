import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { VendorProvider } from "@/contexts/VendorContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import FraudAlerts from "./pages/FraudAlerts";
import Analytics from "./pages/Analytics";
import Vendors from "./pages/Vendors";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Shop from "./pages/Shop";
import ShopCart from "./pages/ShopCart";
import ShopCheckout from "./pages/ShopCheckout";
import ShopSettings from "./pages/ShopSettings";
import ShopSuccess from "./pages/ShopSuccess";
import DashboardLayout from "./layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <VendorProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/cart" element={<ShopCart />} />
              <Route path="/shop/checkout" element={<ShopCheckout />} />
              <Route path="/shop/settings" element={<ShopSettings />} />
              <Route path="/shop/success" element={<ShopSuccess />} />
              <Route path="/" element={<DashboardLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="alerts" element={<FraudAlerts />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="vendors" element={<Vendors />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </VendorProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

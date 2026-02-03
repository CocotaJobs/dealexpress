import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Proposals from "./pages/Proposals";
import NewProposal from "./pages/NewProposal";
import ViewProposal from "./pages/ViewProposal";
import EditProposal from "./pages/EditProposal";
import Items from "./pages/Items";
import Templates from "./pages/Templates";
import Users from "./pages/Users";
import WhatsApp from "./pages/WhatsApp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/proposals" element={<Proposals />} />
                <Route path="/proposals/new" element={<NewProposal />} />
                <Route path="/proposals/:id" element={<ViewProposal />} />
                <Route path="/proposals/:id/edit" element={<EditProposal />} />
                <Route path="/items" element={<Items />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/users" element={<Users />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
              </Route>
              
              {/* Redirects */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

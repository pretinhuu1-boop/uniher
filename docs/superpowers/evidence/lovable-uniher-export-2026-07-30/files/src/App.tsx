import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { UnifiedAuthGuard } from "@/components/guards/UnifiedAuthGuard";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import HealthStatus from "./pages/HealthStatus";
import Campaigns from "./pages/Campaigns";
import Profile from "./pages/Profile";
import HRDashboard from "./pages/HRDashboard";
import Onboarding from "./pages/Onboarding";
import HROnboarding from "./pages/HROnboarding";
import LeadershipOnboarding from "./pages/LeadershipOnboarding";
import Telemedicine from "./pages/Telemedicine";
import Concierge from "./pages/Concierge";
import Partnerships from "./pages/Partnerships";
import Settings from "./pages/Settings";
import NotificationSettings from "./pages/NotificationSettings";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import AdminDashboard from "./pages/AdminDashboard";
import Achievements from "./pages/Achievements";
import Challenges from "./pages/Challenges";
import HallOfFame from "./pages/HallOfFame";
import QueenProfile from "./pages/QueenProfile";
import CompanyDashboard from "./pages/CompanyDashboard";
import CompanyProfile from "./pages/CompanyProfile";
import LeadershipDashboard from "./pages/LeadershipDashboard";
import EngagementPage from "./pages/EngagementPage";
import CompetitionHistory from "./pages/CompetitionHistory";
import DebugSession from "./pages/DebugSession";
import DemoHealthCheckin from "./pages/DemoHealthCheckin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/hr-onboarding" element={<HROnboarding />} />
        <Route path="/leadership-onboarding" element={<LeadershipOnboarding />} />
        <Route path="/" element={<Index />} />
        <Route path="/health-status" element={<HealthStatus />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/hr-dashboard" element={<HRDashboard />} />
        <Route path="/telemedicine" element={<Telemedicine />} />
        <Route path="/concierge" element={<Concierge />} />
        <Route path="/partnerships" element={<Partnerships />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/engagement" element={<EngagementPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/hall-of-fame" element={<HallOfFame />} />
        <Route path="/queen/:userId" element={<QueenProfile />} />
        <Route path="/company" element={<CompanyDashboard />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/leadership" element={<LeadershipDashboard />} />
        <Route path="/competition-history" element={<CompetitionHistory />} />
        <Route path="/debug" element={<DebugSession />} />
        <Route path="/demo-checkin" element={<DemoHealthCheckin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OnboardingProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <UnifiedAuthGuard>
              <AnimatedRoutes />
            </UnifiedAuthGuard>
          </BrowserRouter>
        </UserProvider>
      </OnboardingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface UnifiedAuthGuardProps {
  children: React.ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/welcome", "/auth", "/onboarding", "/hr-onboarding", "/leadership-onboarding"];

// Routes that require completed onboarding
const PROTECTED_ROUTES_REQUIRE_ONBOARDING = [
  "/",
  "/health-status",
  "/campaigns",
  "/profile",
  "/hr-dashboard",
  "/telemedicine",
  "/concierge",
  "/partnerships",
  "/settings",
  "/notification-settings",
  "/engagement",
  "/admin",
  "/achievements",
  "/challenges",
  "/hall-of-fame",
  "/queen",
  "/company",
  "/company-profile",
  "/leadership",
  "/competition-history",
  "/debug",
];

export function UnifiedAuthGuard({ children }: UnifiedAuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => location.pathname === route || location.pathname.startsWith(route + "/")
    );

    // Allow public routes without authentication
    if (isPublicRoute) {
      return;
    }

    // Redirect unauthenticated users to auth page
    if (!isAuthenticated) {
      navigate("/auth", { state: { from: location.pathname }, replace: true });
      return;
    }
  }, [user, loading, isAuthenticated, location.pathname, navigate]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  // Block rendering for unauthenticated users on protected routes
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + "/")
  );

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}

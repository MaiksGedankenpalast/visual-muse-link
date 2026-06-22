import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/AuthGuard";
import AppLayout from "@/components/AppLayout";
import PWAInstallBanner from "@/components/PWAInstallBanner";

import Splash from "@/pages/Splash";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import OnboardingName from "@/pages/onboarding/OnboardingName";
import OnboardingWelcome from "@/pages/onboarding/OnboardingWelcome";
import OnboardingMood from "@/pages/onboarding/OnboardingMood";
import OnboardingGoals from "@/pages/onboarding/OnboardingGoals";
import OnboardingReady from "@/pages/onboarding/OnboardingReady";
import HomePage from "@/pages/HomePage";
import HomeSwiper from "@/pages/HomeSwiper";
import JournalPage from "@/pages/JournalPage";
import JournalNewPage from "@/pages/JournalNewPage";
import JournalDetailPage from "@/pages/JournalDetailPage";
import JournalDayPage from "@/pages/JournalDayPage";
import MoodTrackerPage from "@/pages/MoodTrackerPage";
import InsightsPage from "@/pages/InsightsPage";
import StreakDetailPage from "@/pages/StreakDetailPage";
import ExperimentPage from "@/pages/ExperimentPage";
import VibePage from "@/pages/VibePage";
import MicroWinsPage from "@/pages/MicroWinsPage";
import SettingsPage from "@/pages/SettingsPage";
import SanctuaryPage from "@/pages/SanctuaryPage";
import NotFound from "@/pages/NotFound";
import CorporateLogin from "@/pages/corporate/CorporateLogin";
import CorporateDashboard from "@/pages/corporate/CorporateDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PWAInstallBanner />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Corporate dashboard (pitch demo, no auth) */}
          <Route path="/corporate/login" element={<CorporateLogin />} />
          <Route path="/corporate" element={<CorporateDashboard />} />

          {/* Onboarding (requires auth but not onboarding complete) */}
          <Route path="/onboarding/name" element={<OnboardingName />} />
          <Route path="/onboarding/welcome" element={<OnboardingWelcome />} />
          <Route path="/onboarding/mood" element={<OnboardingMood />} />
          <Route path="/onboarding/goals" element={<OnboardingGoals />} />
          <Route path="/onboarding/ready" element={<OnboardingReady />} />

          {/* Protected routes with bottom nav */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomeSwiper />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/journal/new" element={<JournalNewPage />} />
              <Route path="/journal/day/:date" element={<JournalDayPage />} />
              <Route path="/journal/:id" element={<JournalDetailPage />} />
              <Route path="/moodtracker" element={<MoodTrackerPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/insights/streak-detail" element={<StreakDetailPage />} />
              <Route path="/sanctuary" element={<SanctuaryPage />} />
              <Route path="/experiment" element={<ExperimentPage />} />
              <Route path="/experiment/vibe" element={<VibePage />} />
              <Route path="/experiment/microwins" element={<MicroWinsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthGuard = () => {
  const { user, loading, onboardingComplete } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="arkie-float">
          <div className="w-12 h-12 rounded-full gradient-accent opacity-60" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/splash" replace />;
  }

  if (onboardingComplete === false) {
    return <Navigate to="/onboarding/name" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;

import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';

import OpeningScreen from './pages/OpeningScreen';
import AuthScreen from './pages/AuthScreen';
import ProfileSetupScreen from './pages/ProfileSetupScreen';
import HomeScreen from './pages/HomeScreen';
import SelfAnalysisScreen from './pages/SelfAnalysisScreen';
import CompanyAnalysisScreen from './pages/CompanyAnalysisScreen';
import IndustryAnalysisScreen from './pages/IndustryAnalysisScreen';
import SettingsScreen from './pages/SettingsScreen';
import GeminiTestScreen from './pages/GeminiTestScreen';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner'; // Import LoadingSpinner

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loadingAuth, userId } = useAuth(); // Added loadingAuth and userId
  const { profile, isLoading: profileLoading } = useProfile();
  const location = useLocation();

  if (loadingAuth || (isAuthenticated && userId && profileLoading)) { // Check if auth is loading or (if authenticated) profile is loading
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="情報を読み込み中..." size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If authenticated but no profile (and profile is done loading), redirect to profile setup,
  // unless already on profile-setup or trying to go there.
  if (isAuthenticated && !profile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loadingAuth } = useAuth(); // Added loadingAuth
  const location = useLocation();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Determine if Nav and Sidebar should be shown
  // Hide them during initial auth loading, on opening, auth, and profile-setup screens
  const showNavAndSidebar = !loadingAuth && isAuthenticated &&
                           location.pathname !== '/opening' &&
                           location.pathname !== '/auth' &&
                           location.pathname !== '/profile-setup';

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {showNavAndSidebar && <Navbar onMenuClick={() => setSidebarOpen(true)} />}
      <div className={`flex flex-1 overflow-hidden ${showNavAndSidebar ? 'pt-16' : ''}`}> {/* Adjust pt if Navbar height changes */}
        {showNavAndSidebar && <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 md:ml-64`}> {/* Restore margin for desktop */}
          <Routes>
            <Route path="/opening" element={<OpeningScreen />} />
            <Route path="/auth" element={<AuthScreen />} />
             <Route
              path="/profile-setup"
              element={
                // ProtectedRoute handles auth check and profile existence before reaching here.
                // If user is authenticated, they can access profile setup.
                // If not authenticated, ProtectedRoute (if wrapped) or direct check in AuthProvider/App.tsx logic would redirect to /auth.
                // For simplicity, direct check can be added if not wrapping with ProtectedRoute.
                // Here, assuming if they reach this, they are authenticated or redirect logic is handled by AuthProvider/ProtectedRoute.
                <ProfileSetupScreen /> 
              }
            />
            <Route path="/" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
            <Route path="/self-analysis" element={<ProtectedRoute><SelfAnalysisScreen /></ProtectedRoute>} />
            <Route path="/company-analysis" element={<ProtectedRoute><CompanyAnalysisScreen /></ProtectedRoute>} />
            <Route path="/industry-analysis" element={<ProtectedRoute><IndustryAnalysisScreen /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
            <Route path="/gemini-test" element={<ProtectedRoute><GeminiTestScreen /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/opening" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <ProfileProvider>
          <AppContent />
        </ProfileProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;

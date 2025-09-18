import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { DemoProvider } from './contexts/DemoContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SubAccountProvider } from './contexts/SubAccountContext';
import { useMaintenanceMode } from './hooks/useMaintenanceMode';
import { MaintenanceMode } from './components/MaintenanceMode';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Home } from './pages/Home';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { Dashboard } from './pages/Dashboard';
import { MyForms } from './pages/MyForms';
import { NewForm } from './pages/forms/NewForm';
import { EditForm } from './pages/forms/EditForm';
import { FormResults } from './pages/forms/FormResults';
import { PublicForm } from './pages/forms/PublicForm';
import { PDFTemplates } from './pages/pdf/PDFTemplates';
import { NewPDFTemplate } from './pages/pdf/NewPDFTemplate';
import { EditPDFTemplate } from './pages/pdf/EditPDFTemplate';
import { Settings } from './pages/Settings';
import { Support } from './pages/Support';
import { Subscription } from './pages/Subscription';
import { SuccessPage } from './pages/SuccessPage';
import { SubAccountLogin } from './pages/subaccounts/SubAccountLogin';
import { SubAccountDashboard } from './pages/subaccounts/SubAccountDashboard';

const AppContent: React.FC = () => {
  const { isMaintenanceMode, loading } = useMaintenanceMode();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isMaintenanceMode) {
    return <MaintenanceMode />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/form/:id" element={<PublicForm />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/sub-login/:mainAccountId" element={<SubAccountLogin />} />
          
          {/* Routes protégées */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <Dashboard />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/forms" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <MyForms />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/forms/new" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <NewForm />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/forms/:id/edit" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <EditForm />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/forms/:id/results" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <FormResults />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/pdf-templates" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <PDFTemplates />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/pdf-templates/new" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <NewPDFTemplate />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/pdf-templates/:id/edit" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <EditPDFTemplate />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <Settings />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/support" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <Support />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/subscription" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <Subscription />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/sub-dashboard" element={
            <ProtectedRoute>
              <div className="pb-16 md:pb-0">
                <Navbar />
                <SubAccountDashboard />
                <MobileBottomNav />
              </div>
            </ProtectedRoute>
          } />
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DemoProvider>
          <NotificationProvider>
            <SubAccountProvider>
              <AppContent />
            </SubAccountProvider>
          </NotificationProvider>
        </DemoProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
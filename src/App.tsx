import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DemoProvider } from './contexts/DemoContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SubAccountProvider } from './contexts/SubAccountContext';
import { pwaManager } from './main';
import { useMaintenanceMode } from './hooks/useMaintenanceMode';
import { MaintenanceMode } from './components/MaintenanceMode';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { PDFManager } from './pages/PDFManager';
import { Subscription } from './pages/Subscription';
import { SuccessPage } from './pages/SuccessPage';
import { Settings } from './pages/Settings';
import { SuperAdminDashboard } from './pages/admin/SuperAdminDashboard';
import { Support } from './pages/Support';
import { SubAccountLogin } from './pages/subaccounts/SubAccountLogin';
import { SubAccountDashboard } from './pages/subaccounts/SubAccountDashboard';
import { DemoTimer } from './components/demo/DemoTimer';
import { WelcomeModal } from './components/onboarding/WelcomeModal';
import { SupportNotificationToast } from './components/notifications/SupportNotificationToast';
import { TutorialTrigger } from './components/tutorial/TutorialTrigger';

// Composant d'erreur de fallback
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">🚨</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Oups ! Une erreur s'est produite
        </h1>
        <p className="text-gray-600 mb-6">
          SignFast a rencontré un problème technique. Nous nous excusons pour la gêne occasionnée.
        </p>
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg"
          >
            🔄 Réessayer
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all duration-300"
          >
            🏠 Retour à l'accueil
          </button>
        </div>
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Détails techniques
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const isPublicForm = location.pathname.startsWith('/form/');
  const [isMobile, setIsMobile] = React.useState(false);
  
  // Détecter si on est sur mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gérer la redirection PWA vers login
  React.useEffect(() => {
    const isPWA = pwaManager.isPWAMode();
    
    // Gestion PWA améliorée
    if (isPWA) {
      // Si on est dans une PWA et que l'utilisateur n'est pas connecté
      if (!user && !isPublicForm && location.pathname !== '/login' && location.pathname !== '/signup') {
        console.log('📱 PWA: Utilisateur non connecté, redirection vers login');
        navigate('/login?pwa=true', { replace: true });
      }
      
      // Si on est sur la page d'accueil en PWA et connecté, rediriger vers dashboard
      if (user && location.pathname === '/') {
        console.log('📱 PWA: Utilisateur connecté sur accueil, redirection vers dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, location.pathname, isPublicForm, navigate]);
  // Backend DnD adaptatif
  const dndBackend = isMobile ? TouchBackend : HTML5Backend;
  const dndOptions = isMobile ? { enableMouseEvents: true } : {};
  
  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');
  
  // Afficher le mode maintenance si activé et que l'utilisateur n'est pas super admin
  if (!maintenanceLoading && isMaintenanceMode && !isSuperAdmin) {
    return <MaintenanceMode />;
  }

  return (
    <DndProvider backend={dndBackend} options={dndOptions}>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isPublicForm ? '' : 'pb-16 md:pb-0'}`}>
        {/* Timer de démo affiché sur toutes les pages */}
        <DemoTimer />
        {/* Message d'accueil pour nouveaux utilisateurs */}
        <WelcomeModal />
        {/* Notifications support globales */}
        <SupportNotificationToast />
        {/* Tutoriel guidé pour nouveaux utilisateurs */}
        <TutorialTrigger />
        {!isPublicForm && <Navbar />}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms"
              element={
                <ProtectedRoute>
                  <MyForms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/new"
              element={
                <ProtectedRoute>
                  <NewForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:id/edit"
              element={
                <ProtectedRoute>
                  <EditForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:id/results"
              element={
                <ProtectedRoute>
                  <FormResults />
                </ProtectedRoute>
              }
            />
            <Route path="/form/:id" element={<PublicForm />} />
            <Route
              path="/pdf/templates"
              element={
                <ProtectedRoute>
                  <PDFTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdf/templates/new"
              element={
                <ProtectedRoute>
                  <NewPDFTemplate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdf/templates/:id/edit"
              element={
                <ProtectedRoute>
                  <EditPDFTemplate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdf/manager"
              element={
                <ProtectedRoute>
                  <PDFManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/success"
              element={
                <ProtectedRoute>
                  <SuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/support"
              element={
                <ProtectedRoute>
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route path="/sub-account/login" element={<SubAccountLogin />} />
            <Route path="/sub-account/dashboard" element={<SubAccountDashboard />} />
          </Routes>
        </main>
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
    </DndProvider>
  );
};

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
      }}
      onReset={() => {
        // Nettoyer le localStorage en cas d'erreur
        try {
          localStorage.removeItem('signfast_demo');
          sessionStorage.clear();
        } catch (e) {
        }
        window.location.reload();
      }}
    >
      <DemoProvider>
        <AuthProvider>
          <SubAccountProvider>
            <NotificationProvider>
              <Router>
                <AppContent />
              </Router>
            </NotificationProvider>
          </SubAccountProvider>
        </AuthProvider>
      </DemoProvider>
    </ErrorBoundary>
  );
}

export default App;
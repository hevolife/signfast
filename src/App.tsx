import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
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
import { PublicForm } from './pages/forms/PublicForm';
import { PDFTemplates } from './pages/pdf/PDFTemplates';
import { NewPDFTemplate } from './pages/pdf/NewPDFTemplate';
import { EditPDFTemplate } from './pages/pdf/EditPDFTemplate';
import { PDFManager } from './pages/PDFManager';
import { Subscription } from './pages/Subscription';
import { SuccessPage } from './pages/SuccessPage';
import { Settings } from './pages/Settings';
import { SuperAdminDashboard } from './pages/admin/SuperAdminDashboard';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isPublicForm = location.pathname.startsWith('/form/');

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isPublicForm ? '' : 'pb-16 md:pb-0'}`}>
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
        </Routes>
      </main>
      {!isPublicForm && <MobileBottomNav />}
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
  );
};
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
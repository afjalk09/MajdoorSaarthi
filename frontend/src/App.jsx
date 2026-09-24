import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerProfile from './pages/WorkerProfile';
import EmployerDashboard from './pages/EmployerDashboard';
import EmployerProfile from './pages/EmployerProfile';
import EditJob from './pages/EditJob';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import JobTracking from './pages/JobTracking';
import Disputes from './pages/Disputes';
import BrowseWorkers from './pages/BrowseWorkers';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-saffron-200 border-t-saffron-500 rounded-full animate-spin" />
            <p className="text-warm-500 font-medium">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" />;
    switch (user.role) {
      case 'WORKER':
        return <WorkerDashboard />;
      case 'EMPLOYER':
        return <EmployerDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      default:
        return <Navigate to="/" />;
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>{getDashboard()}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/profile"
        element={
          <ProtectedRoute allowedRoles={['WORKER']}>
            <Layout><WorkerProfile /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/profile"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <Layout><EmployerProfile /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/jobs/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <Layout><EditJob /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse-workers"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <Layout><BrowseWorkers /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout><Notifications /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id/track"
        element={
          <ProtectedRoute>
            <Layout><JobTracking /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/disputes"
        element={
          <ProtectedRoute>
            <Layout><Disputes /></Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors closeButton />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

import { Navigate } from 'react-router-dom';
import { getUser, isLoggedIn, ROLE_HOME } from '../utils/auth';

// Wrap a dashboard element: <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
// - not logged in -> sent to /login
// - logged in but wrong role -> sent to their own dashboard, not an error page
export default function ProtectedRoute({ role, children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (role && user?.role !== role) {
    return <Navigate to={ROLE_HOME[user?.role] || '/login'} replace />;
  }

  return children;
}

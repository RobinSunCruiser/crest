/**
 * ProtectedRoute Component
 *
 * Authentication guard for routes that require user login.
 * Redirects unauthenticated users to the home page.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { socketService } from '@/shared/services';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps routes that require authentication
 * Redirects to home page if user is not authenticated
 *
 * Note: React Router automatically handles the basename (base path),
 * so we redirect to "/" which resolves correctly whether the app is
 * deployed at root or in a subdirectory (e.g., /crest/)
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = socketService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to home page where auth overlay will appear
    // Save the intended location for potential post-login redirect
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

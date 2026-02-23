import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import EventsPage from './pages/EventsPage';
import MemberRequestsPage from './pages/MemberRequestsPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import PostsPage from './pages/PostsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route
                path="/member-requests"
                element={
                  <ProtectedRoute roles={['Sub-Manager', 'Manager', 'Admin', 'Super Admin']}>
                    <MemberRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={['Admin', 'Super Admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute roles={['Admin', 'Super Admin']}>
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              className: '!bg-white dark:!bg-dark-surface !text-surface-900 dark:!text-surface-100 !shadow-lg !border !border-surface-200 dark:!border-dark-border',
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

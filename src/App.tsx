import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout, PublicLayout } from './components/layout/Layout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClubsPage } from './pages/ClubsPage';
import { ClubDetailPage } from './pages/ClubDetailPage';
import { EditClubPage } from './pages/EditClubPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EditEventPage } from './pages/EditEventPage';
import { MembersPage } from './pages/MembersPage';
import { AttendancePage } from './pages/AttendancePage';
import { BudgetPage } from './pages/BudgetPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminClubsPage } from './pages/AdminClubsPage';
import { SendNotificationsPage } from './pages/SendNotificationsPage';
import { AdminLeaveRequestsPage } from './pages/AdminLeaveRequestsPage';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicLayout>
                  <LoginPage />
                </PublicLayout>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicLayout>
                  <SignupPage />
                </PublicLayout>
              }
            />

            {/* Protected Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="clubs" element={<ClubsPage />} />
              <Route path="clubs/:id" element={<ClubDetailPage />} />
              <Route path="clubs/:id/edit" element={<EditClubPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="events/new" element={<CreateEventPage />} />
              <Route path="events/:id" element={<EventDetailPage />} />
              <Route path="events/:id/edit" element={<EditEventPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="notifications/send" element={<SendNotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Admin Routes */}
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/clubs" element={<AdminClubsPage />} />
              <Route path="admin/leave-requests" element={<AdminLeaveRequestsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

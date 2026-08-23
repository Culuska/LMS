import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { Notifications } from './pages/Notifications';
import { MyCourses } from './pages/student/MyCourses';
import { CourseWorkspace } from './pages/student/CourseWorkspace';
import { Transcript } from './pages/student/Transcript';
import { MyOfferings } from './pages/lecturer/MyOfferings';
import { OfferingGradebook } from './pages/lecturer/OfferingGradebook';
import { OfferingContent } from './pages/lecturer/OfferingContent';
import { AcademicStructure } from './pages/admin/AcademicStructure';
import { Applications } from './pages/admin/Applications';
import { UsersAndRoles } from './pages/admin/UsersAndRoles';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Outside AppLayout deliberately — AppLayout redirects here whenever
            mustChangePassword is true, so this route can't itself be behind that guard. */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Exact-match index route for "/" — without this, the sibling "*" below
              (NotFound) and the outer top-level "*" (redirect) tie in specificity,
              and NotFound wins the tiebreak by declaration order. An index route
              always outranks a wildcard, so this guarantees "/" redirects correctly
              regardless of route order. */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/my-courses/:offeringId" element={<CourseWorkspace />} />
          <Route path="/transcript" element={<Transcript />} />
          <Route path="/my-offerings" element={<MyOfferings />} />
          <Route path="/my-offerings/:offeringId" element={<OfferingGradebook />} />
          <Route path="/my-offerings/:offeringId/content" element={<OfferingContent />} />
          <Route path="/admin/academic-structure" element={<AcademicStructure />} />
          <Route path="/admin/applications" element={<Applications />} />
          <Route path="/admin/users" element={<UsersAndRoles />} />
          {/* Catches any authenticated dead-end with a real 404 rather than a silent
              bounce; unauthenticated visitors never reach this — ProtectedRoute sends
              them to /login first. */}
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

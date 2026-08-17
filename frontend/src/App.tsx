import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Notifications } from './pages/Notifications';
import { MyCourses } from './pages/student/MyCourses';
import { Transcript } from './pages/student/Transcript';
import { MyOfferings } from './pages/lecturer/MyOfferings';
import { OfferingGradebook } from './pages/lecturer/OfferingGradebook';
import { AcademicStructure } from './pages/admin/AcademicStructure';
import { Applications } from './pages/admin/Applications';
import { UsersAndRoles } from './pages/admin/UsersAndRoles';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/transcript" element={<Transcript />} />
          <Route path="/my-offerings" element={<MyOfferings />} />
          <Route path="/my-offerings/:offeringId" element={<OfferingGradebook />} />
          <Route path="/admin/academic-structure" element={<AcademicStructure />} />
          <Route path="/admin/applications" element={<Applications />} />
          <Route path="/admin/users" element={<UsersAndRoles />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

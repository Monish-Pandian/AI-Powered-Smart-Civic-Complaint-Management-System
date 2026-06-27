import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import Landing from "./pages/Landing";
import CreateComplaint from "./pages/CreateComplaint";
import MyComplaints from "./pages/MyComplaints";
import Heatmap from "./pages/HeatMap";
import Officers from "./pages/Officers";
import CreateOfficer from "./pages/CreateOfficer";
import EditOfficer from "./pages/EditOfficer";
import ProtectedRoute from "./components/common/ProtectedRoute";

import "leaflet/dist/leaflet.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* COMPLAINTS */}
        <Route
          path="/complaints"
          element={
            <ProtectedRoute roles={["Admin", "Officer"]}>
              <Complaints />
            </ProtectedRoute>
          }
        />

        {/* HEATMAP */}
        <Route
          path="/heatmap"
          element={
            <ProtectedRoute roles={["Admin", "Officer"]}>
              <Heatmap />
            </ProtectedRoute>
          }
        />

        {/* OFFICER MANAGEMENT */}
        <Route
          path="/officers"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <Officers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/officers/create"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <CreateOfficer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/officers/edit/:id"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <EditOfficer />
            </ProtectedRoute>
          }
        />

        {/* CITIZEN */}
        <Route
          path="/my-complaints"
          element={
            <ProtectedRoute roles={["User"]}>
              <MyComplaints />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-complaint"
          element={
            <ProtectedRoute roles={["User","Admin"]}>
              <CreateComplaint />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
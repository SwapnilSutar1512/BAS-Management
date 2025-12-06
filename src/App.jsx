import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ContractorDashboard from "./pages/roles/ContractorDashboard.jsx";
import JuniorDashboard from "./pages/roles/JuniorDashboard.jsx";
import AccountsOfficerDashboard from "./pages/roles/AccountsOfficerDashboard.jsx";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/contractor"
          element={
            <ProtectedRoute>
              <ContractorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/junior-engineer"
          element={
            <ProtectedRoute>
              <JuniorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts-officer"
          element={
            <ProtectedRoute>
              <AccountsOfficerDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import UploadExcel from "../../components/UploadExcel.jsx";
import "../../styles/Dashboard.css";

export default function JuniorDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Junior Engineer Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <UploadExcel />
    </div>
  );
}

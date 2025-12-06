import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import "../styles/Dashboard.css";

export default function UploadExcel() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const uploadExcel = async () => {
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("jwt");

      if (!token) {
        setMessage("Authentication required. Please login again.");
        setLoading(false);
        return;
      }

      if (!user || !user.role) {
        setMessage("User role not found. Please login again.");
        setLoading(false);
        return;
      }

      // Only Junior Engineers can upload
      if (user.role !== "JUNIOR_ENGINEER") {
        setMessage("You do not have permission to upload files. Only Junior Engineers can upload.");
        setLoading(false);
        return;
      }

      const uploadEndpoint = "http://localhost:8085/je/upload";

      // Prepare form data for MultipartFile upload
      const formData = new FormData();
      formData.append("file", file);

      // Call API with Authorization header (Bearer <token>)
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // NOTE: Do NOT set Content-Type with FormData; fetch will handle it automatically!
        },
        body: formData,
      });

      if (res.status === 401) {
        setMessage("Unauthorized. Please login again.");
        setFile(null);
        document.querySelector('input[type="file"]').value = "";
        setLoading(false);
        return;
      }

      if (res.status === 403) {
        setMessage("Access denied. You do not have permission to upload files with your current role.");
        setFile(null);
        document.querySelector('input[type="file"]').value = "";
        setLoading(false);
        return;
      }

      const responseText = await res.text();

      if (res.ok) {
        setMessage(
          responseText.includes("successfully")
            ? responseText
            : "Excel uploaded successfully!"
        );
        setFile(null);
        document.querySelector('input[type="file"]').value = "";
      } else {
        setMessage(
          responseText
            ? `Failed to upload Excel: ${responseText}`
            : `Upload failed (Status: ${res.status})`
        );
      }
    } catch (e) {
      console.error("Upload error:", e);
      setMessage(
        e.message && (e.message === "Failed to fetch" || e.message.includes("NetworkError"))
          ? "Network error: Cannot connect to server. Please check if the server is running."
          : `Error: ${e.message || "Server error occurred"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-card">
      <h3>Upload Work Measurement Excel</h3>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        className="upload-btn"
        onClick={uploadExcel}
        disabled={loading}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
      {message && (
        <p
          style={{
            marginTop: "10px",
            padding: "8px",
            borderRadius: "4px",
            backgroundColor: message.includes("successfully") ? "#d4edda" : "#f8d7da",
            color: message.includes("successfully") ? "#155724" : "#721c24",
            border: `1px solid ${message.includes("successfully") ? "#c3e6cb" : "#f5c6cb"}`
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

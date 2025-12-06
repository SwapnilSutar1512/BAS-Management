import { useState, useEffect } from "react";
import api from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const role = user.role;
      if (role === "CONTRACTOR") navigate("/contractor");
      else if (role === "JUNIOR_ENGINEER") navigate("/junior-engineer");
      else if (role === "ACCOUNTS_OFFICER") navigate("/accounts-officer");
      else navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", { username, password });

      const token = res.data.token;

      // save token in context (this also saves to localStorage)
      login(token);

      // decode role from JWT
      const decoded = jwtDecode(token);
      const role = decoded.role;

      console.log("Decoded Token:", decoded);

      // role based navigation
      if (role === "CONTRACTOR") navigate("/contractor");
      else if (role === "JUNIOR_ENGINEER") navigate("/junior-engineer");
      else if (role === "ACCOUNTS_OFFICER") navigate("/accounts-officer");
      else navigate("/");
    } catch (err) {
      alert("Invalid Username or Password");
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="login-container">
        <div className="login-box">Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>BAS Login</h2>

        <input
          type="text"
          placeholder="Username"
          onChange={(e) => setUser(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPass(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

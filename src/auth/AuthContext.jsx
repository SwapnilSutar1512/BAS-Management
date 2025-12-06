import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check localStorage on mount to restore authentication
  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp && decoded.exp < currentTime) {
          // Token expired, remove it
          localStorage.removeItem("jwt");
          setLoading(false);
          return;
        }
        setUser(decoded);
        setToken(storedToken);
      } catch (error) {
        // Invalid token, remove it
        console.error("Invalid token:", error);
        localStorage.removeItem("jwt");
      }
    }
    setLoading(false);
  }, []);

  const login = (jwt) => {
    try {
      const decoded = jwtDecode(jwt); // decode role
      setUser(decoded);
      setToken(jwt);
      localStorage.setItem("jwt", jwt);
    } catch (error) {
      console.error("Error decoding token:", error);
      localStorage.removeItem("jwt");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("jwt");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

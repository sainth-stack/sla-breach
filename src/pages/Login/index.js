import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { DEFAULT_PATH_FOR_LIMITED_USER } from "../../utils/permissions";
import "./index.css";

// Only these two users; admin has full access, other user has limited (kedb + web-suggested-actions)
const HARDCODED_USERS = [
  { name: "Admin", email: "admin@gmail.com", password: "Test@123", isSuperAdmin: true },
  { name: "Siva Yanamandra", email: "siva.yanamandra@seleccionconsulting.com", password: "A7k#P2xQ", isSuperAdmin: false },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // If already logged in, redirect based on permission (don't show login form)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    const user = getStoredUser();
    if (token && isAuth && user) {
      const isSuperAdmin = !!(user.isSuperAdmin);
      const defaultPath = isSuperAdmin ? "/" : DEFAULT_PATH_FOR_LIMITED_USER;
      navigate(defaultPath, { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);

    const user = HARDCODED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (user && user.password === password) {
      const userData = {
        email: user.email,
        name: user.name,
        isAuthenticated: true,
        isSuperAdmin: user.isSuperAdmin || false,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", "authenticated");
      localStorage.setItem("isAuthenticated", "true");

      message.success(`Welcome ${user.name}!`);

      setTimeout(() => {
        navigate(user.isSuperAdmin ? "/" : "/kedb");
      }, 500);
    } else {
      message.error("Invalid email or password. Please check your credentials.");
    }

    setLoading(false);
  };

  return (
    <div className="login-container-centered">
      <div className="login-form-panel-centered">
        <div className="login-form-wrapper">
          <div className="login-form">
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to your account to continue</p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="label2" htmlFor="email">
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your company email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="label2" htmlFor="password">
                  Password
                </label>
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <div
                    className="eye-icon-container"
                    onClick={() => setShowPassword(!showPassword)}
                    onKeyDown={(e) => e.key === "Enter" && setShowPassword((v) => !v)}
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <MdVisibilityOff className="eye3" size={18} />
                    ) : (
                      <MdVisibility className="eye3" size={18} />
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`login-button ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

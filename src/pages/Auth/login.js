import eye from "../../assets/svg/eye-fill.svg";
import eye2 from "../../assets/svg/eye-slash.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import './index.css';

// Hardcoded user data
const HARDCODED_USERS = [
  { name: "Krishna Tirumala Reddy", email: "Krishna.tirumalareddy@seleccionconsulting.com", isSuperAdmin: true },
  { name: "Battula Hima Sri", email: "hima.sri@seleccionconsulting.com" },
  { name: "Das Mistoo", email: "mistoo.das@seleccionconsulting.com" },
  { name: "Gopal Ravi", email: "ravi.gopal@seleccionconsulting.com" },
  { name: "Jaleel Mohammed", email: "mohammedjaleel.shaik@seleccionconsulting.com" },
  { name: "Kumari Antima", email: "antima.kumari@seleccionconsulting.com" },
  { name: "Kuntal Patel", email: "kuntal.patel@seleccionconsulting.com" },
  { name: "Menon Nivhin", email: "nivhin.menon@seleccionconsulting.com" },
  { name: "Murugesan Venkatesan", email: "venkatesan.murugesan@seleccionconsulting.com" },
  { name: "Narayanan Balaji", email: "balaji.narayanan@seleccionconsulting.com" },
  { name: "NETKE AKSHAY", email: "akshay.netke@seleccionconsulting.com" },
  { name: "Nookala Maheedhar", email: "maheedhar.nookala@seleccionconsulting.com" },
  { name: "Patel Ankit", email: "ankit.patel@seleccionconsulting.com" },
  { name: "SANDEEP SV Guru", email: "sandeep.sankavenkata@seleccionconsulting.com" },
  { name: "Shatabdi Roy", email: "shatabdi.roy@seleccionconsulting.com" },
  { name: "Sundarrajan Alagudurai", email: "alagudurai.s@seleccionconsulting.com" },
  { name: "Tushar Adit", email: "adit.paleja@seleccionconsulting.com" },
  { name: "URKUNDE Shubham", email: "shubham.urkunde@seleccionconsulting.com" },
  { name: "Vasanthakumari Pradheepasokan", email: "pradheep.av@seleccionconsulting.com" },
  { name: "Shubham Thube", email: "shubham.thube@seleccionconsulting.com" }
];

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const [showDemoUsers, setShowDemoUsers] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);

    // Check password first
    if (password !== 'Test@123') {
      message.error('Invalid password. Please use: Test@123');
      setLoading(false);
      return;
    }

    // Find user by email
    const user = HARDCODED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      // Store user data in localStorage
      const userData = {
        email: user.email,
        name: user.name,
        isAuthenticated: true,
        isSuperAdmin: user.isSuperAdmin || false,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', 'authenticated');
      localStorage.setItem('isAuthenticated', 'true');
      
      message.success(`Welcome ${user.name}!`);
      
      // Navigate to main app
      setTimeout(() => {
        navigate('/');
      }, 500);
    } else {
      message.error('Invalid email address. Please check your email.');
    }
    
    setLoading(false);
  };

  const handleDemoUserClick = (userEmail) => {
    setEmail(userEmail);
    setShowDemoUsers(false);
  };

  return (
    <div className="login-container-centered">
      {/* Centered Login form */}
      <div className="login-form-panel-centered">
        <div className="login-form-wrapper">
          {/* Login form */}
          <div className="login-form">
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to your account to continue</p>

            <form onSubmit={handleLogin}>
              {/* Email field */}
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

              {/* Password field */}
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
                    aria-label="Toggle password visibility"
                  >
                    <img
                      className="eye3"
                      src={showPassword ? eye2 : eye}
                      alt="Toggle password visibility"
                    />
                  </div>
                </div>

              </div>

              {/* Login button */}
              <button
                type="submit"
                className={`login-button ${loading ? 'loading' : ''}`}
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
};
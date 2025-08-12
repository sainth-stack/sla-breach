import eye from "../../assets/svg/eye-fill.svg";
import eye2 from "../../assets/svg/eye-slash.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import './index.css';

// Hardcoded user data with secure passwords
const HARDCODED_USERS = [
  { name: "Admin", email: "admin@gmail.com", password: "Test@123", isSuperAdmin: true },
  { name: "Krishna Tiruma Reddy", email: "krishna.tirumareddy@seleccionconsulting.com", password: "KTR#9p$mN2", isSuperAdmin: true },
  { name: "Battula Hima Sri", email: "hima.sri@seleccionconsulting.com", password: "BHS@8k$vL5" },
  { name: "Das Mistoo", email: "mistoo.das@seleccionconsulting.com", password: "DM#7j$xK9" },
  { name: "Gopal Ravi", email: "ravi.gopal@seleccionconsulting.com", password: "GR#5h$wP3" },
  { name: "Jaleel Mohammed", email: "mohammedjaleel.shaik@seleccionconsulting.com", password: "JM@4m$nQ7" },
  { name: "Kumari Antima", email: "antima.kumari@seleccionconsulting.com", password: "KA#6t$yR8" },
  { name: "Kuntal Patel", email: "kuntal.patel@seleccionconsulting.com", password: "KP@9s$bH4" },
  { name: "Menon Nivhin", email: "nivhin.menon@seleccionconsulting.com", password: "MN#3f$cJ6" },
  { name: "Murugesan Venkatesan", email: "venkatesan.murugesan@seleccionconsulting.com", password: "MV@7d$gL2" },
  { name: "Narayanan Balaji", email: "balaji.narayanan@seleccionconsulting.com", password: "NB#4k$pH8" },
  { name: "NETKE AKSHAY", email: "akshay.netke@seleccionconsulting.com", password: "NA@2m$vT5" },
  { name: "Nookala Maheedhar", email: "maheedhar.nookala@seleccionconsulting.com", password: "NM#8h$bR3" },
  { name: "Patel Ankit", email: "ankit.patel@seleccionconsulting.com", password: "PA@5j$nW7" },
  { name: "SANDEEP SV Guru", email: "sandeep.sankavenkata@seleccionconsulting.com", password: "SS#6f$mK9" },
  { name: "Shatabdi Roy", email: "shatabdi.roy@seleccionconsulting.com", password: "SR@3h$pL4" },
  { name: "Sundarrajan Alagudurai", email: "alagudurai.s@seleccionconsulting.com", password: "SA#7k$tQ2" },
  { name: "Tushar Adit", email: "adit.paleja@seleccionconsulting.com", password: "TA@4n$wH6" },
  { name: "URKUNDE Shubham", email: "shubham.urkunde@seleccionconsulting.com", password: "US#9m$cR5" },
  { name: "Vasanthakumari Pradheepasokan", email: "pradheep.av@seleccionconsulting.com", password: "VP@2s$jL8" },
  { name: "Shubham Thube", email: "shubham.thube@seleccionconsulting.com", password: "ST#5f$bK7" }
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

    // Find user by email
    const user = HARDCODED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user && user.password === password) {
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
      message.error('Invalid email or password. Please check your credentials.');
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
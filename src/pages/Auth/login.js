import Logo from "../../assets/images/Logo2.jpg";
import loginbg from "../../assets/svg/bg.jpg";
import eye from "../../assets/svg/eye-fill.svg";
import eye2 from "../../assets/svg/eye-slash.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import './index.css';

// Hardcoded user data
const HARDCODED_USERS = [
    {name:'vijay gunti',email:'vijay.gunti@gmail.com',isSuperAdmin:true},
  { name: "BOCCIA ANNALISA", email: "boccia.annalisa@company.com" },
  { name: "Barci Klea", email: "barci.klea@company.com" },
  { name: "Battula Hima Sri", email: "battula.himasri@company.com" },
  { name: "Comina Annarita", email: "comina.annarita@company.com" },
  { name: "Cowan Kelly", email: "cowan.kelly@company.com" },
  { name: "Das Mistoo", email: "das.mistoo@company.com" },
  { name: "Dewald Michael", email: "dewald.michael@company.com" },
  { name: "Dhanasekaran Senthil Kumar", email: "dhanasekaran.senthilkumar@company.com" },
  { name: "Dos Reis Silva Thiago", email: "dosreissilva.thiago@company.com" },
  { name: "Emrecan Arslantas", email: "emrecan.arslantas@company.com" },
  { name: "Erdogan Ahmet", email: "erdogan.ahmet@company.com" },
  { name: "Espinosa Luis", email: "espinosa.luis@company.com" },
  { name: "Fejzaj Iljana", email: "fejzaj.iljana@company.com" },
  { name: "Felice Mederos Fabio Nicola", email: "felicemederos.fabionicola@company.com" },
  { name: "Gopal Ravi", email: "gopal.ravi@company.com" },
  { name: "Graells Pol", email: "graells.pol@company.com" },
  { name: "He Iris", email: "he.iris@company.com" },
  { name: "Jaleel Mohammed", email: "jaleel.mohammed@company.com" },
  { name: "Kiruthiga T Sri", email: "kiruthiga.tsri@company.com" },
  { name: "Koontz Darrian", email: "koontz.darrian@company.com" },
  { name: "Kumari Antima", email: "kumari.antima@company.com" },
  { name: "Kuntal Patel", email: "kuntal.patel@company.com" },
  { name: "LIU Yanissa", email: "liu.yanissa@company.com" },
  { name: "La Pasta Giuseppe", email: "lapasta.giuseppe@company.com" },
  { name: "Lowe Adam", email: "lowe.adam@company.com" },
  { name: "Magee Ryan", email: "magee.ryan@company.com" },
  { name: "Marques Diane", email: "marques.diane@company.com" },
  { name: "Menon Nivhin", email: "menon.nivhin@company.com" },
  { name: "Murugesan Venkatesan", email: "murugesan.venkatesan@company.com" },
  { name: "NETKE AKSHAY", email: "netke.akshay@company.com" },
  { name: "Narendra Verabhadra", email: "narendra.verabhadra@company.com" },
  { name: "Nookala Maheedhar", email: "nookala.maheedhar@company.com" },
  { name: "Ortega Ignacio", email: "ortega.ignacio@company.com" },
  { name: "Patel Ankit", email: "patel.ankit@company.com" },
  { name: "QUIAMBAO Pat", email: "quiambao.pat@company.com" },
  { name: "Rafael Reyes", email: "rafael.reyes@company.com" },
  { name: "SANDEEP SV Guru", email: "sandeep.svguru@company.com" },
  { name: "SAP Finance North America", email: "sap.financenorthamerica@company.com" },
  { name: "SAP Tr-Finance (FICO) SAP Retail (FMS1) NA", email: "sap.trfinance.fico@company.com" },
  { name: "SAP Tr-Logistics (SCM) SAP Retail (FMS1) NA", email: "sap.trlogistics.scm@company.com" },
  { name: "SAP Tr-MDM (Master Data) SAP Retail (FMS1) NA", email: "sap.trmdm.masterdata@company.com" },
  { name: "Sadikaj Advina", email: "sadikaj.advina@company.com" },
  { name: "Sebial Karen", email: "sebial.karen@company.com" },
  { name: "Shatabdi Roy", email: "shatabdi.roy@company.com" },
  { name: "Skoko Mario", email: "skoko.mario@company.com" },
  { name: "Soares Angela", email: "soares.angela@company.com" },
  { name: "Sundarrajan Alagudurai", email: "sundarrajan.alagudurai@company.com" },
  { name: "Thube Shubham", email: "thube.shubham@company.com" },
  { name: "Tirumareddy Jayakrisha", email: "tirumareddy.jayakrisha@company.com" },
  { name: "Tushar Adit", email: "tushar.adit@company.com" },
  { name: "URKUNDE Shubham", email: "urkunde.shubham@company.com" },
  { name: "Vasanthakumari Pradheepasokan", email: "vasanthakumari.pradheepasokan@company.com" },
  { name: "Venkatachalam Sivaraman", email: "venkatachalam.sivaraman@company.com" },
  { name: "Vieceli Marina", email: "vieceli.marina@company.com" },
  { name: "Ye Henry", email: "ye.henry@company.com" },
  { name: "Zhang Lexi", email: "zhang.lexi@company.com" }
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
    <div className="login-container">
      {/* Left side - Login form */}
      <div className="login-form-panel">
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

      {/* Right side - Background image */}
      <div className="login-bg-panel">
        <img 
          className="login-bg-image" 
          src={loginbg} 
          alt="Login background" 
        />
      </div>
    </div>
  );
};
/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
import "./styles.css";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const handleLogout = () => {
    // Clear all authentication data from localStorage
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("username")
    localStorage.removeItem("email")
    localStorage.removeItem("_id")
    
    // Navigate to login page
    navigate('/login')
  }
  
  let location = useLocation();
  
  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }
  }, []);

  return (
    <>
      <nav className="simple-nav">
        <div className="nav-right">
          <div className="user-dropdown-container">
            <button
              className="user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {currentUser?.name || 'User'}
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showUserMenu && (
              <div className="dropdown-menu-absolute">
                <div className="dropdown-email">
                  {currentUser?.email || 'user@company.com'}
                </div>
                <button className="dropdown-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Click outside to close */}
      {showUserMenu && (
        <div 
          className="overlay"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
}

export default Navbar;

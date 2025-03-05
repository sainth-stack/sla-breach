/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
// import "./styles.scss";
// import userprofile from '../../assets/images/userprofile.png'
import { useNavigate } from "react-router-dom";
// import Logo from '../../assets/images/logo3.png'
import { AiTwotoneCalendar } from 'react-icons/ai'
import { useLocation } from "react-router-dom";
function Navbar() {
  const navigate = useNavigate()
  const [name, setName] = useState("Dashboard")
  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate('/login')
  }
  let location = useLocation();
  useEffect(() => {
    if (location.pathname == '/productivity') {
      setName("Productivity")
    } else if (location.pathname == '/resilience') {
      setName("Resilience")
    } else if (location.pathname == '/sustainability') {
      setName("Sustainability")
    } else if (location.pathname == '/reports' || location.pathname=='/review-report') {
      setName("Reports")
    } else {
      setName("KProcess")
    }
  }, [location.pathname])


  return (
    <>
      <nav class="navbar navbar-expand-lg  navbar-light bg-white shadow-sm sticky-top bg-white-fixed">
        <div class="collapse navbar-collapse" style={{ marginLeft: '0px',paddingLeft:'40px'}} id="navbarNav">
          {/* <img
            src={Logo}
            style={{ width: '70px',height:'70px' }}
            id="logo_RL"
          /> */}
        </div>

        <div className="position-absolute w-100 d-flex justify-content-center" style={{ pointerEvents: 'none' }}>
          {/* <h2 style={{fontSize:'30px',fontWeight:'bold'}} className="m-0">DataPX1</h2> */}
        </div>

  
      </nav>
    </>

  );

}
export default Navbar;

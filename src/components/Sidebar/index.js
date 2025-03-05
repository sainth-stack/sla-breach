import React from "react";
import { LuHdmiPort } from "react-icons/lu";
import { BiAnalyse } from "react-icons/bi";
import { RiFileWarningLine } from "react-icons/ri";
import { AiOutlineRobot } from "react-icons/ai";
import { IoStatsChartOutline } from "react-icons/io5";
import { Link, useLocation } from "react-router-dom";
import "./styles.css"; // Separate CSS file for animations

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="main-container">
      <nav className="sidebar shadow sidebar-scroll sticky-top">
        <ul className="sidebar-list" id="menu">
          {/* <li className={`sidebar-item mt-1 ${['/home', '/'].includes(location.pathname) ? "active" : ""}`}>
            <Link to="/" className="sidebar-link">
              <LuHdmiPort size={20} />
              <span className="link-text">SLA BREACH Manual</span>
            </Link>
          </li> */}
          <li className={`sidebar-item mt-2 ${location.pathname === "/" ? "active" : ""}`}>
            <Link to="/" className="sidebar-link">
              <BiAnalyse size={20} />
              <span className="link-text">SLA BREACH Automatic</span>
            </Link>
          </li>
          {/* <li className={`sidebar-item mt-2 ${location.pathname === "/missing-value" ? "active" : ""}`}>
            <Link to="/missing-value" className="sidebar-link">
              <RiFileWarningLine size={20} />
              <span className="link-text">Missing Value Treatment</span>
            </Link>
          </li>
          <li className={`sidebar-item mt-2 ${location.pathname === "/ai-models" ? "active" : ""}`}>
            <Link to="/ai-models" className="sidebar-link">
              <AiOutlineRobot size={20} />
              <span className="link-text">AI and Models</span>
            </Link>
          </li>
          <li className={`sidebar-item mt-2 ${location.pathname === "/kpi" ? "active" : ""}`}>
            <Link to="/kpi" className="sidebar-link">
              <IoStatsChartOutline size={20} />
              <span className="link-text">KPI</span>
            </Link>
          </li> */}
        </ul>
      </nav>
    </div>
  );
}

import React, { useState } from "react";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import { Link, useLocation } from "react-router-dom";
import "./styles.css";

export default function Sidebar() {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    sla: true,
    incidentManagement: true,
    troubleshooting: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="main-container1">
      <nav className="sidebar">
        <ul className="sidebar-list">
          {/* Data Source Section */}
          <li className="sidebar-section" style={{marginTop: '10px'}}>
            <ul className="subsection-list">
              <li className={`sidebar-item subsection ${location.pathname === "/data-source" ? "active" : ""}`}>
                <Link to="/data-source" className="sidebar-link">
                  <span className="link-text">Data Source</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* SLA Section */}
          <li className="sidebar-section">
            <div 
              className="section-header" 
              onClick={() => toggleSection('sla')}
              role="button"
              tabIndex={0}
            >
              <span className="section-title">SLA</span>
              {expandedSections.sla ? 
                <RiArrowDownSLine size={16} className="chevron-icon" /> : 
                <RiArrowRightSLine size={16} className="chevron-icon" />
              }
            </div>
            {expandedSections.sla && (
              <ul className="subsection-list">
                <li className={`sidebar-item subsection ${location.pathname === "/self-monitoring" ? "active" : ""}`}>
                  <Link to="/self-monitoring" className="sidebar-link">
                    <span className="link-text">Self Monitoring</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Incident Management Section */}
          <li className="sidebar-section">
            <div 
              className="section-header" 
              onClick={() => toggleSection('incidentManagement')}
              role="button"
              tabIndex={0}
            >
              <span className="section-title">Incident Management</span>
              {expandedSections.incidentManagement ? 
                <RiArrowDownSLine size={16} className="chevron-icon" /> : 
                <RiArrowRightSLine size={16} className="chevron-icon" />
              }
            </div>
            {expandedSections.incidentManagement && (
              <ul className="subsection-list">
                <li className={`sidebar-item subsection ${location.pathname === "/incident-management" ? "active" : ""}`}>
                  <Link to="/incident-management" className="sidebar-link">
                    <span className="link-text">Classification</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          
          {/* Troubleshooting Section */}
          <li className="sidebar-section">
            <div 
              className="section-header" 
              onClick={() => toggleSection('troubleshooting')}
              role="button"
              tabIndex={0}
            >
              <span className="section-title">Troubleshooting</span>
              {expandedSections.troubleshooting ? 
                <RiArrowDownSLine size={16} className="chevron-icon" /> : 
                <RiArrowRightSLine size={16} className="chevron-icon" />
              }
            </div>
            {expandedSections.troubleshooting && (
              <ul className="subsection-list">
                <li className={`sidebar-item subsection ${location.pathname === "/kedb" ? "active" : ""}`}>
                  <Link to="/kedb" className="sidebar-link">
                    <span className="link-text">KEDB & Web Search</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
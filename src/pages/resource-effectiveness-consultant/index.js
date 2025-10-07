import React from 'react';
import ConsultantWise from '../bi-report/ConsultantWise';
import './index.css';

const ResourceEffectivenessConsultant = () => {
  return (
    <div className="resource-effectiveness-consultant-container">
      <div className="resource-effectiveness-header">
        <h1>% of Incidents Resolved and Trend - Consultant Wise</h1>
        <p>View incidents resolution performance by consultant</p>
      </div>
      
      <div className="consultant-section">
        <ConsultantWise />
      </div>
    </div>
  );
};

export default ResourceEffectivenessConsultant;

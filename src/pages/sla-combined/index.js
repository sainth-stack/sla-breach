import React from 'react';
import TktsSLAsTable from '../bi-report/TktsSLAsTable';
import TktsSLAsChart from '../bi-report/TktsSLAsChart';
import './index.css';

const SLACombined = () => {
  return (
    <div className="sla-combined-container">
      <div className="sla-combined-header">
        <h1>Resolution and Response Time SLA</h1>
        <p>View both tickets SLA table and chart for comprehensive analysis</p>
      </div>
      
      <div className="sla-section">
        <div className="section-header">
          <h2>Tickets SLA Table</h2>
        </div>
        <div className="table-container">
          <TktsSLAsTable />
        </div>
      </div>
      
      <div className="sla-section">
        <div className="section-header">
          <h2>Tickets SLA Chart</h2>
        </div>
        <div className="chart-container">
          <TktsSLAsChart />
        </div>
      </div>
    </div>
  );
};

export default SLACombined;

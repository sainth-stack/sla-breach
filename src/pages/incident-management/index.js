import React, { useState, useEffect } from 'react';
import './index.css';
import FloatingChatBot from '../../components/ChatBot/FloatingChatBot';
import { baseURL } from '../../const';

const IncidentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  // Automatically fetch incident prediction data when component mounts
  useEffect(() => {
    const fetchIncidentData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${baseURL}/predict_incident/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Extract the actual data based on the API response structure
        let processedData;
        if (result.success && result.data) {
          processedData = result.data;
        } else {
          processedData = result;
        }
        
        setData(processedData);
        
        // Set initial filtered data
        if (Array.isArray(processedData)) {
          setFilteredData(processedData);
        } else if (processedData?.records && Array.isArray(processedData.records)) {
          setFilteredData(processedData.records);
        } else if (typeof processedData === 'object') {
          setFilteredData([processedData]);
        }
      } catch (err) {
        setError(`Failed to load incident data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidentData();
  }, []);

  // Filter data based on search term (search in first column - request ID)
  useEffect(() => {
    if (!data) return;
    
    let tableData = [];
    if (Array.isArray(data)) {
      tableData = data;
    } else if (data.records && Array.isArray(data.records)) {
      tableData = data.records;
    } else if (typeof data === 'object') {
      tableData = [data];
    }

    if (!searchTerm.trim()) {
      setFilteredData(tableData);
      return;
    }

    // Filter based on first column (request ID)
    if (tableData.length > 0) {
      const firstColumnKey = Object.keys(tableData[0])[0];
      const filtered = tableData.filter(row => {
        const firstColumnValue = row[firstColumnKey];
        return firstColumnValue && 
               String(firstColumnValue).toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredData(filtered);
    }
  }, [data, searchTerm]);

  const renderTable = () => {
    if (!data || filteredData.length === 0) {
      return <div className="no-data">No data to display</div>;
    }

    // Get headers from the first record
    const headers = Object.keys(filteredData[0]);
    const firstColumnKey = headers[0]; // For search label

    return (
      <div className="table-container">
        {/* <div className="table-header">
          <h3>Incident Data Analysis</h3>
          <span className="record-count">
            {filteredData.length} of {Array.isArray(data) ? data.length : (data.records ? data.records.length : 1)} records
          </span>
        </div> */}
        
        <div className="table-controls">
          <label htmlFor="search-input" style={{ fontWeight: '500', color: '#374151' }}>
            Search by {firstColumnKey}:
          </label>
          <input
            id="search-input"
            type="text"
            placeholder={`Enter ${firstColumnKey} to search...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="record-info">
            {searchTerm && `Found ${filteredData.length} matching records`}
          </span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header, colIndex) => (
                    <td key={colIndex}>
                      {row[header] !== null && row[header] !== undefined 
                        ? String(row[header]) 
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="text-page-container">
      <div className="text-page-content">
        <div className="page-header">
          <h1>Incident Management</h1>
          <p>Comprehensive incident management for SLA compliance and prediction</p>
        </div>

{loading &&        <div className="data-section">
          {error && <div className="error-message">{error}</div>}
          
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>}

        {!loading && !error && data && renderTable()}
      </div>
      
      {/* Add the floating chatbot */}
      <FloatingChatBot
        title="Incident Analysis Bot"
        subtitle="Ask questions about incident data"
        placeholder="Ask about incidents, SLA breaches, etc..."
        endpoint="/predict/"
        initialMessage="Hello! I can help you analyze incident data and SLA metrics. You can also upload CSV/Excel files for prediction analysis. What would you like to know?"
        showFileInfo={true}
        showSessionInfo={true}
        supportFileUpload={true}
        fileUploadEndpoint="/upload_and_predict/"
        acceptedFileTypes=".csv,.xlsx,.xls"
      />
    </div>
  );
};

export default IncidentManagement;

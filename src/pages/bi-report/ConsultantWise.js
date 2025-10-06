import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../../const';
import '../data/table-report/TableReport.css';

const ConsultantWise = () => {
  const [consultantData, setConsultantData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchConsultantData();
  }, []);

  const fetchConsultantData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/sla_tabs/Consultant_Wise`);
      
      const data = response.data;
      
      if (data.consultant_data) {
        setConsultantData(data.consultant_data);
      }
      
      if (data.summary) {
        setSummary(data.summary);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching consultant data:', err);
      setError(`Failed to fetch data: ${err.message}`);
      setConsultantData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'P1': return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
      case 'P2': return { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' };
      case 'P3': return { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' };
      case 'P4': return { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' };
      default: return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  };

  if (loading) {
    return (
      <div className="table-report-container">
        <div className="report-card">
          <div className="loading-container">
            <div className="loading-spinner">Loading consultant statistics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && consultantData.length === 0) {
    return (
      <div className="table-report-container">
        <div className="report-card">
          <div className="error-container" style={{ 
            padding: '40px 24px', 
            textAlign: 'center',
            color: '#dc3545'
          }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#dc3545', 
              marginBottom: '10px' 
            }}>
              Unable to Load Consultant Data
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#6c757d', 
              marginBottom: '20px' 
            }}>
              {error}
            </p>
            <button 
              onClick={fetchConsultantData}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={e => e.target.style.backgroundColor = '#0056b3'}
              onMouseOut={e => e.target.style.backgroundColor = '#007bff'}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-report-container" style={{ paddingBottom: '40px' }}>
      <div className="report-card" style={{ overflow: 'visible' }}>
        <div className="report-header" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <div style={{ 
              width: '4px', 
              height: '24px', 
              backgroundColor: '#28a745', 
              marginRight: '12px',
              borderRadius: '2px'
            }}></div>
            <h2 className="report-title">Consultant-wise Ticket Distribution</h2>
          </div>
          <p style={{ 
            textAlign: 'center', 
            color: '#6c757d', 
            fontSize: '14px', 
            margin: '0',
            fontStyle: 'italic'
          }}>
            Breakdown of tickets by priority level and assigned consultant
          </p>
        </div>
        
        {/* Summary Cards */}
        {summary && (
          <div style={{ 
            padding: '0 24px 20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{ 
              backgroundColor: '#e3f2fd',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #bbdefb'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1565c0' }}>
                {summary.total_consultants}
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Active Consultants
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#ffebee',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #ffcdd2'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#c62828' }}>
                {summary.total_p1_tickets}
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                P1 Critical Tickets
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#f3e5f5',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #e1bee7'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#7b1fa2' }}>
                {summary.total_tickets}
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Total Tickets
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#e8f5e8',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #c8e6c9'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>
                {Math.round(summary.avg_tickets_per_consultant)}
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Avg Tickets/Consultant
              </div>
            </div>
          </div>
        )}

        {/* Consultant Data Table */}
        <div style={{ padding: '0 24px' }}>
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              overflowX: 'auto',
              overflowY: 'visible',
              maxWidth: '100%'
            }}>
              <table style={{ 
                width: '100%',
                minWidth: '800px',
                borderCollapse: 'collapse',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '80px'
                    }}>Year</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '100px'
                    }}>Month</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '200px'
                    }}>Request - Resource<br/>Assigned To - Name</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#dc2626',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '90px',
                      backgroundColor: '#fee2e2'
                    }}>P1 - Critical</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#d97706',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '90px',
                      backgroundColor: '#fef3c7'
                    }}>P2 - High</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#2563eb',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '90px',
                      backgroundColor: '#dbeafe'
                    }}>P3 - Normal</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      fontWeight: '600', 
                      color: '#059669',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '90px',
                      backgroundColor: '#d1fae5'
                    }}>P4 - Low</th>
                    <th style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      fontWeight: '700', 
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      minWidth: '80px',
                      backgroundColor: '#f1f3f4'
                    }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {consultantData.length > 0 ? (
                    consultantData.map((row, index) => (
                      <tr key={index} style={{ 
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={e => e.target.closest('tr').style.backgroundColor = '#e3f2fd'}
                      onMouseOut={e => e.target.closest('tr').style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'}
                      >
                        <td style={{ 
                          padding: '12px', 
                          borderBottom: '1px solid #e9ecef', 
                          fontWeight: '600',
                          color: '#495057'
                        }}>{row.year}</td>
                        <td style={{ 
                          padding: '12px', 
                          borderBottom: '1px solid #e9ecef', 
                          fontWeight: '600',
                          color: '#495057'
                        }}>{row.month}</td>
                        <td style={{ 
                          padding: '12px', 
                          borderBottom: '1px solid #e9ecef',
                          fontWeight: '500',
                          color: '#495057'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              backgroundColor: '#28a745', 
                              borderRadius: '50%',
                              marginRight: '8px'
                            }}></div>
                            {row.consultant}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          borderBottom: '1px solid #e9ecef', 
                          textAlign: 'center',
                          fontWeight: '700',
                          backgroundColor: row.p1_critical > 0 ? '#fee2e2' : 'transparent',
                          color: row.p1_critical > 0 ? '#dc2626' : '#9ca3af'
                        }}>
                          {row.p1_critical || ''}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          borderBottom: '1px solid #e9ecef', 
                          textAlign: 'center',
                          fontWeight: '700',
                          backgroundColor: row.p2_high > 0 ? '#fef3c7' : 'transparent',
                          color: row.p2_high > 0 ? '#d97706' : '#9ca3af'
                        }}>
                          {row.p2_high || ''}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          borderBottom: '1px solid #e9ecef', 
                          textAlign: 'center',
                          fontWeight: '700',
                          backgroundColor: row.p3_normal > 0 ? '#dbeafe' : 'transparent',
                          color: row.p3_normal > 0 ? '#2563eb' : '#9ca3af'
                        }}>
                          {row.p3_normal || ''}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          borderBottom: '1px solid #e9ecef', 
                          textAlign: 'center',
                          fontWeight: '700',
                          backgroundColor: row.p4_low > 0 ? '#d1fae5' : 'transparent',
                          color: row.p4_low > 0 ? '#059669' : '#9ca3af'
                        }}>
                          {row.p4_low || ''}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          borderBottom: '1px solid #e9ecef', 
                          textAlign: 'center',
                          fontWeight: '800',
                          backgroundColor: '#f1f3f4',
                          color: '#495057',
                          fontSize: '14px'
                        }}>
                          {row.total}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ 
                        textAlign: 'center', 
                        padding: '40px', 
                        color: '#6c757d',
                        fontSize: '16px',
                        fontStyle: 'italic',
                        borderBottom: '1px solid #e9ecef'
                      }}>
                        No consultant data available from API
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer with Totals */}
            {consultantData.length > 0 && (
              <div style={{ 
                padding: '16px 24px', 
                backgroundColor: '#f8f9fa', 
                borderTop: '2px solid #495057',
                fontSize: '14px', 
                fontWeight: '600',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ color: '#495057' }}>
                  <strong>Total Records: {consultantData.length}</strong>
                </div>
                {summary && (
                  <div style={{ color: '#495057', display: 'flex', gap: '20px' }}>
                    <span>P1: <strong style={{ color: '#dc2626' }}>{summary.total_p1_tickets}</strong></span>
                    <span>P2: <strong style={{ color: '#d97706' }}>{summary.total_p2_tickets}</strong></span>
                    <span>P3: <strong style={{ color: '#2563eb' }}>{summary.total_p3_tickets}</strong></span>
                    <span>P4: <strong style={{ color: '#059669' }}>{summary.total_p4_tickets}</strong></span>
                    <span>Total: <strong>{summary.total_tickets}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantWise;

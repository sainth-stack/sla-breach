import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { FaPaperclip } from "react-icons/fa";
import Plot from 'react-plotly.js';
import Spinner from 'react-bootstrap/Spinner';
import { Spin, Collapse, message as antdMessage, Table } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const BASE_URL = 'http://54.169.213.200:3005';

const getUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.email || '';
  } catch {
    return '';
  }
};

function stripQuotes(str) {
  if (typeof str === 'string' && str.length > 1 && str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  return str;
}

const ModernTable = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return <div>No data available.</div>;
  const columns = Object.keys(data[0]).map(key => ({
    title: (
      <span style={{ fontWeight: 600, fontSize: 16, color: '#1a237e', letterSpacing: 0.2 }}>{key}</span>
    ),
    dataIndex: key,
    key,
    ellipsis: true,
    maxWidth: 220,
    render: (text) => (
      <span style={{ whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: 15 }}>{text}</span>
    )
  }));
  return (
    <div style={{
      width: '100%',
      padding: 0,
      margin: 0,
      background: 'transparent',
      borderRadius: 0,
      boxShadow: 'none',
      overflowX: 'auto',
      minWidth: 320,
      maxHeight: '70vh',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <Table
        columns={columns}
        dataSource={data.map((row, i) => ({ ...row, key: i }))}
        pagination={false}
        scroll={{ x: true }}
        bordered
        size="middle"
        style={{ borderRadius: 0, width: '100%' }}
        rowClassName={(_, idx) => idx % 2 === 0 ? 'custom-row-even' : 'custom-row-odd'}
      />
      <style>{`
        .ant-table {
          font-size: 15px;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .ant-table-thead > tr > th {
          background: #f0f4fa !important;
          font-weight: 700;
          color: #1a237e;
          font-size: 16px;
          border-bottom: 2px solid #e3e8ee !important;
        }
        .ant-table-tbody > tr.custom-row-even > td {
          background: #f9fafb !important;
        }
        .ant-table-tbody > tr.custom-row-odd > td {
          background: #fff !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #e3e8ee !important;
          transition: background 0.2s;
        }
        .ant-table-bordered .ant-table-container {
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};

const ColumnListCard = ({ columns }) => (
  <div style={{
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    padding: '32px 24px',
    maxWidth: 500,
    margin: '24px auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    animation: 'fadeIn 0.5s',
  }}>
    <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, color: '#2563eb' }}>Columns in the Dataset</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {columns.map((col, idx) => (
        <span key={idx} style={{
          background: '#f7f9fb',
          color: '#222',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 15,
          fontWeight: 500,
          marginBottom: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
        }}>{col}</span>
      ))}
    </div>
  </div>
);

const Bot = () => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [messageType, setMessageType] = useState('text');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', content: 'Hello! How can I assist you today?' }
  ]);
  const [recentChats, setRecentChats] = useState([]);
  const [visualizationData, setVisualizationData] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (!selectedFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await fetch(`${BASE_URL}/upload_data`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      antdMessage.success('File uploaded successfully');
    } catch (error) {
      antdMessage.error('Sorry, there was an error uploading your file.');
    } finally {
      setIsLoading(false);
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        type: 'user',
        content: message,
        question: true,
        isLoading: true
      }
    ]);
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('query', message);
      if (sessionId) formData.append('session_id', sessionId);
      const response = await fetch(`${BASE_URL}/Explore_sla`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept': 'application/json',
        },
        body: formData.toString(),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      if (data.session_id) setSessionId(data.session_id);
      let answer = '';
      let plotsData = null;
      let tableData = null;
      if (data.type === 'plotly' && data.payload) {
        plotsData = data.payload;
        answer = '';
      } else if (data.type === 'table' && data.payload) {
        tableData = data.payload;
        answer = '';
      } else if (data.type === 'text' && data.payload) {
        answer = data.payload;
      } else if (data.rawResult) {
        answer = stripQuotes(data.rawResult);
      } else {
        answer = data?.answer || data?.result || data?.message || JSON.stringify(data);
      }
      setMessages(prev => prev.map(msg =>
        msg.isLoading ? { ...msg, isLoading: false } : msg
      ).concat([{
        type: 'bot',
        content: answer,
        plotsData: plotsData,
        tableData: tableData,
      }]));
      setRecentChats(prev => [...prev, { question: message, answer }]);
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.isLoading ? { ...msg, isLoading: false } : msg
      ).concat([{
        type: 'bot',
        content: 'Sorry, there was an error processing your request.',
        messageType: 'text',
      }]));
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  const fileInputRef = useRef(null);

  const handleIconClick = () => {
    fileInputRef.current.click();
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const LoaderOverlay = ({ text }) => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(255,255,255,0.7)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      transition: 'background 0.3s',
    }}>
      <Spin size="large" tip={text || 'Processing...'} style={{ fontSize: 24 }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter, Arial, sans-serif', background: '#f7f9fb' }}>
      {(isLoading || file) && <LoaderOverlay text={file ? 'Uploading...' : 'Processing...'} />}
      <div className="chat-container" style={{ flex: 1, height: '100vh' }}>
        <div className="recent-chats">
          <h3>Recent Chats</h3>
          {recentChats.map((chat, index) => (
            <div key={index} className="recent-chat-item">
              <p><strong></strong> {chat.question}</p>
            </div>
          ))}
        </div>
        <div className="chat-window">
        <div className="chat-messages">
        {messages.map((msg, index) => {
          return(
            (
              <div
                key={index}
                style={{
                  display: "flex",
                  maxWidth: "100%",
                  flexDirection: "column",
                  gap: "10px",
                  alignItems: msg.question ? "flex-start" : "flex-end",
                }}
              >
                <div
                  className={`${msg.type}-message chat-message-card`}
                  style={{
                    display: "flex",
                    width: msg.question ? "fit-content" : "100%",
                    flexDirection: "column",
                    gap: "10px",
                    maxWidth: "100%",
                    alignSelf: msg.question ? "flex-end" : "flex-start",
                    alignItems: msg.question ? "flex-end" : "flex-start",
                    background: msg.type === 'bot' ? '#fff' : '#2563eb',
                    color: msg.type === 'bot' ? '#222' : '#fff',
                    borderRadius: 16,
                    boxShadow: msg.type === 'bot' ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
                    padding: msg.type === 'bot' ? '24px 32px' : '12px 24px',
                    margin: '12px 0',
                    fontSize: 18,
                    fontFamily: 'Inter, Arial, sans-serif',
                    animation: 'fadeIn 0.5s',
                  }}
                >
                  {msg?.tableData && Array.isArray(msg.tableData) && typeof msg.tableData[0] === 'string' && (
                    <ColumnListCard columns={msg.tableData} />
                  )}
                  {msg?.tableData && Array.isArray(msg.tableData) && typeof msg.tableData[0] === 'object' && (
                    <div style={{ marginTop: 12,width: '100%' }}>
                      {msg?.explanation && (
                        <div style={{
                          background: '#f0f4fa',
                          color: '#2563eb',
                          borderRadius: 8,
                          padding: '12px 18px',
                          marginBottom: 12,
                          fontWeight: 500,
                          fontSize: 16,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                        }}>{msg.explanation}</div>
                      )}
                      <ModernTable data={msg.tableData} />
                    </div>
                  )}
                  {msg?.plotsData && (
                    <div className="plotly-card-container" style={{
                      width: '100%',
                      alignSelf: 'flex-start',
                      padding: 0,
                      margin: '16px 0',
                      background: 'transparent',
                      borderRadius: 0,
                      boxShadow: 'none',
                      overflowX: 'auto',
                      minHeight: 320,
                    }}>
                      {msg?.explanation && (
                        <div style={{
                          background: '#f0f4fa',
                          color: '#2563eb',
                          borderRadius: 8,
                          padding: '12px 18px',
                          marginBottom: 12,
                          fontWeight: 500,
                          fontSize: 16,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                        }}>{msg.explanation}</div>
                      )}
                      <div style={{
                        fontSize: 16,
                        color: '#2D3748',
                        marginBottom: 8,
                        fontWeight: 600,
                      }}>{msg?.plotsData?.layout?.title?.text}</div>
                      <Plot
                        data={msg?.plotsData?.data}
                        layout={{
                          ...msg?.plotsData?.layout,
                          width: undefined,
                          height: undefined,
                          autosize: true,
                          margin: { t: 40, r: 40, b: 60, l: 60, ...(msg?.plotsData?.layout?.margin || {}) },
                          paper_bgcolor: 'transparent',
                          plot_bgcolor: 'transparent',
                        }}
                        config={{
                          responsive: true,
                          displayModeBar: false,
                          staticPlot: false,
                          useResizeHandler: true,
                        }}
                        style={{ width: '100%', minHeight: 280, background: 'transparent' }}
                        className="plot-container"
                      />
                    </div>
                  )}
                  {msg?.content && !msg?.plotsData && !msg?.tableData && (
                    <div style={{ marginBottom: 0 }} dangerouslySetInnerHTML={{ __html: msg?.content }} />
                  )}
                </div>
                {msg.isLoading && (
                  <div className="spinner-container">
                    <Spin size="large" />
                  </div>
                )}
              </div>
            )
          )
        })}
  <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <div className="input-container">
            <FaPaperclip className="upload-icon" onClick={handleIconClick} />
            <input
              type="text"
              className="chat-input"
              value={message}
              onChange={handleMessageChange}
              placeholder="Ask something..."
            />
            <input
              type="file"
              className="file-input"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
          <button type="submit" className="send-button" disabled={isLoading}>
            {isLoading ? (
              <Spinner
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
            ) : (
              'Send'
            )}
          </button>
        </form>
        {file && (
            <div className="file-name">
              Selected file: {file.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bot;
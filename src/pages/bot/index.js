import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { FaPaperclip } from "react-icons/fa";
import Plot from 'react-plotly.js';
import Spinner from 'react-bootstrap/Spinner';
import { Spin, Collapse, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

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

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile) {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('http://18.142.48.224:8000/api/sla_data_process', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        console.log(data);
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    setMessages(prev => [...prev, { 
      type: 'user', 
      content: message,
      question:true,
      isLoading: true 
    }]);
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('query', message);

    try {
      setIsLoading(true); // Ensure loading starts before the request
    
      const endpoint = 'http://18.142.48.224:8000/api/sla_query_making';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    
      const data = await response.json();
    
      setMessages(prev => prev.map(msg => 
        msg.isLoading ? { ...msg, isLoading: false } : msg
      ).concat([{ 
        type: 'bot', 
        content:data?.answer,
        // plotsData:data?.chart_response,
        code:data?.code || "Not Found"
      }]));
    
      setRecentChats(prev => [...prev, { question: message, answer: data?.result }]);
    
      if (messageType === 'graph') {
        setVisualizationData(data?.chartData);
      }
    } catch (error) {
      console.error('Error:', error);
      
      setMessages(prev => prev.map(msg => 
        msg.isLoading ? { ...msg, isLoading: false } : msg
      ).concat([{ 
        type: 'bot', 
        content: 'Sorry, there was an error processing your request.',
        messageType: 'text',
        code:'Not Found'
      }]));
    } finally {
      setIsLoading(false); // Ensure loader stops in both success and failure cases
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

  return (
    <div className="chat-container">
      <div className="recent-chats">
        <h3>Recent Chats</h3>
        {recentChats.map((chat, index) => (
          <div key={index} className="recent-chat-item">
            <p><strong></strong> {chat.question}</p>
            {/* <p><strong>A:</strong> {chat.answer}</p> */}
          </div>
        ))}
      </div>
      <div className="chat-window">
        <div className="chat-messages">
        {messages.map((msg, index) => (
  <div
    key={index}
    style={{
      display: "flex",
      maxWidth: "100%",
      flexDirection: "column",
      gap: "10px",
      alignItems: msg.question ? "flex-start" : "flex-end", // Align right for questions
    }}
  >
    <div
      className={`${msg.type}-message`}
      style={{
        display: "flex",
        width: msg.question ? "fit-content" : "100%", // 50% for questions, 100% for answers
        flexDirection: "column",
        gap: "10px",
        maxWidth: "100%",
        alignSelf: msg.question ? "flex-end" : "flex-start",
        alignItems: msg.question ? "flex-end" : "flex-start", // Align content accordingly
      }}
    >

      {msg?.content && <div dangerouslySetInnerHTML={{ __html: msg?.content }} />}
      {/* {msg?.code && (
    <Collapse>
        <Collapse.Panel header="Code" key="msg-code">
        <div key={'text'} className="code-block-container">
                    <button 
                        className="copy-button"
                        // onClick={() => handleCopyCode(msg.code)}
                    >
                        <CopyOutlined /> Copy
                    </button>
                    <pre className="code-block">
                        <code>{msg.code}</code>
                    </pre>
                </div>
        </Collapse.Panel>
    </Collapse>
)} */}

      {msg?.plotsData && (
        <Plot
          data={msg?.plotsData?.data}
          layout={msg?.plotsData?.layout}
          config={{ responsive: true }}
          style={{
            width: "100%",
            height: "60vh",
            padding: "15px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
          }}
          className="plot-container"
        />
      )}
    </div>
    {msg.isLoading && (
      <div className="spinner-container">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )}
  </div>
))}
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
  );
};

export default Bot;
import React from 'react';
import ChatBot from '../../components/ChatBot';
import './index.css';

const KEDB = () => {
  return (
    <ChatBot
      title="Knowledge Base Search"
      subtitle="Search for solutions to similar incidents and issues"
      placeholder="Ask about errors, issues, or search for solutions..."
      endpoint="/vector_search/"
      initialMessage="Hello! I'm your Knowledge Base assistant. Ask me about any errors, incidents, or issues you need help with. I can search through historical data to find similar cases and solutions."
      showFileInfo={false}
      showRecentChats={true}
      showSessionInfo={true}
      className="kedb-chatbot"
      maxWidth="1400px"
    />
  );
};

export default KEDB;

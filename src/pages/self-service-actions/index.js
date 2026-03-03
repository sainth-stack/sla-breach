import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../../const';
import s4Logo from '../../assets/s4.png';
import eccLogo from '../../assets/ecc.jpeg';
import s4CloudLogo from '../../assets/s4-cloud.jpg';
import './index.css';

// Format SAP OData date values (/Date(ts)/ or ISO string)
const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'string' && val.startsWith('/Date(')) {
        const ts = parseInt(val.replace(/\/Date\(|\)\//g, '').split(/[+-]/)[0]);
        if (!isNaN(ts)) return new Date(ts).toLocaleDateString('en-GB', { dateStyle: 'medium' });
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { dateStyle: 'medium' });
    }
    return String(val);
};

// Humanize column names (e.g. SalesOrder -> Sales Order)
const humanizeColumn = (col) => col.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

// Columns to hide from table (internal/metadata)
const HIDDEN_COLS = ['__metadata', 'url_used', 'intent_debug'];

// Render SAP results - supports both single entity (d) and list (d.results)
const SapTable = ({ data }) => {
    const d = data?.response?.d;
    const results = Array.isArray(d?.results) ? d.results : (d && !d.results ? [d] : null);
    if (!results || results.length === 0) return <p className="sap-empty">No records found.</p>;

    const rawColumns = Object.keys(results[0]).filter(c => !HIDDEN_COLS.includes(c));
    const columns = rawColumns.length ? rawColumns : Object.keys(results[0]);

    return (
        <div className="sap-table-wrap">
            <table className="sap-table">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col}>{humanizeColumn(col)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {results.map((row, i) => (
                        <tr key={i}>
                            {columns.map(col => (
                                <td key={col}>{formatValue(row[col])}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Chat bot for SAP queries
const SapChatBot = ({ onClose }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        { type: 'bot', text: 'Hello! I am your S/4HANA Assistant. How can I help you today?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const sendMessage = async (e) => {
        e?.preventDefault();
        const trimmed = message.trim();
        if (!trimmed || isLoading) return;

        setMessages(prev => [...prev, { type: 'user', text: trimmed }]);
        setMessage('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${baseURL}/sap/query`, { query: trimmed });
            setMessages(prev => [...prev, { type: 'bot', sapData: res.data }]);
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message || 'Something went wrong.';
            setMessages(prev => [...prev, { type: 'bot', text: `Error: ${detail}`, isError: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bot-modal">
            {/* Header */}
            <div className="bot-header">
                <div className="bot-header-left">
                    <img src={s4Logo} alt="S/4HANA" className="bot-logo" />
                    <div>
                        <div className="bot-title">S/4HANA Assistant</div>
                        <div className="bot-subtitle">Query SAP data in natural language</div>
                    </div>
                </div>
                <button className="bot-close" onClick={onClose}>✕</button>
            </div>

            {/* Messages */}
            <div className="bot-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`bot-msg ${msg.type} ${msg.isError ? 'error' : ''}`}>
                        {msg.sapData ? (
                            <div className="sap-response">
                                {msg.sapData.friendlyAnswer && (
                                    <div
                                        className="sap-friendly-answer"
                                        dangerouslySetInnerHTML={{ __html: msg.sapData.friendlyAnswer }}
                                    />
                                )}
                                {msg.sapData.showTable && msg.sapData.response?.d?.results?.length > 0 ? (
                                    <SapTable data={msg.sapData} />
                                ) : !msg.sapData.friendlyAnswer ? (
                                    <p className="sap-empty">No records found.</p>
                                ) : null}
                            </div>
                        ) : (
                            <span>{msg.text}</span>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="bot-msg bot">
                        <span className="bot-loading">Thinking…</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="bot-input-bar" onSubmit={sendMessage}>
                <input
                    ref={inputRef}
                    className="bot-input"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="e.g. Show me sales order 4"
                    disabled={isLoading}
                />
                <button type="submit" className="bot-send" disabled={isLoading || !message.trim()}>Send</button>
            </form>
        </div>
    );
};

// Main page
const SelfServiceActions = () => {
    const [botOpen, setBotOpen] = useState(false);

    const cards = [
        { id: 's4', title: 'S/4HANA', desc: 'Query Sales Orders, Purchase Orders and more.', logo: s4Logo, available: true, badge: 'Live' },
        { id: 'btp', title: 'SAP ECC', desc: 'Self Service for SAP ECC system.', logo: eccLogo, available: false, badge: 'Soon' },
        { id: 'batch', title: 'SAP S/4 Cloud', desc: 'Self Service for SAP S/4 Cloud system.', logo: s4CloudLogo, available: false, badge: 'Soon' },
    ];

    return (
        <div className="ssa-page">
            <h1 className="ssa-title">Self Service Actions</h1>
            <p className="ssa-subtitle">Select a system to query your enterprise data</p>

            <div className="ssa-cards">
                {cards.map(card => (
                    <div
                        key={card.id}
                        className={`ssa-card ${card.available ? 'active' : 'inactive'}`}
                        onClick={() => card.available && setBotOpen(true)}
                    >
                        <span className={`ssa-card-badge ${card.available ? 'live' : 'soon'}`}>{card.badge}</span>
                        <div className="ssa-card-logo">
                            {card.logo
                                ? <img src={card.logo} alt={card.title} />
                                : <span className="ssa-placeholder">?</span>}
                        </div>
                        <div className="ssa-card-name">{card.title}</div>
                        <div className="ssa-card-desc">{card.desc}</div>
                        {card.available && <div className="ssa-card-action">Self Service →</div>}
                    </div>
                ))}
            </div>

            {botOpen && (
                <div className="ssa-overlay" onClick={e => e.target === e.currentTarget && setBotOpen(false)}>
                    <SapChatBot onClose={() => setBotOpen(false)} />
                </div>
            )}
        </div>
    );
};

export default SelfServiceActions;

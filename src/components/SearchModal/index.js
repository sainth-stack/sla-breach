import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { baseURL } from '../../const';
import './index.css';

const SearchModal = ({ isOpen, onClose, description, ticketId, searchType }) => {
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const hasFetchedRef = useRef(false);
    const lastFetchKey = useRef('');

    useEffect(() => {
        if (isOpen && description && searchType) {
            // Create a unique key for this fetch request
            const fetchKey = `${searchType}-${description}`;
            
            // Only fetch if we haven't fetched this exact request yet
            if (fetchKey !== lastFetchKey.current || !hasFetchedRef.current) {
                lastFetchKey.current = fetchKey;
                hasFetchedRef.current = true;
                fetchResults();
            }
        } else if (!isOpen) {
            // Reset when modal closes
            hasFetchedRef.current = false;
            lastFetchKey.current = '';
            setResults('');
            setError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, description, searchType]);

    const fetchResults = async () => {
        setIsLoading(true);
        setError(null);
        setResults('');

        try {
            let response;
            
            if (searchType === 'similarity') {
                // Call Similarity Search API (KEDB)
                response = await axios.post(
                    'https://ams-vectorizer.cfapps.us10-001.hana.ondemand.com/v3/lux/similar-tickets/query',
                    { query: description },
                    { headers: { 'Content-Type': 'application/json' } }
                );
            } else if (searchType === 'webSearch') {
                // Call Web Search API
                response = await axios.post(
                    `${baseURL}/web_search`,
                    { problem: description },
                    { headers: { 'Content-Type': 'application/json' } }
                );
            }

            if (response && response.data) {
                // Handle response based on API
                const resultData = response.data.response || response.data.result || 'No results found.';
                setResults(resultData);
            } else {
                setResults('No results found.');
            }
        } catch (err) {
            console.error('Error fetching results:', err);
            setError('Failed to fetch results. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const getModalTitle = () => {
        if (searchType === 'similarity') {
            return 'Similarity Search - KEDB';
        } else if (searchType === 'webSearch') {
            return 'Web Search';
        }
        return 'Search Results';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{getModalTitle()}</h2>
                    </div>
                    <button onClick={onClose} className="modal-close-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

   

                <div className="modal-body">
                    {isLoading ? (
                        <div className="modal-loader">
                            <div className="loader-spinner"></div>
                            <p>Fetching results...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="results-section">
                            <div className="results-content">
                            <p className="modal-ticket-id">Ticket ID: {ticketId}</p>

                                <ReactMarkdown
                                    components={{
                                        a: ({ node, ...props }) => (
                                            <a {...props} target="_blank" rel="noopener noreferrer">
                                                {props.children}
                                                {searchType === 'webSearch' && props.href && ` (${props.href})`}
                                            </a>
                                        )
                                    }}
                                >
                                    {results || 'No results found.'}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;

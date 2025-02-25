import React from 'react';
import '../styles/InfoPanel.css';

const InfoPanel = ({ node, onClose }) => {
  const handleWikipediaClick = () => {
    // Open Wikipedia in a new tab
    window.open(node.url, '_blank', 'noopener,noreferrer');
  };

  // Remove HTML tags from text content
  const cleanHtml = (html) => {
    return html.replace(/<\/?[^>]+(>|$)/g, "");
  };

  return (
    <div className="info-panel">
      <div className="info-panel-content">
        <button className="close-button" onClick={onClose} aria-label="Close panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="info-header">
          <div className="star-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#f9d71c" stroke="#f9d71c" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <h2>{node.title}</h2>
        </div>
        
        <div className="info-content scrollable">
          {node.extract ? (
            <p className="extract">{node.extract}</p>
          ) : (
            <p className="snippet" dangerouslySetInnerHTML={{ __html: cleanHtml(node.snippet) }}></p>
          )}
        </div>
        
        <div className="info-footer">
          <button className="wiki-button" onClick={handleWikipediaClick}>
            View on Wikipedia
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Add a hint to explain panel usage */}
      <div className="panel-hint">
        <p>Click outside or on the X to close this panel</p>
      </div>
    </div>
  );
};

export default InfoPanel; 
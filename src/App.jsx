import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import ConstellationView from './components/ConstellationView';
import InfoPanel from './components/InfoPanel';
import { fetchTopicData } from './modules/dataService';
import './styles/App.css';

function App() {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const handleSearch = async (searchTopic) => {
    if (!searchTopic) return;
    
    console.log('Search initiated for topic:', searchTopic);
    setTopic(searchTopic);
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setGraphData(null);
    setSelectedNode(null);
    
    try {
      const data = await fetchTopicData(searchTopic);
      console.log('Received data from API:', data);
      
      // Validate that the data has the expected structure
      if (!data || !data.nodes || !data.links) {
        throw new Error('Invalid data structure received from API');
      }
      
      if (data.nodes.length === 0) {
        throw new Error('No nodes were found for this topic');
      }
      
      setGraphData(data);
      console.log('Graph data set in state');
    } catch (err) {
      console.error('Error in handleSearch:', err);
      
      // Handle custom error object with suggestions
      if (err && err.type === 'SUGGESTIONS_AVAILABLE' && err.suggestions) {
        setError(err.message || 'No results found. Did you mean one of these?');
        setSuggestions(err.suggestions);
      } else {
        setError(err.message || 'Failed to fetch data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion);
  };

  const handleNodeSelect = (node) => {
    console.log('Node selected:', node);
    setSelectedNode(node);
  };

  const handleCloseInfoPanel = () => {
    setSelectedNode(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Constellation of Knowledge</h1>
        <SearchBar onSearch={handleSearch} />
      </header>
      
      <main className="app-content">
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Exploring the universe of knowledge about "{topic}"...</p>
          </div>
        )}
        
        {error && (
          <div className="error-container">
            <p>{error}</p>
            
            {suggestions.length > 0 && (
              <div className="suggestions-container">
                <p>Did you mean:</p>
                <ul className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <button 
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="suggestion-button"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button onClick={() => setError(null)} className="dismiss-button">
              Dismiss
            </button>
          </div>
        )}
        
        {!isLoading && !error && !graphData && (
          <div className="intro-container">
            <h2>Discover Knowledge as Constellations</h2>
            <p>Enter a topic to visualize related Wikipedia pages as an interactive constellation.</p>
            <p className="hint">Try topics like "astronomy", "quantum physics", or "renaissance art".</p>
          </div>
        )}
        
        {!isLoading && !error && graphData && (
          <ConstellationView 
            data={graphData} 
            onNodeSelect={handleNodeSelect} 
          />
        )}
      </main>
      
      {selectedNode && (
        <InfoPanel 
          node={selectedNode}
          onClose={handleCloseInfoPanel}
        />
      )}
    </div>
  );
}

export default App; 
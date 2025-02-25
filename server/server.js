const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend to access the API
  credentials: true
}));
app.use(express.json());

// Wikipedia API endpoint
const WIKI_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

// Configure axios for Wikipedia API requests
const wikiApiClient = axios.create({
  headers: {
    'User-Agent': 'ConstellationOfKnowledge/1.0 (https://github.com/jpvigop/constellation-of-knowledge; jpvigopasto@gmail.com)',
    'Accept': 'application/json'
  }
});

// Route to search for Wikipedia pages based on a topic
app.get('/api/search/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    console.log(`[Server] Searching for topic: ${topic}`);
    
    // Make a request to the Wikipedia API
    const response = await wikiApiClient.get(WIKI_API_ENDPOINT, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: topic,
        format: 'json',
        srlimit: 20, // Limit to 20 results for the proof of concept
        origin: '*', // Required for CORS
        utf8: 1 // Ensure proper UTF-8 encoding
      }
    });
    
    // Validate the response
    if (!response.data || !response.data.query || !response.data.query.search) {
      console.error('[Server] Invalid or empty response from Wikipedia search API');
      return res.status(500).json({ error: 'Invalid response from Wikipedia API' });
    }
    
    console.log(`[Server] Found ${response.data.query.search.length} results for topic: ${topic}`);
    res.json(response.data);
  } catch (error) {
    console.error('[Server] Error searching Wikipedia:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from Wikipedia',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route to get page details including links and categories
app.get('/api/page/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    console.log(`[Server] Fetching details for page ID: ${pageId}`);
    
    // Get page content, links, and categories in a single request
    const response = await wikiApiClient.get(WIKI_API_ENDPOINT, {
      params: {
        action: 'query',
        pageids: pageId,
        prop: 'links|categories|info|extracts',
        pllimit: 'max',
        cllimit: 'max',
        inprop: 'url',
        exintro: true,
        explaintext: true,
        format: 'json',
        origin: '*', // Required for CORS
        utf8: 1 // Ensure proper UTF-8 encoding
      }
    });
    
    // Validate the response
    if (!response.data || !response.data.query || !response.data.query.pages) {
      console.error(`[Server] Invalid or empty response from Wikipedia page API for page ID: ${pageId}`);
      return res.status(500).json({ error: 'Invalid response from Wikipedia API' });
    }
    
    console.log(`[Server] Successfully fetched details for page ID: ${pageId}`);
    res.json(response.data);
  } catch (error) {
    console.error('[Server] Error fetching page details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page details from Wikipedia',
      message: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint that combines search and page details to reduce client-side requests
app.get('/api/constellation/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    console.log(`[Server] Building constellation data for topic: ${topic}`);
    
    // Step 1: Search for the topic
    const searchResponse = await wikiApiClient.get(WIKI_API_ENDPOINT, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: topic,
        format: 'json',
        srlimit: 10, // Reduce to 10 for better performance
        origin: '*',
        utf8: 1
      }
    });
    
    if (!searchResponse.data.query || !searchResponse.data.query.search || searchResponse.data.query.search.length === 0) {
      console.log(`[Server] No results found for topic: ${topic}. Trying alternative search.`);
      
      // Try a more permissive search with wildcards if the term is long enough
      if (topic.length >= 3) {
        const fuzzySearchResponse = await wikiApiClient.get(WIKI_API_ENDPOINT, {
          params: {
            action: 'query',
            list: 'search',
            srsearch: `${topic}*`, // Add wildcard for fuzzy matching
            format: 'json',
            srlimit: 10,
            origin: '*',
            utf8: 1
          }
        });
        
        if (fuzzySearchResponse.data.query && 
            fuzzySearchResponse.data.query.search && 
            fuzzySearchResponse.data.query.search.length > 0) {
          console.log(`[Server] Found ${fuzzySearchResponse.data.query.search.length} results using fuzzy search`);
          searchResponse.data = fuzzySearchResponse.data;
        } else {
          // If still no results, try searching for the closest matching topic
          console.log('[Server] Trying opensearch for suggestions');
          const suggestResponse = await wikiApiClient.get(WIKI_API_ENDPOINT, {
            params: {
              action: 'opensearch',
              search: topic,
              limit: 5,
              format: 'json',
              origin: '*'
            }
          });
          
          if (suggestResponse.data && 
              Array.isArray(suggestResponse.data[1]) && 
              suggestResponse.data[1].length > 0) {
            // Return suggestions to the client
            return res.status(404).json({ 
              error: 'No results found for this topic',
              suggestions: suggestResponse.data[1]
            });
          }
          
          return res.status(404).json({ error: 'No results found for this topic' });
        }
      } else {
        return res.status(404).json({ 
          error: 'Search term is too short',
          message: 'Please try a longer, more specific search term'
        });
      }
    }
    
    const searchResults = searchResponse.data.query.search;
    console.log(`[Server] Found ${searchResults.length} results for topic: ${topic}`);
    
    // Step 2: Get details for each page (with some delay between requests to avoid rate limiting)
    const pageDetails = [];
    for (const result of searchResults) {
      try {
        // Add a small delay between requests to avoid rate limiting
        if (pageDetails.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const pageResponse = await wikiApiClient.get(WIKI_API_ENDPOINT, {
          params: {
            action: 'query',
            pageids: result.pageid,
            prop: 'links|categories|info|extracts',
            pllimit: 'max',
            cllimit: 'max',
            inprop: 'url',
            exintro: true,
            explaintext: true,
            format: 'json',
            origin: '*',
            utf8: 1
          }
        });
        
        pageDetails.push(pageResponse.data);
      } catch (pageError) {
        console.error(`[Server] Error fetching page ${result.pageid}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    // Process the data on the server side
    const processedData = processWikiData(searchResponse.data, pageDetails);
    
    res.json(processedData);
  } catch (error) {
    console.error('[Server] Error building constellation:', error);
    res.status(500).json({ 
      error: 'Failed to build constellation data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Process Wikipedia data into a graph structure
function processWikiData(searchResults, pageDetails) {
  // Initialize empty graph
  const graph = {
    nodes: [],
    links: []
  };
  
  try {
    // Create a map of page IDs to their details for faster lookup
    const pageDetailsMap = {};
    pageDetails.forEach(detail => {
      if (detail && detail.query && detail.query.pages) {
        const pageId = Object.keys(detail.query.pages)[0];
        pageDetailsMap[pageId] = detail.query.pages[pageId];
      }
    });
    
    // Process search results into nodes
    searchResults.query.search.forEach((result, index) => {
      const pageId = result.pageid.toString();
      const details = pageDetailsMap[pageId];
      
      if (!details) return; // Skip if details not found
      
      // Calculate node importance based on search position and links
      const linksCount = details.links ? details.links.length : 0;
      const importance = calculateImportance(index, linksCount);
      
      // Create node
      graph.nodes.push({
        id: pageId,
        title: result.title,
        snippet: result.snippet.replace(/<\/?span[^>]*>/g, ''), // Remove <span> tags
        url: details.fullurl || `https://en.wikipedia.org/?curid=${pageId}`,
        extract: details.extract || '',
        importance,
        x: Math.random() * 900, // Initial random position
        y: Math.random() * 600, // Initial random position
      });
    });
    
    // Process links between pages
    Object.entries(pageDetailsMap).forEach(([pageId, details]) => {
      if (!details.links) return;
      
      details.links.forEach(link => {
        // Find the target node with matching title
        const targetNode = graph.nodes.find(node => node.title === link.title);
        
        if (targetNode) {
          // Create a link from this page to the target
          graph.links.push({
            source: pageId,
            target: targetNode.id,
            value: 1, // Default strength
          });
        }
      });
    });
    
    // If no links were found, create some based on importance to ensure the visualization works
    if (graph.links.length === 0 && graph.nodes.length > 1) {
      // Sort nodes by importance
      const sortedNodes = [...graph.nodes].sort((a, b) => b.importance - a.importance);
      
      // Create links from the most important node to others
      const centralNode = sortedNodes[0];
      
      sortedNodes.slice(1).forEach(node => {
        graph.links.push({
          source: centralNode.id,
          target: node.id,
          value: 1
        });
      });
    }
  } catch (error) {
    console.error('[Server] Error processing wiki data:', error);
  }
  
  return graph;
}

// Calculate a node's importance based on search rank and number of links
function calculateImportance(searchRank, linksCount) {
  // Simple importance formula: base value diminished by search rank, boosted by links
  const baseImportance = 100;
  const rankFactor = 5;
  const linksFactor = 0.5;
  
  return Math.max(10, baseImportance - (searchRank * rankFactor) + (linksCount * linksFactor));
}

// For development - serve the static files from the Vite dev server
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // If the request is for an API route, continue to our handlers
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Otherwise, respond with a message to use the Vite dev server
    res.send(`
      <h1>Development Server</h1>
      <p>This is the API server. For the frontend, please use the Vite dev server at <a href="http://localhost:3000">http://localhost:3000</a></p>
    `);
  });
}

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
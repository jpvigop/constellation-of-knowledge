import axios from 'axios';

/**
 * Fetches data about a topic from Wikipedia via our backend API
 * @param {string} topic - The topic to search for
 * @returns {Promise<Object>} - Promise resolving to a graph data structure
 */
export const fetchTopicData = async (topic) => {
  try {
    console.log('Fetching data for topic:', topic);
    
    // Use the new consolidated endpoint that handles all processing on the server
    console.log('Making constellation API request...');
    const response = await axios.get(`/api/constellation/${encodeURIComponent(topic)}`);
    console.log('Constellation API response received');
    
    // The response is already processed into a graph structure
    const graphData = response.data;
    
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      throw new Error('No results found for this topic');
    }
    
    console.log(`Received graph with ${graphData.nodes.length} nodes and ${graphData.links.length} links`);
    return graphData;
    
  } catch (error) {
    console.error('Error in fetchTopicData:', error);
    
    // Fallback to the original two-step approach if the consolidated endpoint fails
    if (error.response && error.response.status === 404) {
      throw new Error('No results found for this topic');
    }
    
    if (axios.isAxiosError(error) && error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    
    throw error;
  }
};

/**
 * Processes raw Wikipedia data into a graph structure for visualization
 * @param {Object} searchResults - Results from search API
 * @param {Array} pageDetails - Array of page details
 * @returns {Object} Graph structure with nodes and links
 */
const processDataIntoGraph = (searchResults, pageDetails) => {
  console.log('Processing data into graph structure...');
  console.log('Search results:', searchResults);
  console.log('Page details (sample):', pageDetails[0]);
  
  // Initialize empty graph
  const graph = {
    nodes: [],
    links: []
  };
  
  try {
    // Process search results into nodes
    searchResults.query.search.forEach((result, index) => {
      const pageId = result.pageid.toString();
      
      // Find corresponding page details
      const pageDetail = pageDetails.find(detail => 
        detail && detail.query && detail.query.pages && 
        Object.keys(detail.query.pages)[0] === pageId
      );
      
      if (!pageDetail) {
        console.warn(`No page details found for page ID: ${pageId}, title: ${result.title}`);
        return;
      }
      
      // Get the page data
      const page = pageDetail.query.pages[pageId];
      
      // Calculate importance based on search position and links count
      const linksCount = page.links ? page.links.length : 0;
      const importance = calculateImportance(index, linksCount);
      
      // Add node to graph
      graph.nodes.push({
        id: pageId,
        title: result.title,
        snippet: result.snippet.replace(/<\/?span[^>]*>/g, ''), // Remove <span> tags
        url: page.fullurl || `https://en.wikipedia.org/?curid=${pageId}`,
        extract: page.extract || '',
        importance,
        // Initial random position spread across the graph
        x: Math.random() * 900,
        y: Math.random() * 600
      });
    });
    
    console.log(`Created ${graph.nodes.length} nodes`);
    
    // Process links between pages
    pageDetails.forEach(pageDetail => {
      if (!pageDetail || !pageDetail.query || !pageDetail.query.pages) {
        console.warn('Invalid page detail object:', pageDetail);
        return;
      }
      
      const pageId = Object.keys(pageDetail.query.pages)[0];
      const page = pageDetail.query.pages[pageId];
      
      // Skip if no links
      if (!page.links) {
        console.log(`No links found for page ID: ${pageId}, title: ${page.title}`);
        return;
      }
      
      // For debugging, log the first few links
      console.log(`Page ${page.title} has ${page.links.length} links. First 3:`, 
        page.links.slice(0, 3).map(l => l.title));
      
      // Check each link to see if it points to another node in our graph
      page.links.forEach(link => {
        const targetNode = graph.nodes.find(node => node.title === link.title);
        
        if (targetNode) {
          // Add link to graph
          graph.links.push({
            source: pageId,
            target: targetNode.id,
            value: 1 // Default link strength
          });
        }
      });
    });
    
    console.log(`Created ${graph.links.length} links between nodes`);
    
    // Make sure links only reference existing nodes
    graph.links = graph.links.filter(link => {
      const sourceExists = graph.nodes.some(n => n.id === link.source);
      const targetExists = graph.nodes.some(n => n.id === link.target);
      return sourceExists && targetExists;
    });
    
    console.log(`After filtering, ${graph.links.length} valid links remain`);
    
    // If no links were found, create some based on importance to ensure the visualization works
    if (graph.links.length === 0 && graph.nodes.length > 1) {
      console.log('No links found, creating fallback links based on importance');
      
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
      
      console.log(`Created ${graph.links.length} fallback links`);
    }
    
  } catch (error) {
    console.error('Error processing graph data:', error);
  }
  
  // Final check - ensure the returned graph has valid structure for D3
  if (graph.nodes.length === 0) {
    console.error('No nodes were created');
  }
  
  return graph;
};

/**
 * Calculate importance score for a node
 * @param {number} searchRank - Position in search results (lower is better)
 * @param {number} linksCount - Number of links to/from the page
 * @returns {number} Importance score between 10 and 100
 */
const calculateImportance = (searchRank, linksCount) => {
  // Base importance value
  const baseImportance = 100;
  // Factors for adjusting importance
  const rankFactor = 5;
  const linksFactor = 0.5;
  
  // Calculate importance: starts high, reduced by rank position, boosted by links
  const importance = baseImportance - (searchRank * rankFactor) + (linksCount * linksFactor);
  
  // Ensure importance is at least 10
  return Math.max(10, importance);
}; 
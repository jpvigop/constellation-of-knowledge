/**
 * Data Processing Module for Constellation of Knowledge
 * 
 * This module processes the raw Wikipedia data to build a network graph structure
 * that can be visualized as a constellation.
 */

/**
 * Processes search results and page details to create a constellation graph
 * @param {Object} searchResults - Results from the Wikipedia search API
 * @param {Array} pageDetails - Array of page details from the Wikipedia API
 * @returns {Object} A graph object with nodes and links ready for visualization
 */
function buildConstellationGraph(searchResults, pageDetails) {
  // Extract the search hits
  const hits = searchResults.query.search;
  
  // Initialize nodes and links arrays
  const nodes = [];
  const links = [];
  
  // Create a map of page IDs to their details for faster lookup
  const pageDetailsMap = pageDetails.reduce((map, page) => {
    const pageId = Object.keys(page.query.pages)[0];
    map[pageId] = page.query.pages[pageId];
    return map;
  }, {});
  
  // Process each search hit into a node
  hits.forEach((hit, index) => {
    // Find the corresponding page details
    const pageId = hit.pageid.toString();
    const details = pageDetailsMap[pageId];
    
    if (!details) return; // Skip if details not found
    
    // Calculate node importance based on search position and links
    const linksCount = details.links ? details.links.length : 0;
    const importance = calculateImportance(index, linksCount);
    
    // Create node
    nodes.push({
      id: pageId,
      title: hit.title,
      snippet: hit.snippet,
      url: details.fullurl || `https://en.wikipedia.org/?curid=${pageId}`,
      extract: details.extract || '',
      importance,
      x: Math.random() * 900, // Initial random position
      y: Math.random() * 600, // Initial random position
    });
  });
  
  // Process links between pages
  pageDetails.forEach(page => {
    const pageId = Object.keys(page.query.pages)[0];
    const details = page.query.pages[pageId];
    
    // Skip if no links are available
    if (!details.links) return;
    
    // Process each link to see if it's in our node set
    details.links.forEach(link => {
      // Find the target node with matching title
      const targetNode = nodes.find(node => node.title === link.title);
      
      if (targetNode) {
        // Create a link from this page to the target
        links.push({
          source: pageId,
          target: targetNode.id,
          value: 1, // Default strength
        });
      }
    });
  });
  
  return { nodes, links };
}

/**
 * Calculate a node's importance based on search rank and number of links
 * @param {number} searchRank - Position in search results (lower is better)
 * @param {number} linksCount - Number of links to/from the page
 * @returns {number} Importance score (higher is more important)
 */
function calculateImportance(searchRank, linksCount) {
  // Simple importance formula: base value diminished by search rank, boosted by links
  const baseImportance = 100;
  const rankFactor = 5;
  const linksFactor = 0.5;
  
  return Math.max(10, baseImportance - (searchRank * rankFactor) + (linksCount * linksFactor));
}

module.exports = {
  buildConstellationGraph
}; 
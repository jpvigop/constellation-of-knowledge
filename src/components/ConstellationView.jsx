import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/ConstellationView.css';

const ConstellationView = ({ data, onNodeSelect }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    // Skip if no data or invalid data
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
      console.error('Invalid data structure or no nodes in data');
      return;
    }
    
    console.log(`Rendering constellation with ${data.nodes.length} nodes and ${data.links.length} links`);
    
    // Deep copy data to avoid mutations
    const graphData = {
      nodes: JSON.parse(JSON.stringify(data.nodes)),
      links: JSON.parse(JSON.stringify(data.links))
    };
    
    // Ensure all links have proper source and target objects (not just IDs)
    graphData.links.forEach(link => {
      if (typeof link.source === 'string' || typeof link.source === 'number') {
        const sourceNode = graphData.nodes.find(n => n.id === link.source.toString());
        if (sourceNode) {
          link.source = sourceNode;
        } else {
          console.warn(`Source node with ID ${link.source} not found`);
        }
      }
      if (typeof link.target === 'string' || typeof link.target === 'number') {
        const targetNode = graphData.nodes.find(n => n.id === link.target.toString());
        if (targetNode) {
          link.target = targetNode;
        } else {
          console.warn(`Target node with ID ${link.target} not found`);
        }
      }
    });
    
    // Filter out any links with missing source or target nodes
    graphData.links = graphData.links.filter(
      link => (typeof link.source === 'object' && link.source !== null) &&
              (typeof link.target === 'object' && link.target !== null)
    );
    
    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    
    // Clear existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);
    
    // Create background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0a0a1a');
    
    // Add decorative background stars
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 1.5;
      const opacity = Math.random() * 0.8 + 0.1;
      
      svg.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', size)
        .attr('fill', '#ffffff')
        .attr('opacity', opacity)
        .classed('bg-star', true);
    }
    
    // Create a main group for zoom handling
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    
    // Create groups for links and nodes
    const linkGroup = zoomGroup.append('g').attr('class', 'links');
    const nodeGroup = zoomGroup.append('g').attr('class', 'nodes');
    
    // Scale for node importance to radius (for visual sizing only)
    const radiusScale = d3.scaleLinear()
      .domain([10, 100])
      .range([4, 12]);
    
    function calculateNodeRadius(importance) {
      return radiusScale(importance);
    }
    
    // Compute a static radial layout
    const centerX = width / 2;
    const centerY = height / 2;
    const ringSpacing = 100; // distance between rings

    // Sort nodes by importance descending so the most important is centered
    graphData.nodes.sort((a, b) => b.importance - a.importance);
    
    graphData.nodes.forEach((node, i) => {
      if (i === 0) {
        node.x = centerX;
        node.y = centerY;
      } else {
        const ring = Math.floor((i - 1) / 8) + 1;  // 8 nodes per ring
        const angle = (2 * Math.PI * ((i - 1) % 8)) / 8;
        node.x = centerX + ring * ringSpacing * Math.cos(angle) + (Math.random() - 0.5) * 20;
        node.y = centerY + ring * ringSpacing * Math.sin(angle) + (Math.random() - 0.5) * 20;
      }
    });
    
    // Render links with static positions
    linkGroup.selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#445588')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    // Render nodes with static positions
    const nodes = nodeGroup.selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // Add larger invisible circle for better click target area
    nodes.append('circle')
      .attr('r', d => calculateNodeRadius(d.importance) * 3)
      .attr('fill', 'transparent')
      .attr('class', 'click-target');
    
    // Add star circles
    nodes.append('circle')
      .attr('r', d => calculateNodeRadius(d.importance))
      .attr('fill', '#f9d71c')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('class', 'node-circle');
    
    // Add star glow effect
    nodes.append('circle')
      .attr('r', d => calculateNodeRadius(d.importance) * 1.5)
      .attr('fill', 'url(#starGlow)')
      .attr('class', 'node-glow');
    
    // Add star glow gradient
    const defs = svg.append('defs');
    const gradient = defs.append('radialGradient')
      .attr('id', 'starGlow')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'rgba(255, 215, 0, 0.6)');
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgba(255, 215, 0, 0)');
    
    // Add labels
    nodes.append('text')
      .attr('dx', d => calculateNodeRadius(d.importance) + 4)
      .attr('dy', '.35em')
      .text(d => d.title)
      .attr('font-size', '10px')
      .attr('fill', '#ffffff')
      .attr('class', 'node-label');
    
    // Track whether dragging is occurring to avoid triggering click
    let isDragging = false;
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10]) // Allow zooming from 0.1x to 10x
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });
    
    // Apply zoom behavior to the SVG
    svg.call(zoom);
    
    // Double-click to reset zoom
    svg.on('dblclick.zoom', () => {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    });
    
    // Attach drag behavior to nodes
    nodes.call(d3.drag()
      .on('start', function(event, d) {
        isDragging = false;
        // Bring the dragged node to the front
        d3.select(this).raise();
        // Stop any zoom event from interfering
        event.sourceEvent.stopPropagation();
      })
      .on('drag', function(event, d) {
        isDragging = true;
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
        
        // Update any connected links
        linkGroup.selectAll('line')
          .filter(link => link.source === d || link.target === d)
          .attr('x1', link => link.source.x)
          .attr('y1', link => link.source.y)
          .attr('x2', link => link.target.x)
          .attr('y2', link => link.target.y);
      })
      .on('end', function(event, d) {
        // Reset drag state after a short delay
        setTimeout(() => {
          isDragging = false;
        }, 100);
      })
    );
    
    // Add click handler
    nodes.on('click', function(event, d) {
      // Don't trigger click when dragging
      if (isDragging) return;
      
      event.preventDefault();
      event.stopPropagation();
      console.log('Node clicked:', d.title);
      const circle = d3.select(this).select('.node-circle');
      circle.classed('pulse', true);
      setTimeout(() => {
        circle.classed('pulse', false);
      }, 600);
      onNodeSelect(d);
    });
    
    // Add tooltip on hover
    nodes.append('title')
      .text(d => `${d.title}\nClick for details • Drag to move • Scroll to zoom`);
    
    // Add instructions overlay
    const instructions = svg.append('g')
      .attr('class', 'instructions')
      .attr('transform', `translate(${width - 200}, 20)`);
    
    instructions.append('rect')
      .attr('width', 180)
      .attr('height', 90)
      .attr('rx', 5)
      .attr('fill', 'rgba(0, 0, 0, 0.5)');
    
    instructions.append('text')
      .attr('x', 10)
      .attr('y', 25)
      .attr('fill', 'white')
      .text('• Drag stars to move them');
    
    instructions.append('text')
      .attr('x', 10)
      .attr('y', 45)
      .attr('fill', 'white')
      .text('• Scroll to zoom in/out');
    
    instructions.append('text')
      .attr('x', 10)
      .attr('y', 65)
      .attr('fill', 'white')
      .text('• Click a star for details');
    
    instructions.append('text')
      .attr('x', 10)
      .attr('y', 85)
      .attr('fill', 'white')
      .text('• Double-click to reset zoom');
    
    // Since layout is static, no simulation is used

  }, [data, onNodeSelect]);
  
  return (
    <div className="constellation-container" ref={containerRef}>
      <svg className="constellation-svg" ref={svgRef}></svg>
    </div>
  );
};

export default ConstellationView; 
# Constellation of Knowledge

An interactive visualization of Wikipedia pages as a constellation of interconnected stars. This application allows you to explore knowledge about a specific topic by visually representing related Wikipedia pages and their connections.

## Features

- Search for any topic on Wikipedia
- Visualize related pages as stars in a constellation
- Interactive graph with zoom, pan, and click functionality
- View detailed information about each page
- Direct links to Wikipedia articles
- Star brightness represents page importance

## Technology Stack

- **Frontend**: React, D3.js, Vite
- **Backend**: Node.js, Express
- **API**: Wikipedia (MediaWiki) API
- **Styling**: CSS

## Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd constellation-of-knowledge
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

4. Open your browser and navigate to http://localhost:3000

## How to Use

1. Enter a topic in the search bar (e.g., "astronomy", "quantum physics", "renaissance art")
2. Explore the constellation by:
   - Dragging stars to move them around
   - Zooming in/out with the mouse wheel
   - Clicking on a star to view detailed information
3. Click "View on Wikipedia" to read the full article

## Project Structure

- `/server` - Backend Express server
  - `/data` - Data processing modules
- `/src` - Frontend React application
  - `/components` - React components
  - `/modules` - JavaScript modules
  - `/styles` - CSS styles

## Data Flow

1. User searches for a topic
2. Backend queries the Wikipedia API for related pages
3. Backend processes the data into a graph structure
4. Frontend visualizes the graph as an interactive constellation
5. User interacts with the visualization to explore the knowledge space

## License

[ISC License](https://opensource.org/licenses/ISC)

## Acknowledgements

- Wikipedia for providing the open API
- D3.js for the visualization capabilities 
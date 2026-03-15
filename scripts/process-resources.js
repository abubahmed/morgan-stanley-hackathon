const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../resources');
const OUTPUT_PATH = path.join(__dirname, '../public/graph-data.json');

/**
 * Aggregates harvested Markdown files and transforms them into GraphData
 */
function processResources() {
  console.log("🔍 Scanning resources folder...");
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error("❌ Error: resources folder not found at " + DATA_DIR);
    return;
  }

  const nodes = [];
  const cityMap = {}; // To group IDs by City
  const typeMap = {}; // To group IDs by Resource Type

  const cities = fs.readdirSync(DATA_DIR);

  cities.forEach(cityDir => {
    const cityPath = path.join(DATA_DIR, cityDir);
    if (!fs.statSync(cityPath).isDirectory()) return;

    const files = fs.readdirSync(cityPath);
    files.forEach(file => {
      if (!file.endsWith('.md')) return;

      const content = fs.readFileSync(path.join(cityPath, file), 'utf8');

      // --- 1. Parse Markdown back into Data ---
      const id = content.match(/\*\*ID:\*\* (.*)/)?.[1] || file.replace('.md', '');
      const name = content.match(/# (.*)/)?.[1] || "Unnamed Resource";
      const type = content.match(/\*\*Type:\*\* (.*)/)?.[1] || "N/A";
      const coords = content.match(/\*\*Coordinates:\*\* (.*), (.*)/);
      const address = content.match(/- \*\*Address:\*\* (.*)/)?.[1] || "";
      const limit = content.match(/- \*\*Usage Limit:\*\* (.*) per/)?.[1];

      const lat = coords ? parseFloat(coords[1]) : 0;
      const lng = coords ? parseFloat(coords[2]) : 0;
      const capacity = limit && !isNaN(limit) ? parseInt(limit) : 0;

      // --- 2. Create Node Object ---
      nodes.push({
        id,
        group: cityDir.replace(/_/g, ' '), // The Borough/City is the visual group
        name,
        description: `${address}. Type: ${type}`,
        features: {
          latitude: lat,
          longitude: lng,
          capacity: capacity,
          // Accessibility is mocked as high if it's in a city center
          accessibility: lat !== 0 ? 0.8 : 0.2 
        }
      });

      // Track for linking
      const cityClean = cityDir.replace(/_/g, ' ');
      if (!cityMap[cityClean]) cityMap[cityClean] = [];
      cityMap[cityClean].push(id);

      if (!typeMap[type]) typeMap[type] = [];
      typeMap[type].push(id);
    });
  });

  // --- 3. Create Intuitive Links ---
  const links = [];

  // Relationship A: CITY HUBS (Internal City Connections)
  // Connects every node in a city to the first node of that city
  Object.keys(cityMap).forEach(city => {
    const ids = cityMap[city];
    if (ids.length > 1) {
      const hubId = ids[0];
      for (let i = 1; i < ids.length; i++) {
        links.push({
          source: hubId,
          target: ids[i],
          value: 2 // Stronger local bond
        });
      }
    }
  });

  // Relationship B: CROSS-BOROUGH BRIDGES (By Resource Type)
  // Links resources of the same type (e.g., "Pantry") across city lines
  // Only links every 10th node to keep the graph clean
  Object.keys(typeMap).forEach(type => {
    const ids = typeMap[type];
    for (let i = 10; i < ids.length; i += 10) {
      links.push({
        source: ids[i - 10],
        target: ids[i],
        value: 1 // Lighter bridge bond
      });
    }
  });

  const graphData = { nodes, links };

  // --- 4. Write to Public Folder ---
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graphData, null, 2));
  console.log(`✅ Success! Generated ${nodes.length} nodes and ${links.length} links.`);
  console.log(`📍 File saved to: /public/graph-data.json`);
}

processResources();
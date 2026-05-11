const fs = require('fs');
const path = require('path');

const manualPath = path.join(__dirname, '../../Manual_Gestion_Taxi_2026.md');
const outputPath = path.join(__dirname, '../src/data/manual.json');

function parseManual() {
  const content = fs.readFileSync(manualPath, 'utf8');
  const lines = content.split('\n');
  
  const sections = [];
  let currentSection = null;

  lines.forEach(line => {
    if (line.startsWith('# ')) {
      // Main Title (skip or handle)
    } else if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: line.replace('## ', '').trim(),
        content: [],
        subsections: []
      };
    } else if (line.startsWith('### ')) {
      if (currentSection) {
        currentSection.subsections.push({
          title: line.replace('### ', '').trim(),
          content: []
        });
      }
    } else {
      if (currentSection) {
        if (currentSection.subsections.length > 0) {
          currentSection.subsections[currentSection.subsections.length - 1].content.push(line);
        } else {
          currentSection.content.push(line);
        }
      }
    }
  });

  if (currentSection) sections.push(currentSection);

  // Post-processing for checklists and tables could be added here
  // For now, let's keep it simple and clean the content arrays
  const structuredData = sections.map(s => ({
    ...s,
    content: s.content.join('\n').trim(),
    subsections: s.subsections.map(sub => ({
      ...sub,
      content: sub.content.join('\n').trim()
    }))
  }));

  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(structuredData, null, 2));
  console.log('Manual parsed and saved to JSON.');
}

parseManual();

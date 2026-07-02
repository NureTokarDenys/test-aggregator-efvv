const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDELINES_DIR = path.join(ROOT, 'src', 'data', 'guidelines');
const OUTPUT = path.join(ROOT, 'src', 'content', 'guidelineContent.js');

const GUIDELINE_FILES = {
  'questions-guidelines': 'questions-guidelines.txt',
  'db-creation-guidelines': 'db-creation-guidelines.txt',
};

const entries = Object.entries(GUIDELINE_FILES).map(([id, fileName]) => {
  const filePath = path.join(GUIDELINES_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing guideline file: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return `  ${JSON.stringify(id)}: ${JSON.stringify(content)}`;
});

const output = `// Auto-synced from src/data/guidelines/*.txt — run: npm run sync-guidelines
export const DEFAULT_GUIDELINE_CONTENT = {
${entries.join(',\n')}
};
`;

fs.writeFileSync(OUTPUT, output, 'utf8');
console.log(`Synced ${Object.keys(GUIDELINE_FILES).length} guidelines → ${path.relative(ROOT, OUTPUT)}`);

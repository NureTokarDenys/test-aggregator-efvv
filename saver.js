const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;
// Папка з базами даних
const DATABASES_DIR = path.join(__dirname, 'src', 'data', 'databases');
// Файл для збереження останньої активної БД
const ACTIVE_DB_FILE = path.join(__dirname, 'src', 'data', 'active-db.json');
// Папка з промптами для ШІ-інструкцій
const AI_PROMPTS_DIR = path.join(__dirname, 'src', 'data', 'ai-prompts');
const GUIDELINES_DIR = path.join(__dirname, 'src', 'data', 'guidelines');
const LEGACY_AI_PROMPT_FILE = path.join(__dirname, 'src', 'data', 'ai-generation-prompt.txt');
const LEGACY_QUESTIONS_GUIDELINES = path.join(__dirname, 'questions_guidelines.txt');
const LEGACY_DB_CREATION_GUIDELINES = path.join(__dirname, 'database_creation_guidelines.txt');
const AI_PROMPT_FILES = {
  'multiimport-all-sections': 'multiimport-all-sections.txt',
  'single-section-import': 'single-section-import.txt',
  'db-creation': 'db-creation.txt',
};
const GUIDELINE_FILES = {
  'questions-guidelines': 'questions-guidelines.txt',
  'db-creation-guidelines': 'db-creation-guidelines.txt',
};
// Legacy path used only for one-time migration into databases/
const LEGACY_DB_PATH = path.join(__dirname, 'src', 'data', 'questions.json');

// Створюємо папку для баз даних, якщо її немає
if (!fs.existsSync(DATABASES_DIR)) {
  fs.mkdirSync(DATABASES_DIR, { recursive: true });
  console.log(`📁 Створено папку для баз даних: ${DATABASES_DIR}`);
}

if (!fs.existsSync(GUIDELINES_DIR)) {
  fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
}

// Міграція старого questions.json у папку databases
function migrateLegacyDatabase() {
  const databases = getDatabasesList();
  if (databases.length > 0) return;

  if (fs.existsSync(LEGACY_DB_PATH)) {
    try {
      const content = fs.readFileSync(LEGACY_DB_PATH, 'utf8');
      const data = JSON.parse(content);
      const filePath = path.join(DATABASES_DIR, 'default.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      fs.writeFileSync(ACTIVE_DB_FILE, JSON.stringify({ activeDb: 'default' }, null, 2));
      console.log('📦 Міграція: questions.json → databases/default.json');
    } catch (err) {
      console.error('❌ Помилка міграції questions.json:', err);
    }
  }
}

function migrateGuidelines() {
  if (!fs.existsSync(GUIDELINES_DIR)) {
    fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
  }

  [
    [LEGACY_QUESTIONS_GUIDELINES, 'questions-guidelines.txt'],
    [LEGACY_DB_CREATION_GUIDELINES, 'db-creation-guidelines.txt'],
  ].forEach(([legacyPath, fileName]) => {
    const targetPath = path.join(GUIDELINES_DIR, fileName);
    if (!fs.existsSync(targetPath) && fs.existsSync(legacyPath)) {
      fs.copyFileSync(legacyPath, targetPath);
      console.log(`📦 Міграція: ${path.basename(legacyPath)} → guidelines/${fileName}`);
    }
  });
}

function getSectionsFromDb(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.sections)) return data.sections;
  return [];
}

// Функція для отримання списку баз даних
function getDatabasesList() {
  try {
    const files = fs.readdirSync(DATABASES_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const name = f.replace('.json', '');
        const filePath = path.join(DATABASES_DIR, f);
        const stats = fs.statSync(filePath);
        let questionCount = 0;
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const sections = getSectionsFromDb(data);
          questionCount = sections.reduce((acc, sec) =>
            acc + (sec.subsections?.reduce((sAcc, sub) =>
              sAcc + (sub.topics?.reduce((tAcc, top) =>
                tAcc + (top.questions?.length || 0), 0) || 0), 0) || 0), 0);
        } catch (e) {}
        return {
          id: name,
          name: name,
          fileName: f,
          questionCount,
          modified: stats.mtime.toISOString(),
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
  } catch (err) {
    console.error('❌ Помилка читання списку БД:', err);
    return [];
  }
}

// Функція для завантаження БД
function loadDatabase(dbId) {
  try {
    const filePath = path.join(DATABASES_DIR, `${dbId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`База даних "${dbId}" не знайдена`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ Помилка завантаження БД "${dbId}":`, err);
    throw err;
  }
}

// Функція для збереження БД
function saveDatabase(dbId, data) {
  try {
    const filePath = path.join(DATABASES_DIR, `${dbId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Оновлюємо файл активної БД
    fs.writeFileSync(ACTIVE_DB_FILE, JSON.stringify({ activeDb: dbId }, null, 2));

    return { success: true, path: filePath };
  } catch (err) {
    console.error(`❌ Помилка збереження БД "${dbId}":`, err);
    throw err;
  }
}

// Функція для створення нової БД
function createDatabase(dbId, data) {
  try {
    const filePath = path.join(DATABASES_DIR, `${dbId}.json`);
    if (fs.existsSync(filePath)) {
      throw new Error(`База даних "${dbId}" вже існує`);
    }
    const dbData = data || { originDocs: '', sections: [] };
    fs.writeFileSync(filePath, JSON.stringify(dbData, null, 2));

    fs.writeFileSync(ACTIVE_DB_FILE, JSON.stringify({ activeDb: dbId }, null, 2));

    return { success: true, path: filePath };
  } catch (err) {
    console.error(`❌ Помилка створення БД "${dbId}":`, err);
    throw err;
  }
}

// Функція для видалення БД
function deleteDatabase(dbId) {
  try {
    const filePath = path.join(DATABASES_DIR, `${dbId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`База даних "${dbId}" не знайдена`);
    }
    fs.unlinkSync(filePath);

    // Якщо видаляємо активну БД, скидаємо активну
    let activeDb = 'default';
    if (fs.existsSync(ACTIVE_DB_FILE)) {
      const activeContent = fs.readFileSync(ACTIVE_DB_FILE, 'utf8');
      const { activeDb: currentActive } = JSON.parse(activeContent);
      if (currentActive === dbId) {
        const remaining = getDatabasesList();
        activeDb = remaining.length > 0 ? remaining[0].id : 'default';
        fs.writeFileSync(ACTIVE_DB_FILE, JSON.stringify({ activeDb }, null, 2));
      }
    }

    return { success: true, activeDb };
  } catch (err) {
    console.error(`❌ Помилка видалення БД "${dbId}":`, err);
    throw err;
  }
}

// Функція для отримання останньої активної БД
function getActiveDatabase() {
  try {
    if (fs.existsSync(ACTIVE_DB_FILE)) {
      const content = fs.readFileSync(ACTIVE_DB_FILE, 'utf8');
      const { activeDb } = JSON.parse(content);
      // Перевіряємо чи існує
      const dbPath = path.join(DATABASES_DIR, `${activeDb}.json`);
      if (fs.existsSync(dbPath)) {
        return activeDb;
      }
    }
    // Фолбек - перша доступна або default
    const databases = getDatabasesList();
    if (databases.length > 0) {
      return databases[0].id;
    }
    return 'default';
  } catch (err) {
    console.error('❌ Помилка отримання активної БД:', err);
    return 'default';
  }
}

function loadAiPrompt(promptId) {
  const fileName = AI_PROMPT_FILES[promptId];
  if (!fileName) {
    throw new Error(`Невідомий промпт "${promptId}"`);
  }
  try {
    const filePath = path.join(AI_PROMPTS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return '';
  } catch (err) {
    console.error(`❌ Помилка читання промпту "${promptId}":`, err);
    throw err;
  }
}

function saveAiPrompt(promptId, text) {
  const fileName = AI_PROMPT_FILES[promptId];
  if (!fileName) {
    throw new Error(`Невідомий промпт "${promptId}"`);
  }
  try {
    if (!fs.existsSync(AI_PROMPTS_DIR)) {
      fs.mkdirSync(AI_PROMPTS_DIR, { recursive: true });
    }
    const filePath = path.join(AI_PROMPTS_DIR, fileName);
    fs.writeFileSync(filePath, text, 'utf8');
    return { success: true, path: filePath, promptId };
  } catch (err) {
    console.error(`❌ Помилка збереження промпту "${promptId}":`, err);
    throw err;
  }
}

function migrateAiPrompts() {
  if (!fs.existsSync(AI_PROMPTS_DIR)) {
    fs.mkdirSync(AI_PROMPTS_DIR, { recursive: true });
  }

  const legacyTarget = path.join(AI_PROMPTS_DIR, AI_PROMPT_FILES['multiimport-all-sections']);
  if (fs.existsSync(LEGACY_AI_PROMPT_FILE) && !fs.existsSync(legacyTarget)) {
    fs.copyFileSync(LEGACY_AI_PROMPT_FILE, legacyTarget);
    console.log('📦 Міграція: ai-generation-prompt.txt → ai-prompts/multiimport-all-sections.txt');
  }
}

function loadAiGenerationPrompt() {
  return loadAiPrompt('multiimport-all-sections');
}

function saveAiGenerationPrompt(text) {
  return saveAiPrompt('multiimport-all-sections', text);
}

function loadGuideline(guidelineId) {
  const fileName = GUIDELINE_FILES[guidelineId];
  if (!fileName) {
    throw new Error(`Невідома інструкція "${guidelineId}"`);
  }
  const filePath = path.join(GUIDELINES_DIR, fileName);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  const legacyPath = guidelineId === 'questions-guidelines'
    ? LEGACY_QUESTIONS_GUIDELINES
    : guidelineId === 'db-creation-guidelines'
      ? LEGACY_DB_CREATION_GUIDELINES
      : null;
  if (legacyPath && fs.existsSync(legacyPath)) {
    return fs.readFileSync(legacyPath, 'utf8');
  }
  throw new Error(`Файл інструкції "${fileName}" не знайдено`);
}

http.createServer((req, res) => {
  // Дозволяємо запити з вашого React-додатку (щоб не було помилок CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Відповідь на попередній запит браузера
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // GET /api/guidelines/:id - завантажити інструкцію з txt-файлу
  if (pathname.match(/^\/api\/guidelines\/([^/]+)$/) && req.method === 'GET') {
    const guidelineId = pathname.match(/^\/api\/guidelines\/([^/]+)$/)[1];
    try {
      const content = loadGuideline(guidelineId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, guidelineId, content }));
    } catch (err) {
      const status = err.message.includes('Невідом') || err.message.includes('не знайдено') ? 404 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
  // GET /api/ai-prompts/:id - завантажити промпт для ШІ
  else if (pathname.match(/^\/api\/ai-prompts\/([^/]+)$/) && req.method === 'GET') {
    const promptId = pathname.match(/^\/api\/ai-prompts\/([^/]+)$/)[1];
    try {
      const prompt = loadAiPrompt(promptId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, promptId, prompt }));
    } catch (err) {
      const status = err.message.includes('Невідомий') ? 404 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
  // POST /api/ai-prompts/:id - зберегти промпт для ШІ
  else if (pathname.match(/^\/api\/ai-prompts\/([^/]+)$/) && req.method === 'POST') {
    const promptId = pathname.match(/^\/api\/ai-prompts\/([^/]+)$/)[1];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { prompt } = JSON.parse(body);
        if (typeof prompt !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Поле prompt має бути рядком' }));
        }
        const result = saveAiPrompt(promptId, prompt);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        const status = err.message.includes('Невідомий') ? 404 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  }
  // GET /api/ai-generation-prompt - завантажити промпт для ШІ (legacy)
  else if (pathname === '/api/ai-generation-prompt' && req.method === 'GET') {
    try {
      const prompt = loadAiGenerationPrompt();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, prompt }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
  // POST /api/ai-generation-prompt - зберегти промпт для ШІ
  else if (pathname === '/api/ai-generation-prompt' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { prompt } = JSON.parse(body);
        if (typeof prompt !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Поле prompt має бути рядком' }));
        }
        const result = saveAiGenerationPrompt(prompt);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  }
  // GET /api/databases - список баз даних
  else if (pathname === '/api/databases' && req.method === 'GET') {
    try {
      const databases = getDatabasesList();
      const activeDb = getActiveDatabase();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, databases, activeDb }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
  // GET /api/databases/:id - завантажити конкретну БД
  else if (pathname.startsWith('/api/databases/') && req.method === 'GET') {
    const dbId = pathname.split('/api/databases/')[1];
    if (!dbId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'ID бази даних не вказано' }));
    }
    try {
      const data = loadDatabase(dbId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data, dbId }));
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
  // POST /api/databases - створити нову БД або імпортувати
  else if (pathname === '/api/databases' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { dbId, data, importFromFile } = JSON.parse(body);
        if (!dbId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'ID бази даних обов\'язковий' }));
        }

        let result;
        if (importFromFile && data) {
          // Імпорт з файлу - створюємо нову БД з даними
          result = createDatabase(dbId, data);
        } else {
          // Створення порожньої БД
          result = createDatabase(dbId, data || []);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  }
  // POST /api/databases/:id/save - зберегти зміни в БД
  else if (pathname.match(/^\/api\/databases\/([^/]+)\/save$/) && req.method === 'POST') {
    const dbId = pathname.match(/^\/api\/databases\/([^/]+)\/save$/)[1];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const result = saveDatabase(dbId, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  }
  // DELETE /api/databases/:id - видалити БД
  else if (pathname.startsWith('/api/databases/') && req.method === 'DELETE') {
    const dbId = pathname.split('/api/databases/')[1];
    if (!dbId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'ID бази даних не вказано' }));
    }
    try {
      const result = deleteDatabase(dbId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
  // Сумісність зі старим API - POST /api/save
  else if (pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const activeDb = getActiveDatabase();
        const data = JSON.parse(body);
        const result = saveDatabase(activeDb, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        console.error('❌ Помилка запису (старий API):', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  }
  else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, () => {
  migrateLegacyDatabase();
  migrateGuidelines();
  migrateAiPrompts();
  console.log(`💾 Сервер бази даних запущено на порту ${PORT}`);
  console.log(`📁 Папка баз даних: ${DATABASES_DIR}`);
  console.log(`📁 Папка промптів ШІ: ${AI_PROMPTS_DIR}`);
  console.log(`📁 Папка інструкцій: ${GUIDELINES_DIR}`);
  console.log(`🔗 API endpoints:`);
  console.log(`   GET    /api/databases           - список баз даних`);
  console.log(`   GET    /api/databases/:id       - завантажити БД`);
  console.log(`   POST   /api/databases           - створити/імпортувати БД`);
  console.log(`   POST   /api/databases/:id/save  - зберегти БД`);
  console.log(`   DELETE /api/databases/:id       - видалити БД`);
  console.log(`   POST   /api/save                - зберегти активну БД (старий API)`);
  console.log(`   GET    /api/guidelines/:id      - завантажити інструкцію`);
  console.log(`   GET    /api/ai-prompts/:id      - завантажити промпт ШІ`);
  console.log(`   POST   /api/ai-prompts/:id      - зберегти промпт ШІ`);
  console.log(`   GET    /api/ai-generation-prompt - завантажити промпт ШІ (legacy)`);
  console.log(`   POST   /api/ai-generation-prompt - зберегти промпт ШІ (legacy)`);
});
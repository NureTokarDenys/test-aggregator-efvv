const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
// Шлях до вашої бази даних
const FILE_PATH = path.join(__dirname, 'src', 'data', 'questions.json');

http.createServer((req, res) => {
  // Дозволяємо запити з вашого React-додатку (щоб не було помилок CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Відповідь на попередній запит браузера
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // Обробка збереження
  if (req.url === '/api/save' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        fs.writeFileSync(FILE_PATH, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log('✅ Зміни успішно записано у файл questions.json!');
      } catch (err) {
        console.error('❌ Помилка запису:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, () => {
  console.log(`💾 Сервер тихого збереження запущено на порту ${PORT}`);
  console.log(`Він автоматично перезаписуватиме файл: ${FILE_PATH}`);
});
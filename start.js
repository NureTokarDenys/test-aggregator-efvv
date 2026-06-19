const { spawn } = require('child_process');

console.log('🚀 Запуск Test Aggregator...');

// 1. Запускаємо наш локальний сервер для збереження файлів (saver.js)
const saverProcess = spawn('node', ['saver.js'], { 
  stdio: 'inherit', 
  shell: true 
});

// 2. Запускаємо сам React-додаток
const reactProcess = spawn('npm', ['run', 'react-start'], { 
  stdio: 'inherit', 
  shell: true 
});

// Якщо ви натиснете Ctrl+C, ми акуратно закриємо обидва процеси
process.on('SIGINT', () => {
  console.log('\n🛑 Зупинка процесів...');
  saverProcess.kill('SIGINT');
  reactProcess.kill('SIGINT');
  process.exit();
});
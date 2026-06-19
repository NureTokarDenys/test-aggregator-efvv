import React, { useState, useEffect } from 'react';
import initialData from './data/questions.json';
import Sidebar from './components/Sidebar';
import ManageQuestions from './components/ManageQuestions';
import TakeTest from './components/TakeTest';
import ConfirmModal from './components/ConfirmModal';
import { DownloadIcon } from './components/Icons';

export default function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('testAggregatorData');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch (e) { console.error('Помилка LocalStorage', e); }
    }
    return initialData;
  });

  const [activeTab, setActiveTab] = useState('manage'); 
  const [selectedPath, setSelectedPath] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: null });

  useEffect(() => {
    localStorage.setItem('testAggregatorData', JSON.stringify(data));
  }, [data]);

  const handleSaveClick = () => {
    setConfirmConfig({
      isOpen: true,
      type: 'save',
      title: 'Збереження у файл',
      message: 'Ви дійсно хочете назавжди перезаписати файл src/data/questions.json усіма останніми змінами (додані питання, зірочки, статуси)?',
      confirmText: 'Зберегти зміни',
      isDanger: false
    });
  };

  const handleResetClick = () => {
    setConfirmConfig({
      isOpen: true,
      type: 'reset',
      title: 'Скидання змін',
      message: 'Увага! Це назавжди видалить усі незбережені зміни (з кешу браузера) і поверне базу до початкового стану з локального файлу. Ви впевнені?',
      confirmText: 'Так, скинути',
      isDanger: true
    });
  };

  const performSaveToFile = async () => {
    setConfirmConfig({ isOpen: false }); 
    try {
      const response = await fetch('http://localhost:3001/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        alert('✅ Всі зміни миттєво та успішно збережено у src/data/questions.json!');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Помилка збереження: ' + err.message + '\n\nПереконайтеся, що ви запустили сервер збереження (saver.js).');
    }
  };

  const performReset = () => {
    setData(initialData);
    localStorage.removeItem('testAggregatorData');
    setConfirmConfig({ isOpen: false });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo" title="Test Aggregator - Платформа для тестування">
          <div className="header-logo-dot" />
          TestAggregator
        </div>
        
        <div className="header-nav">
          <button 
            className={`nav-btn ${activeTab === 'manage' ? 'active' : ''}`} 
            onClick={() => setActiveTab('manage')}
            title="Перейти до управління базою питань та редагування"
          >
            База питань
          </button>
          <button 
            className={`nav-btn ${activeTab === 'take' ? 'active' : ''}`} 
            onClick={() => setActiveTab('take')}
            title="Згенерувати новий тест та почати проходження"
          >
            Пройти тест
          </button>
        </div>

        <div className="header-stats" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-danger btn-sm" onClick={handleResetClick} title="Скасувати всі зміни, які ви зробили в цьому сеансі, і завантажити оригінальну базу з файлу">
            Скинути зміни
          </button>
          <button className="btn btn-success btn-sm" onClick={handleSaveClick} style={{ background: 'var(--green)', color: '#fff' }} title="Миттєво зберегти всі ваші зміни (редагування, зірочки, обране) у локальний файл на комп'ютері">
            <DownloadIcon /> Зберегти у файл
          </button>
        </div>
      </header>

      <div className="layout">
        {activeTab === 'manage' && (
          <Sidebar data={data} selectedPath={selectedPath} setSelectedPath={setSelectedPath} />
        )}
        
        <main className="main">
          {activeTab === 'manage' ? (
            <ManageQuestions data={data} setData={setData} selectedPath={selectedPath} />
          ) : (
            <TakeTest data={data} setData={setData} />
          )}
        </main>
      </div>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.type === 'save' ? performSaveToFile : performReset}
        onCancel={() => setConfirmConfig({ isOpen: false })}
      />
    </div>
  );
}
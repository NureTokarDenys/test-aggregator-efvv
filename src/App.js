import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeDbData, EMPTY_DB, countQuestions } from './dbFormat';
import Sidebar from './components/Sidebar';
import ManageQuestions from './components/ManageQuestions';
import TakeTest from './components/TakeTest';
import AiGuide from './components/AiGuide';
import ConfirmModal from './components/ConfirmModal';
import AddModal from './components/AddModal';
import ImportDropdown from './components/ImportDropdown';
import ImportTextModal from './components/ImportTextModal';
import { validateDbImportJson, formatImportErrorsForAlert } from './importValidation';
import { DownloadIcon, DatabaseIcon, PlusIcon } from './components/Icons';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  // === СТАН БАЗ ДАНИХ ===
  const [databases, setDatabases] = useState([]);           // список доступних БД
  const [activeDbId, setActiveDbId] = useState(null);       // ID поточної активної БД
  const [dbData, setDbData] = useState(() => ({ ...EMPTY_DB }));
  const data = dbData.sections;
  const [isLoading, setIsLoading] = useState(true);         // завантаження списку БД
  const [loadingDb, setLoadingDb] = useState(false);        // завантаження конкретної БД

  // === СТАН UI ===
  const [activeTab, setActiveTab] = useState('manage');
  const [selectedPath, setSelectedPath] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: null });
  const [dbActionPending, setDbActionPending] = useState(null); // 'import' | 'export' | 'switch' | 'new'
  const [pendingDbId, setPendingDbId] = useState(null);         // ID БД для перемикання
  const [newDbName, setNewDbName] = useState('');               // назва нової БД
  const [importFile, setImportFile] = useState(null);           // файл для імпорту
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportTextModalOpen, setIsImportTextModalOpen] = useState(false);

  // === TRACKING ЗМІН ===
  const initialDataRef = useRef(JSON.stringify(EMPTY_DB));
  const savedDataRef = useRef(JSON.stringify(EMPTY_DB));
  const hasUnsavedChanges = JSON.stringify(dbData) !== savedDataRef.current;

  const setData = useCallback((updater) => {
    setDbData(prev => {
      const newSections = typeof updater === 'function' ? updater(prev.sections) : updater;
      return { ...prev, sections: newSections };
    });
  }, []);

  // === ЗАВАНТАЖЕННЯ СПИСКУ БД ПРИ СТАРТІ ===
  useEffect(() => {
    loadDatabasesList();
  }, []);

  const refreshDatabasesList = async () => {
    try {
      const response = await fetch(`${API_BASE}/databases`);
      const result = await response.json();
      if (result.success) {
        setDatabases(result.databases);
      }
    } catch (err) {
      console.error('Помилка оновлення списку БД:', err);
    }
  };

  const loadDatabasesList = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/databases`);
      const result = await response.json();
      if (result.success) {
        setDatabases(result.databases);
        // Відновлюємо останню активну БД
        const savedActiveDb = localStorage.getItem('testAggregatorActiveDb');
        const activeDb = savedActiveDb && result.databases.some(d => d.id === savedActiveDb)
          ? savedActiveDb
          : result.activeDb;

        if (activeDb) {
          await loadDatabase(activeDb);
        } else if (result.databases.length > 0) {
          await loadDatabase(result.databases[0].id);
        } else {
          // Немає БД - створюємо дефолтну
          await createDefaultDatabase();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Помилка завантаження списку БД:', err);
      // Фолбек на localStorage
      let fallbackDb = { ...EMPTY_DB };
      const saved = localStorage.getItem('testAggregatorData');
      if (saved) {
        try { fallbackDb = normalizeDbData(JSON.parse(saved)); } catch (e) {}
      }
      setDbData(fallbackDb);
      setDatabases([{
        id: 'default',
        name: 'Основна база',
        questionCount: countQuestions(fallbackDb),
        modified: new Date().toISOString()
      }]);
      setActiveDbId('default');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultDatabase = async () => {
    try {
      const response = await fetch(`${API_BASE}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbId: 'default', data: { ...EMPTY_DB } })
      });
      const result = await response.json();
      if (result.success) {
        await loadDatabase('default');
      }
    } catch (err) {
      console.error('Помилка створення дефолтної БД:', err);
    }
  };

  const loadDatabase = async (dbId) => {
    if (hasUnsavedChanges && activeDbId && dbId !== activeDbId) {
      // Є незбережені зміни - просимо підтвердження
      setPendingDbId(dbId);
      setDbActionPending('switch');
      setConfirmConfig({
        isOpen: true,
        type: 'switchDb',
        title: 'Перемикання бази даних',
        message: 'У поточній базі даних є незбережені зміни. Бажаєте зберегти їх перед перемиканням?',
        confirmText: 'Зберегти і перемикати',
        cancelText: 'Відмінити',
        isDanger: false,
        showDiscardOption: true
      });
      return;
    }

    await performLoadDatabase(dbId);
  };

  const performLoadDatabase = async (dbId) => {
    setLoadingDb(true);
    try {
      const response = await fetch(`${API_BASE}/databases/${dbId}`);
      const result = await response.json();
      if (result.success) {
        const normalized = normalizeDbData(result.data);
        setDbData(normalized);
        savedDataRef.current = JSON.stringify(normalized);
        setActiveDbId(dbId);
        localStorage.setItem('testAggregatorActiveDb', dbId);
        refreshDatabasesList();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Помилка завантаження БД: ' + err.message);
    } finally {
      setLoadingDb(false);
    }
  };

  const saveCurrentDatabase = async (silent = false, dataOverride = null) => {
    if (!activeDbId) return false;

    const payload = dataOverride || dbData;

    try {
      const response = await fetch(`${API_BASE}/databases/${activeDbId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        savedDataRef.current = JSON.stringify(payload);
        if (!silent) alert('✅ Базу даних успішно збережено!');
        refreshDatabasesList();
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Помилка збереження: ' + err.message);
      return false;
    }
  };

  const openImportFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handleImportFile(file);
    };
    input.click();
  };

  const showNewDbNameModal = () => {
    setNewDbName('');
    setConfirmConfig({
      isOpen: true,
      type: 'newDbName',
      title: 'Нова база даних',
      message: 'Введіть назву для нової бази даних:',
      confirmText: 'Створити',
      cancelText: 'Відмінити',
      isDanger: false,
      showInput: true,
      showDiscardOption: false
    });
  };

  // === ОБРОБКА ІМПОРТУ ===
  const requestImportFromFile = () => {
    if (hasUnsavedChanges && activeDbId) {
      setDbActionPending('import');
      setConfirmConfig({
        isOpen: true,
        type: 'importDb',
        title: 'Імпорт бази даних',
        message: 'У поточній базі даних є незбережені зміни. Бажаєте зберегти їх перед імпортом нової бази?',
        confirmText: 'Зберегти і імпортувати',
        cancelText: 'Відмінити',
        isDanger: false,
        showDiscardOption: true
      });
      return;
    }
    openImportFilePicker();
  };

  const requestImportFromText = () => {
    if (hasUnsavedChanges && activeDbId) {
      setDbActionPending('importText');
      setConfirmConfig({
        isOpen: true,
        type: 'importTextDb',
        title: 'Імпорт бази з тексту',
        message: 'У поточній базі даних є незбережені зміни. Бажаєте зберегти їх перед створенням нової бази?',
        confirmText: 'Зберегти і продовжити',
        cancelText: 'Відмінити',
        isDanger: false,
        showDiscardOption: true
      });
      return;
    }
    setIsImportTextModalOpen(true);
  };

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const validation = validateDbImportJson(e.target.result);
      if (!validation.ok) {
        alert('Помилка імпорту файлу:\n\n' + formatImportErrorsForAlert(validation.errors));
        return;
      }

      const activeDbName = databases.find(d => d.id === activeDbId)?.name || activeDbId;
      setImportFile({ name: file.name, data: validation.data });
      setDbActionPending('importConfirm');
      setConfirmConfig({
        isOpen: true,
        type: 'importConfirm',
        title: 'Підтвердження імпорту',
        message: `Замінити поточну базу "${activeDbName}" даними з файлу "${file.name}"? Це перезапише всі питання в активній базі.`,
        confirmText: 'Імпортувати',
        cancelText: 'Відмінити',
        isDanger: true
      });
    };
    reader.onerror = () => {
      alert('Помилка читання файлу.\n\nЯк виправити: переконайтесь, що файл доступний для читання, не пошкоджений і має кодування UTF-8.');
    };
    reader.readAsText(file);
  };

  const performImportFromText = async (dbId, data) => {
    const response = await fetch(`${API_BASE}/databases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbId, data, importFromFile: true })
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Не вдалося створити базу даних');
    }
    await performLoadDatabase(dbId);
    await refreshDatabasesList();
    alert(`✅ Базу «${dbId}» успішно створено та збережено як ${dbId}.json`);
  };

  const performImport = async () => {
    if (!importFile || !activeDbId) return;

    try {
      const response = await fetch(`${API_BASE}/databases/${activeDbId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importFile.data)
      });
      const result = await response.json();
      if (result.success) {
        setDbData(importFile.data);
        savedDataRef.current = JSON.stringify(importFile.data);
        setImportFile(null);
        refreshDatabasesList();
        alert('✅ Базу даних успішно імпортовано!');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Помилка імпорту: ' + err.message);
    }
  };

  // === ОБРОБКА ЕКСПОРТУ (ЗАВАНТАЖЕННЯ) ===
  const handleExportClick = () => {
    if (hasUnsavedChanges && activeDbId) {
      setDbActionPending('export');
      setConfirmConfig({
        isOpen: true,
        type: 'exportDb',
        title: 'Експорт бази даних',
        message: 'У поточній базі даних є незбережені зміни. Бажаєте зберегти їх перед експортом?',
        confirmText: 'Зберегти і експортувати',
        cancelText: 'Відмінити',
        isDanger: false,
        showDiscardOption: true
      });
      return;
    }
    performExport();
  };

  const performExport = () => {
    if (!activeDbId) return;

    const db = databases.find(d => d.id === activeDbId);
    const fileName = db ? `${db.name}.json` : 'database.json';

    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // === СТВОРЕННЯ НОВОЇ БД ===
  const handleNewDatabaseClick = () => {
    if (hasUnsavedChanges && activeDbId) {
      setDbActionPending('new');
      setConfirmConfig({
        isOpen: true,
        type: 'newDb',
        title: 'Створення нової бази даних',
        message: 'У поточній базі даних є незбережені зміни. Бажаєте зберегти їх перед створенням нової бази?',
        confirmText: 'Зберегти і створити',
        cancelText: 'Відмінити',
        isDanger: false,
        showDiscardOption: true
      });
      return;
    }
    setDbActionPending('newConfirm');
    showNewDbNameModal();
  };

  const performNewDatabase = async () => {
    const dbId = newDbName.trim().replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
    if (!dbId) {
      alert('Введіть назву бази даних');
      return;
    }

    if (databases.some(db => db.id === dbId)) {
      alert('База даних з такою назвою вже існує');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbId, data: EMPTY_DB })
      });
      const result = await response.json();
      if (result.success) {
        await loadDatabase(dbId);
        setNewDbName('');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Помилка створення БД: ' + err.message);
    }
  };

  // === СКИДАННЯ ЗМІН (RESET) ===
  const handleResetClick = () => {
    setConfirmConfig({
      isOpen: true,
      type: 'reset',
      title: 'Скидання змін',
      message: 'Увага! Це назавжди видалить усі незбережені зміни в поточній базі даних і поверне її до останнього збереженого стану. Ви впевнені?',
      confirmText: 'Так, скинути',
      isDanger: true
    });
  };

  const performReset = () => {
    if (activeDbId) {
      loadDatabase(activeDbId); // перезавантажуємо з диска
    } else {
      setDbData({ ...EMPTY_DB });
    }
    setConfirmConfig({ isOpen: false });
  };

  // === ОБРОБКА ПІДТВЕРДЖЕНЬ ===
  const handleConfirm = async () => {
    const { type } = confirmConfig;
    const needsSaveFirst = ['switchDb', 'importDb', 'importTextDb', 'exportDb', 'newDb'].includes(type) && hasUnsavedChanges && activeDbId;

    if (needsSaveFirst) {
      const saved = await saveCurrentDatabase(true);
      if (!saved) return;
    }

    switch (type) {
      case 'save':
        await saveCurrentDatabase();
        break;
      case 'reset':
        performReset();
        return;
      case 'switchDb':
        await performLoadDatabase(pendingDbId);
        break;
      case 'importDb':
        openImportFilePicker();
        setConfirmConfig({ isOpen: false });
        setDbActionPending(null);
        return;
      case 'importTextDb':
        setIsImportTextModalOpen(true);
        setConfirmConfig({ isOpen: false });
        setDbActionPending(null);
        return;
      case 'importConfirm':
        await performImport();
        break;
      case 'exportDb':
        performExport();
        break;
      case 'newDb':
        showNewDbNameModal();
        return;
      case 'newDbName':
        await performNewDatabase();
        break;
      case 'deleteSection':
        performDeleteSection(confirmConfig.deleteTarget.secIdx);
        return;
      case 'deleteSubsection':
        performDeleteSubsection(confirmConfig.deleteTarget.secIdx, confirmConfig.deleteTarget.subIdx);
        return;
      case 'deleteTopic':
        performDeleteTopic(confirmConfig.deleteTarget.secIdx, confirmConfig.deleteTarget.subIdx, confirmConfig.deleteTarget.topIdx);
        return;
    }

    setConfirmConfig({ isOpen: false });
    setDbActionPending(null);
    setPendingDbId(null);
  };

  const handleDiscardAndConfirm = async () => {
    const { type } = confirmConfig;

    // Не зберігаємо, просто виконуємо дію
    switch (type) {
      case 'switchDb':
        await performLoadDatabase(pendingDbId);
        break;
      case 'importDb':
        openImportFilePicker();
        setConfirmConfig({ isOpen: false });
        setDbActionPending(null);
        return;
      case 'importTextDb':
        setIsImportTextModalOpen(true);
        setConfirmConfig({ isOpen: false });
        setDbActionPending(null);
        return;
      case 'exportDb':
        performExport();
        break;
      case 'newDb':
        showNewDbNameModal();
        return;
    }

    setConfirmConfig({ isOpen: false });
    setDbActionPending(null);
    setPendingDbId(null);
  };

  const handleSaveOriginDocs = async (newValue) => {
    const updated = { ...dbData, originDocs: newValue };
    setDbData(updated);
    await saveCurrentDatabase(true, updated);
  };

  // === EDIT FUNCTIONS ===
  const editSection = useCallback((secIdx, newTitle) => {
    setData(prev => {
      if (!prev || !prev[secIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].title = newTitle;
      return newData;
    });
  }, [setData]);

  const editSubsection = useCallback((secIdx, subIdx, newTitle) => {
    setData(prev => {
      if (!prev || !prev[secIdx] || !prev[secIdx].subsections[subIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].subsections[subIdx].title = newTitle;
      return newData;
    });
  }, [setData]);

  const editTopic = useCallback((secIdx, subIdx, topIdx, newTitle) => {
    setData(prev => {
      if (!prev || !prev[secIdx] || !prev[secIdx].subsections[subIdx] || !prev[secIdx].subsections[subIdx].topics[topIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].subsections[subIdx].topics[topIdx].title = newTitle;
      return newData;
    });
  }, [setData]);

  const adjustPathAfterDelete = (path, deleteType, secIdx, subIdx, topIdx) => {
    if (!path) return null;
    if (deleteType === 'topic') {
      if (path.sec !== secIdx || path.sub !== subIdx) return path;
      if (path.top === topIdx) return null;
      if (path.top > topIdx) return { ...path, top: path.top - 1 };
      return path;
    }
    if (deleteType === 'subsection') {
      if (path.sec !== secIdx) return path;
      if (path.sub === subIdx) return null;
      if (path.sub > subIdx) return { ...path, sub: path.sub - 1 };
      return path;
    }
    if (deleteType === 'section') {
      if (path.sec === secIdx) return null;
      if (path.sec > secIdx) return { ...path, sec: path.sec - 1 };
      return path;
    }
    return path;
  };

  const countQuestionsInSection = (sec) =>
    sec.subsections.reduce((acc, sub) =>
      acc + sub.topics.reduce((a, t) => a + (t.questions?.length || 0), 0), 0);

  const countQuestionsInSubsection = (sub) =>
    sub.topics.reduce((acc, t) => acc + (t.questions?.length || 0), 0);

  const addSection = useCallback(() => {
    setData(prev => {
      const newData = JSON.parse(JSON.stringify(prev || []));
      newData.push({ title: 'Новий розділ', subsections: [] });
      return newData;
    });
  }, []);

  const addSubsection = useCallback((secIdx) => {
    setData(prev => {
      if (!prev?.[secIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].subsections.push({ title: 'Новий підрозділ', topics: [] });
      return newData;
    });
  }, []);

  const addTopic = useCallback((secIdx, subIdx) => {
    setData(prev => {
      if (!prev?.[secIdx]?.subsections?.[subIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].subsections[subIdx].topics.push({ title: 'Нова тема', questions: [] });
      return newData;
    });
  }, []);

  const performDeleteSection = useCallback((secIdx) => {
    setData(prev => {
      if (!prev?.[secIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData.splice(secIdx, 1);
      return newData;
    });
    setSelectedPath(prev => adjustPathAfterDelete(prev, 'section', secIdx));
    setConfirmConfig({ isOpen: false });
  }, []);

  const performDeleteSubsection = useCallback((secIdx, subIdx) => {
    setData(prev => {
      if (!prev?.[secIdx]?.subsections?.[subIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].subsections.splice(subIdx, 1);
      return newData;
    });
    setSelectedPath(prev => adjustPathAfterDelete(prev, 'subsection', secIdx, subIdx));
    setConfirmConfig({ isOpen: false });
  }, []);

  const performDeleteTopic = useCallback((secIdx, subIdx, topIdx) => {
    setData(prev => {
      if (!prev?.[secIdx]?.subsections?.[subIdx]?.topics?.[topIdx]) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData[secIdx].subsections[subIdx].topics.splice(topIdx, 1);
      return newData;
    });
    setSelectedPath(prev => adjustPathAfterDelete(prev, 'topic', secIdx, subIdx, topIdx));
    setConfirmConfig({ isOpen: false });
  }, []);

  const requestDeleteSection = (secIdx) => {
    const sec = data[secIdx];
    if (!sec) return;
    const qCount = countQuestionsInSection(sec);
    setConfirmConfig({
      isOpen: true,
      type: 'deleteSection',
      title: 'Видалення розділу',
      message: `Видалити розділ «${sec.title}»?${qCount > 0 ? ` Разом з ним буде видалено ${qCount} питань.` : ''} Цю дію неможливо скасувати.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      isDanger: true,
      deleteTarget: { secIdx }
    });
  };

  const requestDeleteSubsection = (secIdx, subIdx) => {
    const sub = data[secIdx]?.subsections?.[subIdx];
    if (!sub) return;
    const qCount = countQuestionsInSubsection(sub);
    setConfirmConfig({
      isOpen: true,
      type: 'deleteSubsection',
      title: 'Видалення підрозділу',
      message: `Видалити підрозділ «${sub.title}»?${qCount > 0 ? ` Разом з ним буде видалено ${qCount} питань.` : ''} Цю дію неможливо скасувати.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      isDanger: true,
      deleteTarget: { secIdx, subIdx }
    });
  };

  const requestDeleteTopic = (secIdx, subIdx, topIdx) => {
    const top = data[secIdx]?.subsections?.[subIdx]?.topics?.[topIdx];
    if (!top) return;
    const qCount = top.questions?.length || 0;
    setConfirmConfig({
      isOpen: true,
      type: 'deleteTopic',
      title: 'Видалення теми',
      message: `Видалити тему «${top.title}»?${qCount > 0 ? ` Разом з нею буде видалено ${qCount} питань.` : ''} Цю дію неможливо скасувати.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      isDanger: true,
      deleteTarget: { secIdx, subIdx, topIdx }
    });
  };

  // === AUTO-SAVE в LOCALSTORAGE (для відновлення при закритті вкладки) ===
  useEffect(() => {
    localStorage.setItem('testAggregatorData', JSON.stringify(dbData));
  }, [dbData]);

  // === RENDER ===
  if (isLoading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>Завантаження баз даних...</div>
        </div>
      </div>
    );
  }

  const activeDb = databases.find(db => db.id === activeDbId);
  const getDbQuestionCount = (db) =>
    db.id === activeDbId ? countQuestions(dbData) : (db.questionCount ?? 0);

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
          <button
            className={`nav-btn ${activeTab === 'ai-guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-guide')}
            title="Покрокова інструкція з генерації питань за допомогою ШІ"
          >
            Генерація ШІ
          </button>
        </div>

        <div className="header-db">
          {/* Селектор бази даних */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <DatabaseIcon style={{ marginRight: '6px', color: 'var(--accent)' }} />
            <select
              className="db-select"
              value={activeDbId || ''}
              onChange={(e) => loadDatabase(e.target.value)}
              disabled={loadingDb}
            >
              {databases.map(db => (
                <option key={db.id} value={db.id}>
                  {db.name} ({getDbQuestionCount(db)} питань)
                </option>
              ))}
            </select>
            {hasUnsavedChanges && (
              <span className="unsaved-badge" title="Є незбережені зміни" />
            )}
          </div>

          {/* Кнопки управління БД */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-sm"
              onClick={handleNewDatabaseClick}
              title="Створити нову порожню базу даних"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <PlusIcon style={{width: 16, height: 16}} /> Нова БД
            </button>
            <ImportDropdown
              onImportFile={requestImportFromFile}
              onImportText={requestImportFromText}
              disabled={loadingDb}
            />
            <button
              className="btn btn-sm"
              onClick={handleExportClick}
              title="Завантажити поточну базу даних як JSON файл"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <DownloadIcon style={{width: 16, height: 16}} /> Експорт
            </button>
          </div>
        </div>

        <div className="header-stats" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsAddModalOpen(true)}
            title="Створити нове питання або імпортувати масив"
          >
            <PlusIcon style={{ width: 16, height: 16 }} /> Додати питання
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleResetClick} title="Скасувати всі зміни в поточній сесії і завантажити оригінальну базу з файлу">
            Скинути зміни
          </button>
          <button className="btn btn-success btn-sm" onClick={saveCurrentDatabase} style={{ background: 'var(--green)', color: '#fff' }} title="Миттєво зберегти всі зміни в активну базу даних">
            <DownloadIcon /> Зберегти
          </button>
        </div>
      </header>

      <div className="layout">
        {activeTab === 'manage' && (
          <Sidebar
              data={data}
              originDocs={dbData.originDocs}
              onSaveOriginDocs={handleSaveOriginDocs}
              selectedPath={selectedPath}
              setSelectedPath={setSelectedPath}
              onEditSection={editSection}
              onEditSubsection={editSubsection}
              onEditTopic={editTopic}
              onAddSection={addSection}
              onAddSubsection={addSubsection}
              onAddTopic={addTopic}
              onDeleteSection={requestDeleteSection}
              onDeleteSubsection={requestDeleteSubsection}
              onDeleteTopic={requestDeleteTopic}
            />
        )}

        <main className="main">
          {activeTab === 'manage' && (
            <ManageQuestions
              data={data}
              setData={setData}
              selectedPath={selectedPath}
              onEditSection={editSection}
              onEditSubsection={editSubsection}
              onEditTopic={editTopic}
            />
          )}
          {activeTab === 'take' && (
            <TakeTest data={data} setData={setData} />
          )}
          {activeTab === 'ai-guide' && (
            <AiGuide
              originDocs={dbData.originDocs}
              dbName={activeDb?.name}
              sections={data}
            />
          )}
        </main>
      </div>

      {/* Підказка про незбережені зміни */}
      {hasUnsavedChanges && activeDbId && (
        <div className="unsaved-banner">
          ⚠️ Є незбережені зміни в базі "{activeDb?.name || activeDbId}". Натисніть "Зберегти" в хедері.
        </div>
      )}

      {isAddModalOpen && (
        <AddModal
          data={data}
          setData={setData}
          selectedPath={selectedPath}
          close={() => setIsAddModalOpen(false)}
        />
      )}

      {isImportTextModalOpen && (
        <ImportTextModal
          close={() => setIsImportTextModalOpen(false)}
          databases={databases}
          onImport={performImportFromText}
        />
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        isDanger={confirmConfig.isDanger}
        showDiscardOption={confirmConfig.showDiscardOption}
        showInput={confirmConfig.showInput}
        inputValue={newDbName}
        inputPlaceholder="Назва бази даних"
        onInputChange={(e) => setNewDbName(e.target.value)}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmConfig({ isOpen: false })}
        onDiscard={handleDiscardAndConfirm}
      />
    </div>
  );
}
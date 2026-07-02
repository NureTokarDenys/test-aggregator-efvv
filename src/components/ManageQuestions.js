import React, { useState } from 'react';
import { PlusIcon, TrashIcon, EmptyIcon, EditIcon, StarIcon, FireIcon, EyeIcon, CopyIcon } from './Icons';
import AddModal from './AddModal';
import ConfirmModal from './ConfirmModal';

export default function ManageQuestions({ data, setData, selectedPath, onEditSection, onEditSubsection, onEditTopic }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingBreadcrumb, setEditingBreadcrumb] = useState(null); // { type: 'section'|'subsection'|'topic', secIdx, subIdx, topIdx, title: '' }

  // Універсальна функція для копіювання тексту в буфер
  const copyTextToClipboard = (text, message = "✅ Текст успішно скопійовано!") => {
    navigator.clipboard.writeText(text).then(() => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3000);
    }).catch(err => {
      alert("Не вдалося скопіювати: " + err.message);
    });
  };

  const copyToClipboard = (jsonData, message = "✅ JSON успішно скопійовано!") => {
    copyTextToClipboard(JSON.stringify(jsonData, null, 2), message);
  };

  const buildQuestionStatsText = (sections) => {
    const lines = ['Статистика кількості питань', ''];
    let total = 0;

    sections.forEach((sec) => {
      const secCount = (sec.subsections || []).reduce(
        (acc, sub) => acc + (sub.topics || []).reduce((a, t) => a + (t.questions?.length || 0), 0),
        0
      );
      total += secCount;
      lines.push(`${sec.title}: ${secCount}`);

      (sec.subsections || []).forEach((sub) => {
        const subCount = (sub.topics || []).reduce((a, t) => a + (t.questions?.length || 0), 0);
        lines.push(`  ${sub.title}: ${subCount}`);

        (sub.topics || []).forEach((top) => {
          lines.push(`    ${top.title}: ${top.questions?.length || 0}`);
        });
      });

      lines.push('');
    });

    lines.splice(2, 0, `Всього питань: ${total}`, '');
    return lines.join('\n');
  };

  // Breadcrumb edit handlers
  const startBreadcrumbEdit = (type, secIdx, subIdx, topIdx, title) => {
    setEditingBreadcrumb({ type, secIdx, subIdx, topIdx, title });
  };

  const handleBreadcrumbEditSave = () => {
    if (!editingBreadcrumb) return;
    const { type, secIdx, subIdx, topIdx, title } = editingBreadcrumb;
    if (type === 'section' && onEditSection) onEditSection(secIdx, title);
    else if (type === 'subsection' && onEditSubsection) onEditSubsection(secIdx, subIdx, title);
    else if (type === 'topic' && onEditTopic) onEditTopic(secIdx, subIdx, topIdx, title);
    setEditingBreadcrumb(null);
  };

  const handleBreadcrumbEditCancel = () => setEditingBreadcrumb(null);

  const handleBreadcrumbEditChange = (e) => {
    setEditingBreadcrumb(prev => prev ? { ...prev, title: e.target.value } : null);
  };

  const handleBreadcrumbEditKeyDown = (e) => {
    if (e.key === 'Enter') handleBreadcrumbEditSave();
    else if (e.key === 'Escape') handleBreadcrumbEditCancel();
  };

  // Допоміжна функція для форматування назв у хлібних крихтах
  // Залишає цифрову нумерацію (напр. "6.1.") і обрізає занадто довгий текст
  const formatBreadcrumb = (title) => {
    if (!title) return "";
    return title.length > 45 ? title.substring(0, 45) + "..." : title;
  };

  // --- ГЛОБАЛЬНИЙ ДАШБОРД (Коли тема не вибрана) ---
  if (!selectedPath) {
    const totalSections = data.length;
    let allQs = [];
    data.forEach(sec => sec.subsections?.forEach(sub => sub.topics?.forEach(top => allQs.push(...(top.questions || [])))));
    
    const totalQuestions = allQs.length;
    const totalVerified = allQs.filter(q => q.status === 'verified').length;
    const totalOfficial = allQs.filter(q => q.status === 'official').length;
    const totalFavorites = allQs.filter(q => q.favorite).length;
    const totalSeen = allQs.filter(q => q.seen).length;

    return (
      <div className="content-area" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 className="questions-title" style={{ margin: 0 }}>Загальна статистика бази</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => copyTextToClipboard(buildQuestionStatsText(data), "✅ Статистику питань скопійовано!")}
              title="Скопіювати кількість питань у кожному розділі, підрозділі та темі"
              style={{ background: 'var(--surface2)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CopyIcon /> Скопіювати статистику
            </button>
            <button 
              className="btn" 
              onClick={() => copyToClipboard(data, "✅ ВСЮ БАЗУ (questions.json) скопійовано!")} 
              title="Скопіювати повний файл questions.json з усіма розділами в буфер обміну"
              style={{ background: 'var(--surface2)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CopyIcon /> Скопіювати ВСЮ базу (JSON)
            </button>
          </div>
        </div>
        
        <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <div className="overview-card" title="Кількість головних розділів у базі">
            <div className="overview-card-title">Розділи</div>
            <div className="overview-card-num">{totalSections}</div>
            <div className="overview-card-sub">Всього дисциплін</div>
          </div>
          <div className="overview-card" title="Загальна кількість питань, доступних для тестування">
            <div className="overview-card-title">Всього питань</div>
            <div className="overview-card-num">{totalQuestions}</div>
            <div className="overview-card-sub">У базі даних</div>
          </div>
          <div className="overview-card" style={{ borderColor: 'rgba(59, 130, 246, 0.5)' }} title="Питання, на які ви вже хоча б раз давали відповідь">
            <div className="overview-card-title">Бачені (👁️)</div>
            <div className="overview-card-num" style={{ color: '#3b82f6' }}>{totalSeen}</div>
            <div className="overview-card-sub">Вже опрацьовано</div>
          </div>
          <div className="overview-card" style={{ borderColor: 'rgba(249, 115, 22, 0.5)' }} title="Питання, які ви відмітили вогником як важливі">
            <div className="overview-card-title">Обрані (🔥)</div>
            <div className="overview-card-num" style={{ color: '#f97316' }}>{totalFavorites}</div>
            <div className="overview-card-sub">Збережені вами</div>
          </div>
          <div className="overview-card" title="Питання, відмічені 1 зірочкою">
            <div className="overview-card-title">Перевірені (*)</div>
            <div className="overview-card-num" style={{ color: 'var(--yellow)' }}>{totalVerified}</div>
            <div className="overview-card-sub">Якісні питання</div>
          </div>
          <div className="overview-card" title="Питання з офіційного джерела (ЄФВВ)">
            <div className="overview-card-title">Офіційні (**)</div>
            <div className="overview-card-num" style={{ color: 'var(--yellow)' }}>{totalOfficial}</div>
            <div className="overview-card-sub">З бази ЄФВВ</div>
          </div>
        </div>

        <div className="empty-state" style={{ marginTop: '40px', padding: '40px' }}>
          <EmptyIcon />
          <h3>Оберіть тему для редагування</h3>
          <p>Виберіть розділ, підрозділ та тему в лівому меню, щоб переглянути або додати запитання.</p>
        </div>

        {toastMessage && (
          <div className="toast success" style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)', fontWeight: 600 }}>
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  const { sec, sub, top } = selectedPath;
  const section = data[sec];
  const subsection = section.subsections[sub];
  const topic = subsection.topics[top];

  const handleDeleteClick = (qIdx) => setDeleteTarget(qIdx);

  const performDelete = () => {
    const newData = JSON.parse(JSON.stringify(data));
    newData[sec].subsections[sub].topics[top].questions.splice(deleteTarget, 1);
    setData(newData);
    setDeleteTarget(null);
  };

  const handleEditClick = (qIdx, qData) => {
    setEditingQ({ idx: qIdx, form: JSON.parse(JSON.stringify(qData)) });
  };

  const handleEditSave = () => {
    const newData = JSON.parse(JSON.stringify(data));
    const targetQ = newData[sec].subsections[sub].topics[top].questions[editingQ.idx];
    targetQ.q = editingQ.form.q;
    targetQ.a = editingQ.form.a;
    targetQ.correct = Number(editingQ.form.correct);
    if (editingQ.form.status === 'none') delete targetQ.status;
    else targetQ.status = editingQ.form.status;
    targetQ.seen = editingQ.form.seen;
    targetQ.favorite = editingQ.form.favorite;
    setData(newData);
    setEditingQ(null);
  };

  const toggleFavorite = (qIdx) => {
    const newData = JSON.parse(JSON.stringify(data));
    const targetQ = newData[sec].subsections[sub].topics[top].questions[qIdx];
    targetQ.favorite = !targetQ.favorite;
    setData(newData);
  };

  const renderStars = (q) => (
    <>
      {q.status === 'official' && <span title="Офіційне джерело (достовірне)" style={{color: 'var(--yellow)', marginLeft: '8px', cursor: 'help', display: 'inline-flex', gap:'2px'}}><StarIcon /><StarIcon /></span>}
      {q.status === 'verified' && <span title="Перевірене питання" style={{color: 'var(--yellow)', marginLeft: '8px', cursor: 'help', display: 'inline-flex'}}><StarIcon /></span>}
      {q.favorite && <span title="В обраному (позначено вогником)" style={{color: '#f97316', marginLeft: '8px', cursor: 'help', display: 'inline-flex'}}><FireIcon filled /></span>}
      {q.seen && <span title="Опрацьоване (ви вже давали відповідь на нього раніше)" style={{color: '#3b82f6', marginLeft: '8px', cursor: 'help', display: 'inline-flex'}}><EyeIcon /></span>}
    </>
  );

  return (
    <>
      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '300px' }}>
          
          <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center' }} title={section.title}>
              {formatBreadcrumb(section.title)}
              <button 
                onClick={() => copyToClipboard(section, `✅ РОЗДІЛ скопійовано!`)} 
                title="Скопіювати весь цей РОЗДІЛ у форматі JSON" 
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginLeft: '6px', display: 'flex' }}
              >
                <CopyIcon />
              </button>
            </span> 
            <span className="breadcrumb-sep">/</span>
            <span style={{ display: 'flex', alignItems: 'center' }} title={subsection.title}>
              {formatBreadcrumb(subsection.title)}
              <button 
                onClick={() => copyToClipboard(subsection, `✅ ПІДРОЗДІЛ скопійовано!`)} 
                title="Скопіювати цей ПІДРОЗДІЛ у форматі JSON" 
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginLeft: '6px', display: 'flex' }}
              >
                <CopyIcon />
              </button>
            </span>
          </div>

        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} title="Створити нове питання або імпортувати масив">
            <PlusIcon /> Додати питання
          </button>
        </div>
      </div>

      <div className="content-area" style={{ position: 'relative' }}>
        <div className="questions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 className="questions-title">{topic.title}</h2>
            <div className="questions-subtitle">Всього питань у темі: {topic.questions.length}</div>
          </div>
          
          <button 
            className="btn" 
            onClick={() => copyToClipboard(topic.questions, "✅ Всі питання цієї ТЕМИ скопійовано!")} 
            title="Скопіювати масив питань ТІЛЬКИ ЦІЄЇ ТЕМИ в буфер обміну"
            style={{ background: 'var(--surface2)', color: 'var(--text)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CopyIcon /> Скопіювати цю тему (JSON)
          </button>
        </div>

        {topic.questions.map((q, idx) => {
          if (editingQ && editingQ.idx === idx) {
            return (
              <div key={idx} className="question-card" style={{ borderColor: 'var(--accent)' }}>
                <div className="form-group">
                  <label className="form-label">Текст питання</label>
                  <textarea className="form-input form-textarea" value={editingQ.form.q} onChange={e => setEditingQ({...editingQ, form: {...editingQ.form, q: e.target.value}})} />
                </div>
                
                <div className="form-group" style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                  <div style={{flex: 1, minWidth: '200px'}}>
                    <label className="form-label">Статус запитання</label>
                    <select className="form-input form-select" value={editingQ.form.status || 'none'} onChange={e => setEditingQ({...editingQ, form: {...editingQ.form, status: e.target.value}})}>
                      <option value="none">Звичайне (Без зірочки)</option>
                      <option value="verified">Перевірене (1 зірочка *)</option>
                      <option value="official">Офіційне (2 зірочки **)</option>
                    </select>
                  </div>
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px', paddingBottom: '5px', minWidth: '200px'}}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '13px' }}>
                      <input type="checkbox" className="gen-checkbox" checked={!!editingQ.form.seen} onChange={e => setEditingQ({...editingQ, form: {...editingQ.form, seen: e.target.checked}})} />
                      Позначити як "Бачене" (👁️)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '13px' }}>
                      <input type="checkbox" className="gen-checkbox" checked={!!editingQ.form.favorite} onChange={e => setEditingQ({...editingQ, form: {...editingQ.form, favorite: e.target.checked}})} />
                      Додати в "Обране" (🔥)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Варіанти відповідей</label>
                  {editingQ.form.a.map((opt, i) => (
                    <div key={i} className="answer-row">
                      <input type="radio" className="correct-radio" checked={editingQ.form.correct === i} onChange={() => setEditingQ({...editingQ, form: {...editingQ.form, correct: i}})} />
                      <span className="answer-label">{['А','Б','В','Г'][i]}</span>
                      <input className="form-input" value={opt} onChange={e => {
                        const newA = [...editingQ.form.a]; 
                        newA[i] = e.target.value;
                        setEditingQ({...editingQ, form: {...editingQ.form, a: newA}});
                      }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={handleEditSave}>Зберегти зміни</button>
                  <button className="btn" onClick={() => setEditingQ(null)}>Скасувати</button>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="question-card">
              <div className="question-card-header">
                <div className="question-num">Q{idx + 1}</div>
                <div className="question-text">
                  {q.q}
                  {renderStars(q)}
                </div>
                <div className="question-actions">
                  <button 
                    className="btn-icon" 
                    onClick={() => toggleFavorite(idx)} 
                    title={q.favorite ? "Видалити з обраного" : "Додати в обране (Вогник)"}
                    style={{ color: q.favorite ? '#f97316' : 'var(--text3)' }}
                  >
                    <FireIcon filled={q.favorite} />
                  </button>
                  <button className="btn-icon" onClick={() => handleEditClick(idx, q)} title="Редагувати текст питання та варіанти відповідей">
                    <EditIcon />
                  </button>
                  <button className="btn-icon danger" onClick={() => handleDeleteClick(idx)} title="Назавжди видалити це питання з бази даних">
                    <TrashIcon />
                  </button>
                </div>
              </div>
              <div className="answers-list">
                {q.a.map((ans, aIdx) => (
                  <div key={aIdx} className={`answer-item ${aIdx === q.correct ? 'correct' : ''}`}>
                    <span className="answer-letter">{['А', 'Б', 'В', 'Г'][aIdx]}</span>
                    <span>{ans}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {toastMessage && (
          <div className="toast success" style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)', fontWeight: 600 }}>
            {toastMessage}
          </div>
        )}
      </div>

      {isModalOpen && <AddModal data={data} setData={setData} selectedPath={selectedPath} close={() => setIsModalOpen(false)} />}
      
      <ConfirmModal 
        isOpen={deleteTarget !== null}
        title="Видалення питання"
        message="Ви впевнені, що хочете назавжди видалити це питання з бази даних? Цю дію неможливо скасувати."
        confirmText="Видалити"
        isDanger={true}
        onConfirm={performDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
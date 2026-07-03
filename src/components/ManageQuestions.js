import React, { useState } from 'react';
import { PlusIcon, TrashIcon, EmptyIcon, EditIcon, StarIcon, FireIcon, EyeIcon, CopyIcon } from './Icons';
import AddModal from './AddModal';
import ConfirmModal from './ConfirmModal';
import DbStatsDashboard from './DbStatsDashboard';
import { buildQuestionStatsText } from '../dbStats';

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

  const buildQuestionStatsTextLocal = () => buildQuestionStatsText(data);

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

  const formatBreadcrumb = (title) => {
    if (!title) return "";
    return title.length > 45 ? title.substring(0, 45) + "..." : title;
  };

  // --- ГЛОБАЛЬНИЙ ДАШБОРД (Коли тема не вибрана) ---
  if (!selectedPath) {
    return (
      <div className="content-area" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 className="questions-title" style={{ margin: 0 }}>Загальна статистика бази</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={() => copyTextToClipboard(buildQuestionStatsTextLocal(), "✅ Статистику питань скопійовано!")}
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
        
        <DbStatsDashboard data={data} gridMinWidth={180} />

        <div className="empty-state" style={{ marginTop: '40px', padding: '40px' }}>
          <EmptyIcon />
          <h3>Оберіть тему для редагування</h3>
          <p>Виберіть розділ, підрозділ та тему в лівому меню для перегляду питань, або натисніть «Додати питання» у хедері для мульти-імпорту.</p>
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
      </div>

      <div className="content-area" style={{ position: 'relative' }}>
        <div className="questions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 className="questions-title">{topic.title}</h2>
            <div className="questions-subtitle">Всього питань у темі: {topic.questions.length}</div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
              title="Додати одне питання або масив JSON у цю тему"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon /> Додати до цієї теми
            </button>
            <button
              className="btn"
              onClick={() => copyToClipboard(topic.questions, "✅ Всі питання цієї ТЕМИ скопійовано!")}
              title="Скопіювати масив питань ТІЛЬКИ ЦІЄЇ ТЕМИ в буфер обміну"
              style={{ background: 'var(--surface2)', color: 'var(--text)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CopyIcon /> Скопіювати цю тему (JSON)
            </button>
          </div>
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

      {isModalOpen && (
        <AddModal
          data={data}
          setData={setData}
          selectedPath={selectedPath}
          close={() => setIsModalOpen(false)}
          topicOnly
        />
      )}

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
import React, { useState } from 'react';

export default function AddModal({ data, setData, selectedPath, close, topicOnly = false }) {
  const hasTopic = selectedPath != null;
  const [mode, setMode] = useState(topicOnly || hasTopic ? 'single' : 'multi'); // 'single', 'mass', 'multi'
  const [newQ, setNewQ] = useState({ q: '', a: ['', '', '', ''], correct: 0, status: 'none' });
  const [massJSON, setMassJSON] = useState('');

  const handleSingleAdd = (e) => {
    e.preventDefault();
    if (!selectedPath) return;
    const { sec, sub, top } = selectedPath;
    const newData = JSON.parse(JSON.stringify(data));
    newData[sec].subsections[sub].topics[top].questions.push({
      q: newQ.q,
      a: newQ.a,
      correct: Number(newQ.correct),
      status: newQ.status === 'none' ? undefined : newQ.status
    });
    setData(newData);
    close();
  };

  const handleMassAdd = () => {
    if (!selectedPath) return;
    const { sec, sub, top } = selectedPath;
    try {
      const parsed = JSON.parse(massJSON);
      if (!Array.isArray(parsed)) throw new Error("JSON має бути масивом.");
      const newData = JSON.parse(JSON.stringify(data));
      newData[sec].subsections[sub].topics[top].questions.push(...parsed);
      setData(newData);
      close();
    } catch (err) {
      alert("Помилка JSON: " + err.message);
    }
  };

  const handleMultiAdd = () => {
    try {
      const parsed = JSON.parse(massJSON);
      if (!Array.isArray(parsed)) throw new Error("JSON має бути масивом об'єктів.");
      
      const newData = JSON.parse(JSON.stringify(data));
      let addedCount = 0;

      parsed.forEach((item, index) => {
        const { sec: s, sub: sb, top: t, q, a, correct, status } = item;
        
        if (newData[s] && newData[s].subsections[sb] && newData[s].subsections[sb].topics[t]) {
          newData[s].subsections[sb].topics[t].questions.push({
            q, a, correct: Number(correct), status: status || undefined
          });
          addedCount++;
        } else {
          console.warn(`Пропущено індекс ${index}: невірний шлях [${s}, ${sb}, ${t}]`);
        }
      });

      setData(newData);
      alert(`Успіх! Розподілено ${addedCount} питань по базі.`);
      close();
    } catch (err) {
      alert("Помилка парсингу мульти-імпорту: " + err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Додати нові питання</div>
          <button className="modal-close" onClick={close}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="gen-mode-row">
            <button
              className={`gen-mode-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
              disabled={!hasTopic}
              title={hasTopic ? undefined : 'Оберіть тему в лівому меню для одиничного додавання'}
            >
              Одиничне
            </button>
            <button
              className={`gen-mode-btn ${mode === 'mass' ? 'active' : ''}`}
              onClick={() => setMode('mass')}
              disabled={!hasTopic}
              title={hasTopic ? undefined : 'Оберіть тему в лівому меню для масового імпорту в тему'}
            >
              Масове (в поточну тему)
            </button>
            {!topicOnly && (
              <button className={`gen-mode-btn ${mode === 'multi' ? 'active' : ''}`} onClick={() => setMode('multi')}>Мульти-імпорт (розподіл)</button>
            )}
          </div>
          {!topicOnly && !hasTopic && (
            <p className="ai-guide-step-desc" style={{ marginBottom: '12px' }}>
              Тема не обрана — доступний лише мульти-імпорт. Для одиничного або масового додавання оберіть тему в лівому меню.
            </p>
          )}

          {mode === 'single' && (
            <form id="add-form" onSubmit={handleSingleAdd}>
              <div className="form-group">
                <label className="form-label">Текст питання</label>
                <textarea className="form-input form-textarea" required value={newQ.q} onChange={e => setNewQ({...newQ, q: e.target.value})} placeholder="Введіть текст..." />
              </div>
              
              <div className="form-group">
                <label className="form-label">Статус питання</label>
                <select className="form-input form-select" value={newQ.status} onChange={e => setNewQ({...newQ, status: e.target.value})}>
                  <option value="none">Звичайне (Без зірочки)</option>
                  <option value="verified">Перевірене (1 зірочка *)</option>
                  <option value="official">Офіційне (2 зірочки **)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Варіанти відповідей (Позначте правильний)</label>
                {newQ.a.map((opt, i) => (
                  <div key={i} className="answer-row">
                    <input type="radio" name="correct" className="correct-radio" checked={newQ.correct === i} onChange={() => setNewQ({...newQ, correct: i})} />
                    <span className="answer-label">{['А','Б','В','Г'][i]}</span>
                    <input className="form-input" required value={opt} onChange={e => {
                      const newA = [...newQ.a]; newA[i] = e.target.value; setNewQ({...newQ, a: newA});
                    }} placeholder={`Варіант ${i+1}`} />
                  </div>
                ))}
              </div>
            </form>
          )}

          {mode === 'mass' && (
            <div>
              <label className="form-label">Вставте масив JSON (додасться у вибрану тему)</label>
              <textarea className="mass-add-area" value={massJSON} onChange={e => setMassJSON(e.target.value)} 
                placeholder='[{"q": "Текст?", "a": ["1", "2", "3", "4"], "correct": 1}]'
              />
            </div>
          )}

          {mode === 'multi' && (
            <div>
              <label className="form-label">Вставте JSON із вказаними індексами `sec, sub, top`</label>
              <textarea className="mass-add-area" value={massJSON} onChange={e => setMassJSON(e.target.value)} 
                placeholder='[{"sec":0, "sub":0, "top":1, "q": "Текст", "a": ["A","B","C","D"], "correct": 0, "status": "official"}]'
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={close}>Скасувати</button>
          {mode === 'single' && <button className="btn btn-primary" type="submit" form="add-form">Зберегти питання</button>}
          {mode === 'mass' && <button className="btn btn-primary" onClick={handleMassAdd}>Додати масив</button>}
          {mode === 'multi' && <button className="btn btn-primary" onClick={handleMultiAdd}>Розподілити питання</button>}
        </div>
      </div>
    </div>
  );
}
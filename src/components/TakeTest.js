import React, { useState } from 'react';
import { StarIcon, InfoIcon, EditIcon, TrashIcon, FireIcon, EyeIcon } from './Icons';
import ConfirmModal from './ConfirmModal';

export default function TakeTest({ data, setData }) {
  const [testActive, setTestActive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [revealedQs, setRevealedQs] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showOnlyMistakes, setShowOnlyMistakes] = useState(false);
  
  const [mode, setMode] = useState('advanced'); 
  const [selectedSection, setSelectedSection] = useState('all'); 
  const [counters, setCounters] = useState({ section: 5, subsection: 3, topic: 2 });
  
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterOfficial, setFilterOfficial] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterUnseen, setFilterUnseen] = useState(false);

  const [showPath, setShowPath] = useState({});
  const [editingQ, setEditingQ] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getAllQuestions = (node) => {
    let qs = [];
    if (node.questions) qs.push(...node.questions);
    if (node.subsections) node.subsections.forEach(sub => qs.push(...getAllQuestions(sub)));
    if (node.topics) node.topics.forEach(top => qs.push(...getAllQuestions(top)));
    return qs;
  };

  const totalSections = data.length;
  let allQsInDb = [];
  data.forEach(sec => allQsInDb.push(...getAllQuestions(sec)));
  
  const totalQuestions = allQsInDb.length;
  const totalVerified = allQsInDb.filter(q => q.status === 'verified').length;
  const totalOfficial = allQsInDb.filter(q => q.status === 'official').length;
  const totalFavorites = allQsInDb.filter(q => q.favorite).length;
  const totalSeen = allQsInDb.filter(q => q.seen).length;

  const getEnrichedData = () => {
    return data.map((sec, sIdx) => ({
      ...sec,
      subsections: sec.subsections?.map((sub, sbIdx) => ({
        ...sub,
        topics: sub.topics?.map((top, tIdx) => ({
          ...top,
          questions: top.questions?.map((q, qIdx) => ({
            ...q,
            meta: { sec: sIdx, sub: sbIdx, top: tIdx, qIdx } 
          }))
        }))
      }))
    }));
  };

  const getFilteredQs = (qs) => {
    return qs.filter(q => {
      if (filterFavorite && !q.favorite) return false;
      if (filterUnseen && q.seen) return false; 
      if (!filterVerified && !filterOfficial) return true;
      if (filterVerified && q.status === 'verified') return true;
      if (filterOfficial && q.status === 'official') return true;
      return false;
    });
  };

  const getRandomQs = (arr, count) => {
    if (!arr || arr.length === 0) return [];
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const startTest = () => {
    let selectedQs = [];
    const enrichedData = getEnrichedData();

    if (mode === 'shuffle') {
      enrichedData.forEach(sec => {
        let pool = getFilteredQs(getAllQuestions(sec));
        const takeCount = Math.floor(Math.random() * 2) + 1;
        selectedQs.push(...getRandomQs(pool, takeCount));
      });
    } else if (mode === 'section') {
      if (selectedSection === 'all') {
        enrichedData.forEach(sec => selectedQs.push(...getFilteredQs(getAllQuestions(sec))));
      } else {
        selectedQs.push(...getFilteredQs(getAllQuestions(enrichedData[selectedSection])));
      }
    } else if (mode === 'advanced') {
      enrichedData.forEach(sec => {
        if (!sec.subsections || sec.subsections.length === 0) {
          selectedQs.push(...getRandomQs(getFilteredQs(getAllQuestions(sec)), counters.section));
        } else {
          sec.subsections.forEach(sub => {
            if (!sub.topics || sub.topics.length === 0) {
              selectedQs.push(...getRandomQs(getFilteredQs(getAllQuestions(sub)), counters.subsection));
            } else {
              sub.topics.forEach(top => {
                selectedQs.push(...getRandomQs(getFilteredQs(getAllQuestions(top)), counters.topic));
              });
            }
          });
        }
      });
    }

    if (selectedQs.length === 0) {
      alert("За цими налаштуваннями не знайдено питань! Спробуйте змінити фільтри.");
      return;
    }

    selectedQs.sort(() => 0.5 - Math.random());
    setQuestions(selectedQs);
    setAnswers({});
    setRevealedQs({}); 
    setShowPath({});
    setEditingQ(null);
    setSubmitted(false);
    setShowOnlyMistakes(false);
    setTestActive(true);
  };

  const handleSelect = (qIndex, aIndex) => {
    if (!submitted && !revealedQs[qIndex]) {
      setAnswers({ ...answers, [qIndex]: aIndex });
    }
  };

  const markAsSeen = (indexesToMark) => {
    let hasChanges = false;
    const newData = JSON.parse(JSON.stringify(data));
    const newQs = [...questions];

    indexesToMark.forEach(qIndex => {
      if (answers[qIndex] !== undefined && !newQs[qIndex].seen) {
        const { sec, sub, top, qIdx } = newQs[qIndex].meta;
        newData[sec].subsections[sub].topics[top].questions[qIdx].seen = true;
        newQs[qIndex].seen = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setData(newData);
      setQuestions(newQs);
    }
  };

  const revealAnswer = (qIndex) => {
    setRevealedQs(prev => ({ ...prev, [qIndex]: true }));
    markAsSeen([qIndex]); 
  };

  const finishTest = () => {
    setSubmitted(true);
    const allIndexes = questions.map((_, i) => i);
    markAsSeen(allIndexes);
  };

  const calcScore = () => questions.filter((q, i) => answers[i] === q.correct).length;
  const togglePath = (qIndex) => setShowPath(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));

  const toggleFavorite = (qIndexInTest) => {
    const q = questions[qIndexInTest];
    const { sec, sub, top, qIdx } = q.meta;
    const newData = JSON.parse(JSON.stringify(data));
    newData[sec].subsections[sub].topics[top].questions[qIdx].favorite = !newData[sec].subsections[sub].topics[top].questions[qIdx].favorite;
    setData(newData);
    const newQs = [...questions];
    newQs[qIndexInTest].favorite = !newQs[qIndexInTest].favorite;
    setQuestions(newQs);
  };

  const handleDeleteClick = (qIndex) => setDeleteTarget(qIndex);

  const performDelete = () => {
    const qIndexInTest = deleteTarget;
    const q = questions[qIndexInTest];
    const { sec, sub, top, qIdx } = q.meta;
    const newData = JSON.parse(JSON.stringify(data));
    newData[sec].subsections[sub].topics[top].questions.splice(qIdx, 1);
    setData(newData);
    
    const newQs = [...questions];
    newQs.splice(qIndexInTest, 1);
    setQuestions(newQs);
    
    const newAnswers = {};
    const newRevealed = {};
    Object.keys(answers).forEach(k => {
      const numK = Number(k);
      if (numK < qIndexInTest) newAnswers[numK] = answers[numK];
      else if (numK > qIndexInTest) newAnswers[numK - 1] = answers[numK];
    });
    Object.keys(revealedQs).forEach(k => {
      const numK = Number(k);
      if (numK < qIndexInTest) newRevealed[numK] = revealedQs[numK];
      else if (numK > qIndexInTest) newRevealed[numK - 1] = revealedQs[numK];
    });
    setAnswers(newAnswers);
    setRevealedQs(newRevealed);
    setDeleteTarget(null);
  };

  const handleEditSave = () => {
    const { sec, sub, top, qIdx } = editingQ.form.meta;
    const newData = JSON.parse(JSON.stringify(data));
    const target = newData[sec].subsections[sub].topics[top].questions[qIdx];
    target.q = editingQ.form.q;
    target.a = editingQ.form.a;
    target.correct = Number(editingQ.form.correct);
    if (editingQ.form.status === 'none') delete target.status;
    else target.status = editingQ.form.status;
    target.seen = editingQ.form.seen; 
    target.favorite = editingQ.form.favorite;
    setData(newData);
    const newQs = [...questions];
    newQs[editingQ.idx] = { ...editingQ.form };
    setQuestions(newQs);
    setEditingQ(null);
  };

  const renderStars = (q) => (
    <>
      {q.status === 'official' && <span title="Офіційне джерело (достовірне)" style={{color: 'var(--yellow)', marginLeft: '8px', cursor: 'help', display: 'inline-flex', gap:'2px'}}><StarIcon /><StarIcon /></span>}
      {q.status === 'verified' && <span title="Перевірене питання" style={{color: 'var(--yellow)', marginLeft: '8px', cursor: 'help', display: 'inline-flex'}}><StarIcon /></span>}
      {q.favorite && <span title="В обраному (позначено вогником)" style={{color: '#f97316', marginLeft: '8px', cursor: 'help', display: 'inline-flex'}}><FireIcon filled /></span>}
      {q.seen && <span title="Опрацьоване (ви вже давали відповідь на нього раніше)" style={{color: '#3b82f6', marginLeft: '8px', cursor: 'help', display: 'inline-flex'}}><EyeIcon /></span>}
    </>
  );

  const renderTestControls = (isBottom = false) => (
    <>
      <div className="toolbar" style={{ borderRadius: '8px', marginBottom: '20px', marginTop: isBottom ? '20px' : '0' }}>
        <div className="toolbar-left">
          <span className={`badge ${submitted ? 'badge-green' : 'badge-blue'}`}>
            {submitted ? 'Завершено' : 'В процесі'}
          </span>
          <span style={{ fontWeight: 600, fontSize: '14px', marginLeft: '10px' }}>Питань: {questions.length}</span>
        </div>
        <div className="toolbar-right">
          {!submitted && <button className="btn btn-success" onClick={finishTest} title="Завершити тест і показати результати">Завершити тест</button>}
          <button className="btn" onClick={() => setTestActive(false)} title="Перервати тест і повернутися в меню">Вийти з тесту</button>
        </div>
      </div>

      {submitted && (
        <div className="test-result" style={{ marginBottom: isBottom ? '40px' : '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div className="test-result-header" style={{ borderBottom: 'none', flex: 1, padding: '16px 20px' }}>
            <div className="test-result-title">Ваш результат</div>
            <span className="badge badge-green" style={{fontSize: '14px', padding: '4px 10px'}}>{calcScore()} / {questions.length}</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }} title="Показати тільки ті питання, на які ви відповіли неправильно">
              <input type="checkbox" className="gen-checkbox" checked={showOnlyMistakes} onChange={(e) => setShowOnlyMistakes(e.target.checked)} />
              Робота над помилками (Приховати правильні)
            </label>
          </div>
        </div>
      )}
    </>
  );

  if (!testActive) {
    return (
      <div className="content-area">
        <h2 className="questions-title" style={{marginBottom: '20px'}}>Центр тестування</h2>
        
        <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          <div className="overview-card" title="Кількість головних розділів у базі">
            <div className="overview-card-title">Розділи</div>
            <div className="overview-card-num">{totalSections}</div>
          </div>
          <div className="overview-card" title="Загальна кількість питань, доступних для тестування">
            <div className="overview-card-title">Всього питань</div>
            <div className="overview-card-num">{totalQuestions}</div>
          </div>
          <div className="overview-card" style={{ borderColor: 'rgba(59, 130, 246, 0.5)' }} title="Питання, на які ви вже хоча б раз давали відповідь">
            <div className="overview-card-title">Опрацьовані (👁️)</div>
            <div className="overview-card-num" style={{ color: '#3b82f6' }}>{totalSeen}</div>
          </div>
          <div className="overview-card" style={{ borderColor: '#f97316' }} title="Питання, які ви відмітили вогником як важливі">
            <div className="overview-card-title">Обрані (🔥)</div>
            <div className="overview-card-num" style={{ color: '#f97316' }}>{totalFavorites}</div>
          </div>
          <div className="overview-card" title="Питання з офіційного джерела (ЄФВВ)">
            <div className="overview-card-title">Офіційні (**)</div>
            <div className="overview-card-num" style={{ color: 'var(--yellow)' }}>{totalOfficial}</div>
          </div>
        </div>

        <div className="generate-section">
          <div className="generate-section-header">
            <div className="generate-section-title">Налаштування генерації</div>
          </div>
          
          <div className="gen-mode-row">
            <button className={`gen-mode-btn ${mode === 'advanced' ? 'active' : ''}`} onClick={() => setMode('advanced')} title="Детальний вибір кількості питань з кожного розділу/теми">Детальне налаштування</button>
            <button className={`gen-mode-btn ${mode === 'shuffle' ? 'active' : ''}`} onClick={() => setMode('shuffle')} title="Швидка генерація по 1-2 питання з усіх розділів">Швидкий мікс</button>
            <button className={`gen-mode-btn ${mode === 'section' ? 'active' : ''}`} onClick={() => setMode('section')} title="Пройти тест лише за одним конкретним розділом бази">Конкретний розділ</button>
          </div>

          {mode === 'advanced' && (
            <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <h4 style={{marginBottom: '16px', fontSize: '13px', color: 'var(--text2)', fontWeight: '600', textTransform: 'uppercase'}}>Кількість випадкових питань:</h4>
              <div className="form-group">
                <label className="form-label">З кожного РОЗДІЛУ (якщо немає підрозділів)</label>
                <input type="number" min="0" className="form-input" value={counters.section} onChange={(e) => setCounters({...counters, section: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">З кожного ПІДРОЗДІЛУ (якщо немає тем)</label>
                <input type="number" min="0" className="form-input" value={counters.subsection} onChange={(e) => setCounters({...counters, subsection: Number(e.target.value)})} />
              </div>
              <div className="form-group" style={{marginBottom: 0}}>
                <label className="form-label">З кожної ТЕМИ</label>
                <input type="number" min="0" className="form-input" value={counters.topic} onChange={(e) => setCounters({...counters, topic: Number(e.target.value)})} />
              </div>
            </div>
          )}

          {mode === 'section' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Оберіть розділ:</label>
              <select className="form-input form-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                <option value="all" style={{fontWeight: 'bold'}}>Всі розділи (Повний тест)</option>
                {data.map((sec, i) => <option key={i} value={i}>{sec.title}</option>)}
              </select>
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '16px', background: 'rgba(79, 128, 255, 0.08)', borderRadius: '8px', border: '1px solid var(--accent)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text2)', textTransform: 'uppercase' }}>Фільтри питань:</div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '14px' }} title="У тест потраплять тільки ті питання, які ви ще жодного разу не проходили">
              <input type="checkbox" className="gen-checkbox" checked={filterUnseen} onChange={(e) => setFilterUnseen(e.target.checked)} />
              Тільки НОВІ (ще не бачені)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '14px' }} title="У тест потраплять тільки питання з вогником">
              <input type="checkbox" className="gen-checkbox" checked={filterFavorite} onChange={(e) => setFilterFavorite(e.target.checked)} />
              Тільки обрані (🔥)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '14px' }} title="Включати в тест питання з 1 зірочкою">
              <input type="checkbox" className="gen-checkbox" checked={filterVerified} onChange={(e) => setFilterVerified(e.target.checked)} />
              Тільки перевірені (1 зірочка *)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '14px' }} title="Включати в тест питання з 2 зірочками">
              <input type="checkbox" className="gen-checkbox" checked={filterOfficial} onChange={(e) => setFilterOfficial(e.target.checked)} />
              Тільки офіційні (2 зірочки **)
            </label>
          </div>

          <button className="btn btn-primary" onClick={startTest} style={{width: '100%', justifyContent: 'center', padding: '12px'}}>
            Згенерувати та Почати Тест
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {renderTestControls(false)}

      {questions.map((q, qIndex) => {
        if (submitted && showOnlyMistakes) {
          const isCorrect = answers[qIndex] === q.correct;
          if (isCorrect) return null; 
        }

        if (editingQ && editingQ.idx === qIndex) {
          return (
            <div key={qIndex} className="question-card test-mode-card" style={{ padding: '30px !important' }}>
               <h3 style={{marginBottom: '20px', color: 'var(--accent)'}}>Редагування питання</h3>
               <div className="form-group">
                  <label className="form-label">Текст питання</label>
                  <textarea className="form-input form-textarea" value={editingQ.form.q} onChange={e => setEditingQ({...editingQ, form: {...editingQ.form, q: e.target.value}})} />
                </div>
                <div className="form-group" style={{display: 'flex', gap: '20px'}}>
                  <div style={{flex: 1}}>
                    <label className="form-label">Статус запитання</label>
                    <select className="form-input form-select" value={editingQ.form.status || 'none'} onChange={e => setEditingQ({...editingQ, form: {...editingQ.form, status: e.target.value}})}>
                      <option value="none">Звичайне (Без зірочки)</option>
                      <option value="verified">Перевірене (1 зірочка *)</option>
                      <option value="official">Офіційне (2 зірочки **)</option>
                    </select>
                  </div>
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px', paddingBottom: '5px'}}>
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
                {editingQ.form.a.map((opt, i) => (
                  <div key={i} className="answer-row">
                    <input type="radio" className="correct-radio" checked={editingQ.form.correct === i} onChange={() => setEditingQ({...editingQ, form: {...editingQ.form, correct: i}})} />
                    <span className="answer-label">{['А','Б','В','Г'][i]}</span>
                    <input className="form-input" value={opt} onChange={e => {
                      const newA = [...editingQ.form.a]; newA[i] = e.target.value;
                      setEditingQ({...editingQ, form: {...editingQ.form, a: newA}});
                    }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                  <button className="btn btn-success" onClick={handleEditSave} title="Зберегти всі зміни">Зберегти зміни</button>
                  <button className="btn" onClick={() => setEditingQ(null)}>Скасувати</button>
                </div>
            </div>
          );
        }

        const isQuestionRevealed = submitted || revealedQs[qIndex];

        return (
          <div key={qIndex} className="question-card test-mode-card">
            <div className="question-card-header test-mode-header" style={{ display: 'flex', width: '100%' }}>
              <div className="question-num" style={{ margin: 0 }}>Q{qIndex + 1}</div>
              
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <button 
                  className="btn-icon" 
                  onClick={() => toggleFavorite(qIndex)} 
                  title={q.favorite ? "Видалити це питання з обраного" : "Додати це питання в обране (Вогник)"}
                  style={{ color: q.favorite ? '#f97316' : 'var(--text3)' }}
                >
                  <FireIcon filled={q.favorite} />
                </button>
                <button className={`btn-icon ${showPath[qIndex] ? 'active' : ''}`} onClick={() => togglePath(qIndex)} title="Показати джерело (з якого розділу та теми це питання)">
                  <InfoIcon />
                </button>
                <button className="btn-icon" onClick={() => setEditingQ({ idx: qIndex, form: JSON.parse(JSON.stringify(q)) })} title="Редагувати текст питання та варіанти відповідей">
                  <EditIcon />
                </button>
                <button className="btn-icon danger" onClick={() => handleDeleteClick(qIndex)} title="Назавжди видалити це питання з бази даних">
                  <TrashIcon />
                </button>
              </div>
            </div>

            {showPath[qIndex] && q.meta && (
              <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Джерело питання:</div>
                <div style={{ color: 'var(--text)'}}>
                  <strong style={{color:'var(--accent)'}}>{data[q.meta.sec]?.title.split('.')[0]}</strong> → {data[q.meta.sec]?.subsections[q.meta.sub]?.title.split('.')[0]} → {data[q.meta.sec]?.subsections[q.meta.sub]?.topics[q.meta.top]?.title}
                </div>
              </div>
            )}

            <div className="question-text test-mode-text" style={{ marginBottom: '25px' }}>
              {q.q}
              {renderStars(q)}
            </div>
            
            <div className="answers-list test-mode-answers">
              {q.a.map((opt, aIndex) => {
                let className = "answer-item";
                if (answers[qIndex] === aIndex) className += " selected";
                
                if (isQuestionRevealed) {
                  if (aIndex === q.correct) className += " correct";
                  else if (answers[qIndex] === aIndex) className += " wrong";
                }

                return (
                  <div key={aIndex} className={className} onClick={() => handleSelect(qIndex, aIndex)} style={{ cursor: isQuestionRevealed ? 'default' : 'pointer' }}>
                    <span className="answer-letter">{['А', 'Б', 'В', 'Г'][aIndex]}</span>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>

            {answers[qIndex] !== undefined && !isQuestionRevealed && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="btn" onClick={() => revealAnswer(qIndex)} title="Показати правильну відповідь (змінити вибір буде неможливо)">
                  Перевірити відповідь
                </button>
              </div>
            )}
          </div>
        );
      })}

      {renderTestControls(true)}

      <ConfirmModal 
        isOpen={deleteTarget !== null} 
        title="Видалення питання" 
        message="Ви впевнені, що хочете назавжди видалити це питання з бази даних? Воно зникне як з поточного тесту, так і з усього додатку." 
        confirmText="Видалити" 
        isDanger={true} 
        onConfirm={performDelete} 
        onCancel={() => setDeleteTarget(null)} 
      />
    </div>
  );
}
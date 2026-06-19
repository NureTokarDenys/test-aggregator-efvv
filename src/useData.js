import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'quiz_data';

function generateId(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load: check localStorage first, then fetch questions.json
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    fetch(process.env.PUBLIC_URL + '/questions.json')
      .then(r => r.json())
      .then(d => {
        setData(d);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
        setLoading(false);
      })
      .catch(e => {
        setError('Не вдалося завантажити questions.json: ' + e.message);
        setLoading(false);
      });
  }, []);

  const persist = useCallback((newData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  // ── Stats ──
  const stats = data ? (() => {
    let qTotal = 0, topicTotal = 0, subTotal = 0;
    data.sections.forEach(s => {
      s.subsections.forEach(sub => {
        subTotal++;
        sub.topics.forEach(t => {
          topicTotal++;
          qTotal += t.questions.length;
        });
      });
    });
    return { sections: data.sections.length, subsections: subTotal, topics: topicTotal, questions: qTotal };
  })() : null;

  // ── Add single question ──
  const addQuestion = useCallback((sectionId, subsectionId, topicId, question) => {
    if (!data) return;
    const newQ = { id: generateId('q'), ...question };
    const newData = {
      ...data,
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        subsections: s.subsections.map(sub => sub.id !== subsectionId ? sub : {
          ...sub,
          topics: sub.topics.map(t => t.id !== topicId ? t : {
            ...t,
            questions: [...t.questions, newQ]
          })
        })
      })
    };
    persist(newData);
    return newQ;
  }, [data, persist]);

  // ── Add mass questions (parsed array) ──
  const addQuestions = useCallback((sectionId, subsectionId, topicId, questions) => {
    if (!data) return;
    const newQs = questions.map(q => ({ id: generateId('q'), ...q }));
    const newData = {
      ...data,
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        subsections: s.subsections.map(sub => sub.id !== subsectionId ? sub : {
          ...sub,
          topics: sub.topics.map(t => t.id !== topicId ? t : {
            ...t,
            questions: [...t.questions, ...newQs]
          })
        })
      })
    };
    persist(newData);
    return newQs.length;
  }, [data, persist]);

  // ── Delete single question ──
  const deleteQuestion = useCallback((sectionId, subsectionId, topicId, questionId) => {
    if (!data) return;
    const newData = {
      ...data,
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        subsections: s.subsections.map(sub => sub.id !== subsectionId ? sub : {
          ...sub,
          topics: sub.topics.map(t => t.id !== topicId ? t : {
            ...t,
            questions: t.questions.filter(q => q.id !== questionId)
          })
        })
      })
    };
    persist(newData);
  }, [data, persist]);

  // ── Delete all questions in a topic ──
  const deleteTopicQuestions = useCallback((sectionId, subsectionId, topicId) => {
    if (!data) return;
    const newData = {
      ...data,
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        subsections: s.subsections.map(sub => sub.id !== subsectionId ? sub : {
          ...sub,
          topics: sub.topics.map(t => t.id !== topicId ? t : { ...t, questions: [] })
        })
      })
    };
    persist(newData);
  }, [data, persist]);

  // ── Add topic ──
  const addTopic = useCallback((sectionId, subsectionId, title) => {
    if (!data) return;
    const newTopic = { id: generateId('t'), title, questions: [] };
    const newData = {
      ...data,
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        subsections: s.subsections.map(sub => sub.id !== subsectionId ? sub : {
          ...sub,
          topics: [...sub.topics, newTopic]
        })
      })
    };
    persist(newData);
    return newTopic;
  }, [data, persist]);

  // ── Add subsection ──
  const addSubsection = useCallback((sectionId, title) => {
    if (!data) return;
    const newSub = { id: generateId('sub'), title, topics: [] };
    const newData = {
      ...data,
      sections: data.sections.map(s => s.id !== sectionId ? s : {
        ...s,
        subsections: [...s.subsections, newSub]
      })
    };
    persist(newData);
    return newSub;
  }, [data, persist]);

  // ── Add section ──
  const addSection = useCallback((title) => {
    if (!data) return;
    const newSection = { id: generateId('s'), title, subsections: [] };
    const newData = { ...data, sections: [...data.sections, newSection] };
    persist(newData);
    return newSection;
  }, [data, persist]);

  // ── Export JSON ──
  const exportJSON = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // ── Import JSON (reset to file) ──
  const importJSON = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!imported.sections || !Array.isArray(imported.sections)) {
            reject(new Error('Невірний формат файлу'));
            return;
          }
          persist(imported);
          resolve(imported);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }, [persist]);

  // ── Reset to original ──
  const resetToOriginal = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLoading(true);
    fetch(process.env.PUBLIC_URL + '/questions.json')
      .then(r => r.json())
      .then(d => {
        setData(d);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
        setLoading(false);
      });
  }, []);

  return {
    data, loading, error, stats,
    addQuestion, addQuestions, deleteQuestion, deleteTopicQuestions,
    addTopic, addSubsection, addSection,
    exportJSON, importJSON, resetToOriginal
  };
}

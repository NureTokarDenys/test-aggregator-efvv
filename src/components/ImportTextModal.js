import React, { useState } from 'react';
import { validateDbImportJson, sanitizeDbId } from '../importValidation';

const PLACEHOLDER = `[
  {
    "title": "РОЗДІЛ 1. НАЗВА",
    "subsections": [
      {
        "title": "1.1. Підрозділ",
        "topics": [
          {
            "title": "1.1.1. Тема",
            "questions": [
              {
                "q": "Текст питання?",
                "a": ["Варіант А", "Варіант Б", "Варіант В", "Варіант Г"],
                "correct": 0
              }
            ]
          }
        ]
      }
    ]
  }
]`;

export default function ImportTextModal({ close, databases, onImport }) {
  const [dbName, setDbName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrors([]);

    const dbId = sanitizeDbId(dbName);
    if (!dbId) {
      setErrors([{
        message: 'Не вказано назву бази даних.',
        fix: 'Введіть назву латиницею або кирилицею (наприклад, exam2025 або іспит_2025).',
      }]);
      return;
    }

    if (databases.some(db => db.id === dbId)) {
      setErrors([{
        message: `База даних «${dbId}» вже існує.`,
        fix: 'Оберіть іншу назву або видаліть існуючу базу перед повторним імпортом.',
      }]);
      return;
    }

    const validation = validateDbImportJson(jsonText);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onImport(dbId, validation.data);
      close();
    } catch (err) {
      setErrors([{
        message: err.message || 'Невідома помилка під час створення бази.',
        fix: 'Переконайтесь, що сервер збереження (порт 3001) запущений, і спробуйте ще раз.',
      }]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Імпорт бази з тексту</div>
          <button type="button" className="modal-close" onClick={close} disabled={submitting}>×</button>
        </div>

        <div className="modal-body">
          <p className="ai-guide-step-desc" style={{ marginBottom: '16px' }}>
            Вставте повний JSON нової бази даних. Після успішного імпорту буде створено файл{' '}
            <code className="inline-code">src/data/databases/{'{назва}'}.json</code> і база стане активною.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="import-db-name">Назва нової бази даних</label>
            <input
              id="import-db-name"
              type="text"
              className="form-input"
              value={dbName}
              onChange={e => setDbName(e.target.value)}
              placeholder="Наприклад: exam2025"
              disabled={submitting}
            />
            {dbName.trim() && (
              <p className="form-hint">
                ID файлу: <code className="inline-code">{sanitizeDbId(dbName) || '…'}</code>
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="import-db-json">JSON бази даних</label>
            <textarea
              id="import-db-json"
              className="mass-add-area"
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setErrors([]); }}
              placeholder={PLACEHOLDER}
              disabled={submitting}
              spellCheck={false}
            />
          </div>

          <details className="import-format-hint">
            <summary>Формат JSON та типові помилки</summary>
            <ul className="import-format-list">
              <li>Корінь — масив розділів <code className="inline-code">[...]</code> або об&apos;єкт з <code className="inline-code">sections</code></li>
              <li>Ієрархія: розділ → <code className="inline-code">subsections</code> → <code className="inline-code">topics</code> → <code className="inline-code">questions</code></li>
              <li>Кожне питання: <code className="inline-code">q</code>, <code className="inline-code">a</code> (4 варіанти), <code className="inline-code">correct</code> (0–3)</li>
              <li>Не плутайте з масовим імпортом питань — там лише масив питань без розділів</li>
            </ul>
          </details>

          {errors.length > 0 && (
            <div className="import-error-panel" role="alert">
              <div className="import-error-panel-title">
                Знайдено {errors.length} {errors.length === 1 ? 'помилку' : errors.length < 5 ? 'помилки' : 'помилок'}
              </div>
              <ul className="import-error-list">
                {errors.map((err, i) => (
                  <li key={i} className="import-error-item">
                    <div className="import-error-message">{err.message}</div>
                    <div className="import-error-fix">
                      <strong>Як виправити:</strong> {err.fix}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={close} disabled={submitting}>Скасувати</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !dbName.trim() || !jsonText.trim()}
          >
            {submitting ? 'Створення…' : 'Створити базу'}
          </button>
        </div>
      </div>
    </div>
  );
}

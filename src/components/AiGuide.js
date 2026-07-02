import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CopyIcon } from './Icons';
import {
  AI_GUIDE_SECTIONS,
  AI_PROMPT_IDS,
  getDefaultPrompt,
  getPromptFileName,
  applyPromptTemplate,
  formatSectionIndexMap,
  formatExistingQuestionsCopy,
  countSectionQuestions,
  formatOriginDocsCopy,
} from '../content/aiPromptDefaults';
import {
  GUIDELINE_IDS,
  GUIDELINE_FILES,
  formatGuidelineCopy,
} from '../content/guidelineDefaults';

const API_BASE = 'http://localhost:3001/api';

function createInitialPromptState() {
  return AI_GUIDE_SECTIONS.reduce((acc, section) => {
    acc[section.id] = {
      draft: getDefaultPrompt(section.id),
      saved: getDefaultPrompt(section.id),
      loading: true,
      saving: false,
    };
    return acc;
  }, {});
}

function PromptEditor({
  promptId,
  draft,
  saved,
  loading,
  saving,
  onChange,
  onSave,
  onDiscard,
  onReset,
  onCopy,
  copied,
  copyLabel = 'Скопіювати промпт',
  templateHint,
}) {
  const hasUnsaved = draft !== saved;

  if (loading) {
    return <p className="ai-guide-step-desc">Завантаження промпту…</p>;
  }

  return (
    <>
      {templateHint && (
        <p className="ai-guide-step-desc ai-guide-template-hint">{templateHint}</p>
      )}
      <textarea
        className="form-input form-textarea ai-guide-prompt-editor"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        spellCheck={false}
      />
      <div className="ai-guide-prompt-actions">
        <button
          className="btn ai-guide-copy-btn"
          onClick={onCopy}
          title={copyLabel}
        >
          <CopyIcon />
          {copied ? 'Скопійовано!' : copyLabel}
        </button>
        <button
          className="btn btn-success ai-guide-save-btn"
          onClick={onSave}
          disabled={!hasUnsaved || saving}
          title="Зберегти промпт у файл"
        >
          {saving ? 'Збереження…' : 'Зберегти промпт'}
        </button>
        {hasUnsaved && (
          <button
            className="btn ai-guide-discard-btn"
            onClick={onDiscard}
            title="Скасувати незбережені зміни"
          >
            Скасувати зміни
          </button>
        )}
        <button
          className="btn ai-guide-reset-btn"
          onClick={onReset}
          title="Повернути текст за замовчуванням"
        >
          За замовчуванням
        </button>
      </div>
      {hasUnsaved && (
        <p className="ai-guide-prompt-unsaved">Є незбережені зміни промпту</p>
      )}
      <p className="ai-guide-prompt-file">
        Файл: <code className="ai-guide-file-ref">src/data/ai-prompts/{getPromptFileName(promptId)}</code>
      </p>
    </>
  );
}

function InfoStep({ stepNum, title, description, note }) {
  return (
    <li className="ai-guide-step">
      <div className="ai-guide-step-num">{stepNum}</div>
      <div className="ai-guide-step-body">
        <h3 className="ai-guide-step-title">{title}</h3>
        <p className="ai-guide-step-desc">{description}</p>
        {note && <p className="ai-guide-step-warning">{note}</p>}
      </div>
    </li>
  );
}

function CopyStep({ stepNum, title, description, buttonLabel, copyMessage, warning, onCopy, copied }) {
  return (
    <li className="ai-guide-step">
      <div className="ai-guide-step-num">{stepNum}</div>
      <div className="ai-guide-step-body">
        <h3 className="ai-guide-step-title">{title}</h3>
        <p className="ai-guide-step-desc">{description}</p>
        {warning && <p className="ai-guide-step-warning">{warning}</p>}
        <button
          className="btn ai-guide-copy-btn"
          onClick={onCopy}
          title={buttonLabel}
        >
          <CopyIcon />
          {copied ? 'Скопійовано!' : buttonLabel}
        </button>
      </div>
    </li>
  );
}

export default function AiGuide({ originDocs, dbName, sections = [] }) {
  const [activeGuideId, setActiveGuideId] = useState(AI_PROMPT_IDS.MULTIIMPORT_ALL);
  const [promptState, setPromptState] = useState(createInitialPromptState);
  const [selectedSec, setSelectedSec] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedStep, setCopiedStep] = useState(null);

  const activeGuide = useMemo(
    () => AI_GUIDE_SECTIONS.find((s) => s.id === activeGuideId) || AI_GUIDE_SECTIONS[0],
    [activeGuideId]
  );

  const currentPrompt = promptState[activeGuideId] || {
    draft: '',
    saved: '',
    loading: true,
    saving: false,
  };

  const safeSec = sections.length > 0
    ? Math.min(selectedSec, sections.length - 1)
    : 0;

  const selectedSection = sections[safeSec] || null;

  useEffect(() => {
    let cancelled = false;

    const loadAllPrompts = async () => {
      await Promise.all(AI_GUIDE_SECTIONS.map(async (section) => {
        try {
          const response = await fetch(`${API_BASE}/ai-prompts/${section.id}`);
          if (!response.ok) throw new Error('load failed');
          const result = await response.json();
          if (cancelled) return;
          if (result.success && typeof result.prompt === 'string' && result.prompt.trim()) {
            setPromptState((prev) => ({
              ...prev,
              [section.id]: {
                ...prev[section.id],
                draft: result.prompt,
                saved: result.prompt,
                loading: false,
              },
            }));
          } else {
            setPromptState((prev) => ({
              ...prev,
              [section.id]: { ...prev[section.id], loading: false },
            }));
          }
        } catch {
          if (!cancelled) {
            setPromptState((prev) => ({
              ...prev,
              [section.id]: { ...prev[section.id], loading: false },
            }));
          }
        }
      }));
    };

    loadAllPrompts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedSec >= sections.length && sections.length > 0) {
      setSelectedSec(sections.length - 1);
    }
  }, [sections.length, selectedSec]);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const copyText = useCallback((text, message, stepId) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(message);
      setCopiedStep(stepId);
      setTimeout(() => setCopiedStep(null), 3000);
    }).catch((err) => {
      alert('Не вдалося скопіювати: ' + err.message);
    });
  }, [showToast]);

  const copyGuideline = useCallback(async (guidelineId, message, stepId) => {
    try {
      const response = await fetch(`${API_BASE}/guidelines/${guidelineId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Не вдалося завантажити інструкцію');
      }
      copyText(formatGuidelineCopy(guidelineId, result.content), message, stepId);
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
  }, [copyText]);

  const updateDraft = (value) => {
    setPromptState((prev) => ({
      ...prev,
      [activeGuideId]: { ...prev[activeGuideId], draft: value },
    }));
  };

  const savePrompt = async () => {
    setPromptState((prev) => ({
      ...prev,
      [activeGuideId]: { ...prev[activeGuideId], saving: true },
    }));
    try {
      const response = await fetch(`${API_BASE}/ai-prompts/${activeGuideId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt.draft }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Не вдалося зберегти промпт');
      }
      setPromptState((prev) => ({
        ...prev,
        [activeGuideId]: {
          ...prev[activeGuideId],
          saved: currentPrompt.draft,
          saving: false,
        },
      }));
      showToast('✅ Промпт збережено!');
    } catch (err) {
      setPromptState((prev) => ({
        ...prev,
        [activeGuideId]: { ...prev[activeGuideId], saving: false },
      }));
      alert('Помилка збереження: ' + err.message);
    }
  };

  const resetPrompt = () => {
    setPromptState((prev) => ({
      ...prev,
      [activeGuideId]: {
        ...prev[activeGuideId],
        draft: getDefaultPrompt(activeGuideId),
      },
    }));
  };

  const discardPromptChanges = () => {
    setPromptState((prev) => ({
      ...prev,
      [activeGuideId]: {
        ...prev[activeGuideId],
        draft: prev[activeGuideId].saved,
      },
    }));
  };

  const getCopyPromptText = () => {
    if (activeGuideId === AI_PROMPT_IDS.SINGLE_SECTION && selectedSection) {
      return applyPromptTemplate(currentPrompt.draft, {
        SEC: safeSec,
        SECTION_TITLE: selectedSection.title || '',
      });
    }
    return currentPrompt.draft;
  };

  const handleGuideSwitch = (guideId) => {
    const current = promptState[activeGuideId];
    if (current && current.draft !== current.saved) {
      const proceed = window.confirm('Є незбережені зміни промпту. Перейти до іншого розділу інструкції?');
      if (!proceed) return;
    }
    setActiveGuideId(guideId);
    setCopiedStep(null);
  };

  const originDocsWarning = !originDocs?.trim()
    ? 'У поточній базі немає originDocs. Заповніть поле «Джерело» в лівій панелі або додайте originDocs у JSON бази.'
    : null;

  const sectionPickerWarning = sections.length === 0
    ? 'У поточній базі немає розділів. Додайте розділи в лівій панелі або оберіть іншу базу.'
    : null;

  const allQuestionsCount = countSectionQuestions(sections);
  const sectionQuestionsCount = countSectionQuestions(sections, safeSec);

  const existingQuestionsWarning = allQuestionsCount === 0
    ? 'У поточній базі немає питань. Цей крок можна пропустити, але для кращої генерації додайте хоча б кілька еталонних питань.'
    : null;

  const sectionQuestionsWarning = sectionQuestionsCount === 0
    ? `У розділі${selectedSection ? ` «${selectedSection.title}»` : ''} немає питань. Крок можна пропустити.`
    : null;

  const renderAttachmentSteps = () => {
    if (activeGuideId === AI_PROMPT_IDS.MULTIIMPORT_ALL) {
      return (
        <>
          <CopyStep
            stepNum={2}
            title="Скопіюйте originDocs"
            description={`Джерельний документ / програма поточної бази${dbName ? ` «${dbName}»` : ''}. Прикріпіть до промпту окремим повідомленням.`}
            buttonLabel="Скопіювати originDocs"
            copyMessage="✅ originDocs скопійовано!"
            warning={originDocsWarning}
            onCopy={() => copyText(formatOriginDocsCopy(originDocs), '✅ originDocs скопійовано!', 'origin-docs')}
            copied={copiedStep === 'origin-docs'}
          />
          <CopyStep
            stepNum={3}
            title="Скопіюйте інструкцію з форматування"
            description={`Універсальна інструкція з файлу src/data/guidelines/${GUIDELINE_FILES[GUIDELINE_IDS.QUESTIONS]}.`}
            buttonLabel="Скопіювати questions_guidelines"
            copyMessage="✅ questions_guidelines скопійовано!"
            onCopy={() => copyGuideline(
              GUIDELINE_IDS.QUESTIONS,
              '✅ questions_guidelines скопійовано!',
              'guidelines'
            )}
            copied={copiedStep === 'guidelines'}
          />
          <CopyStep
            stepNum={4}
            title="Скопіюйте наявні питання бази"
            description={`Усі питання поточної бази${dbName ? ` «${dbName}»` : ''} у форматі мульти-імпорту (${allQuestionsCount} шт.). ШІ використає їх як еталон і не дублюватиме формулювання.`}
            buttonLabel="Скопіювати Existing questions"
            copyMessage="✅ Existing questions скопійовано!"
            warning={existingQuestionsWarning}
            onCopy={() => copyText(
              formatExistingQuestionsCopy(sections),
              '✅ Existing questions скопійовано!',
              'existing-questions'
            )}
            copied={copiedStep === 'existing-questions'}
          />
        </>
      );
    }

    if (activeGuideId === AI_PROMPT_IDS.SINGLE_SECTION) {
      return (
        <>
          <li className="ai-guide-step">
            <div className="ai-guide-step-num">2</div>
            <div className="ai-guide-step-body">
              <h3 className="ai-guide-step-title">Оберіть розділ бази</h3>
              <p className="ai-guide-step-desc">
                Усі згенеровані питання матимуть sec, що відповідає обраному розділу.
                Плейсхолдери <code className="ai-guide-file-ref">{`{{SEC}}`}</code> та{' '}
                <code className="ai-guide-file-ref">{`{{SECTION_TITLE}}`}</code> підставляються при копіюванні промпту.
              </p>
              {sectionPickerWarning ? (
                <p className="ai-guide-step-warning">{sectionPickerWarning}</p>
              ) : (
                <select
                  className="form-input ai-guide-sec-select"
                  value={safeSec}
                  onChange={(e) => setSelectedSec(Number(e.target.value))}
                >
                  {sections.map((sec, idx) => (
                    <option key={idx} value={idx}>
                      [sec: {idx}] {sec.title || `Розділ ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </li>
          <CopyStep
            stepNum={3}
            title="Скопіюйте карту індексів розділу"
            description={`Індекси sub/top для обраного розділу${selectedSection ? `: «${selectedSection.title}»` : ''}.`}
            buttonLabel="Скопіювати Section index map"
            copyMessage="✅ Section index map скопійовано!"
            warning={sectionPickerWarning}
            onCopy={() => copyText(
              formatSectionIndexMap(sections, safeSec),
              '✅ Section index map скопійовано!',
              'index-map'
            )}
            copied={copiedStep === 'index-map'}
          />
          <CopyStep
            stepNum={4}
            title="Скопіюйте наявні питання розділу"
            description={`Питання обраного розділу${selectedSection ? ` «${selectedSection.title}»` : ''} у форматі мульти-імпорту (${sectionQuestionsCount} шт.). ШІ використає їх як еталон і не дублюватиме формулювання.`}
            buttonLabel="Скопіювати Existing questions"
            copyMessage="✅ Existing questions скопійовано!"
            warning={sectionQuestionsWarning || sectionPickerWarning}
            onCopy={() => copyText(
              formatExistingQuestionsCopy(sections, safeSec),
              '✅ Existing questions скопійовано!',
              'existing-questions'
            )}
            copied={copiedStep === 'existing-questions'}
          />
          <CopyStep
            stepNum={5}
            title="Скопіюйте інструкцію з форматування"
            description={`Універсальна інструкція з файлу src/data/guidelines/${GUIDELINE_FILES[GUIDELINE_IDS.QUESTIONS]}.`}
            buttonLabel="Скопіювати questions_guidelines"
            copyMessage="✅ questions_guidelines скопійовано!"
            onCopy={() => copyGuideline(
              GUIDELINE_IDS.QUESTIONS,
              '✅ questions_guidelines скопійовано!',
              'guidelines'
            )}
            copied={copiedStep === 'guidelines'}
          />
        </>
      );
    }

    return (
      <>
        <CopyStep
          stepNum={2}
          title="Скопіюйте інструкцію зі створення бази"
          description={`Повна інструкція з файлу src/data/guidelines/${GUIDELINE_FILES[GUIDELINE_IDS.DB_CREATION]}.`}
          buttonLabel="Скопіювати database_creation_guidelines"
          copyMessage="✅ database_creation_guidelines скопійовано!"
          onCopy={() => copyGuideline(
            GUIDELINE_IDS.DB_CREATION,
            '✅ database_creation_guidelines скопійовано!',
            'db-guidelines'
          )}
          copied={copiedStep === 'db-guidelines'}
        />
        <InfoStep
          stepNum={3}
          title="Надайте originDocs"
          description={
            'Підготуйте текст офіційної програми іспиту або джерельного документа зі структурою тем. ' +
            'Прикріпіть його до ШІ-агента окремим повідомленням з маркером originDocs: на початку. ' +
            'Після генерації цей текст має потрапити в поле originDocs JSON-бази (редагується в лівій панелі → «Джерело»).'
          }
          note="Цей матеріал надає користувач — скопіюйте його з офіційного PDF, Word або іншого джерела."
        />
        <InfoStep
          stepNum={4}
          title="Надайте офіційні питання"
          description={
            'Підготуйте офіційні питання з іспиту або навчального курсу (текст, PDF, таблиця тощо). ' +
            'Прикріпіть їх до ШІ-агента окремим повідомленням з маркером Official questions: на початку. ' +
            'ШІ включить їх у базу зі status: "official" і згенерує додаткові питання за потреби.'
          }
          note="Цей матеріал надає користувач. Якщо офіційних питань немає, опишіть це агенту — він згенерує питання лише за програмою."
        />
      </>
    );
  };

  return (
    <div className="content-area ai-guide">
      <div className="ai-guide-header">
        <h2 className="questions-title">Генерація контенту за допомогою ШІ</h2>
        <p className="ai-guide-intro">
          Покрокова інструкція для роботи з ШІ-агентами (ChatGPT, Claude тощо).
          Оберіть сценарій, відредагуйте промпт за потреби і передайте матеріали агенту по черзі —
          кожен крок окремим повідомленням з відповідним маркером.
        </p>
      </div>

      <div className="ai-guide-section-picker" role="tablist" aria-label="Тип інструкції ШІ">
        {AI_GUIDE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeGuideId === section.id}
            className={`ai-guide-section-picker-btn${activeGuideId === section.id ? ' active' : ''}`}
            onClick={() => handleGuideSwitch(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <p className="ai-guide-section-intro">{activeGuide.intro}</p>

      <div className="ai-guide-step ai-guide-prompt-step">
        <div className="ai-guide-step-num">1</div>
        <div className="ai-guide-step-body">
          <h3 className="ai-guide-step-title">Промпт для ШІ-агента</h3>
          <p className="ai-guide-step-desc">
            Основний промпт для обраного сценарію. Текст можна змінити і зберегти у відповідний файл у папці{' '}
            <code className="ai-guide-file-ref">src/data/ai-prompts/</code>.
          </p>
          <PromptEditor
            promptId={activeGuideId}
            draft={currentPrompt.draft}
            saved={currentPrompt.saved}
            loading={currentPrompt.loading}
            saving={currentPrompt.saving}
            onChange={updateDraft}
            onSave={savePrompt}
            onDiscard={discardPromptChanges}
            onReset={resetPrompt}
            onCopy={() => copyText(getCopyPromptText(), '✅ Промпт скопійовано!', 'prompt')}
            copied={copiedStep === 'prompt'}
            templateHint={
              activeGuideId === AI_PROMPT_IDS.SINGLE_SECTION
                ? 'При копіюванні плейсхолдери {{SEC}} та {{SECTION_TITLE}} замінюються значеннями обраного розділу (крок 2).'
                : null
            }
          />
        </div>
      </div>

      <ol className="ai-guide-steps" start={2}>
        {renderAttachmentSteps()}
      </ol>

      <div className="ai-guide-footer">
        <h3 className="ai-guide-footer-title">Після отримання відповіді від ШІ</h3>
        <p>{activeGuide.footer}</p>
      </div>

      {toastMessage && (
        <div className="toast success" style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)', fontWeight: 600 }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

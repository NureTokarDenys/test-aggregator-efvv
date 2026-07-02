import React, { useState } from 'react';
import { ChevronIcon, EditIcon, PlusIcon, TrashIcon, CopyIcon } from './Icons';
import EditTextModal from './EditTextModal';

export default function Sidebar({
  data,
  originDocs = '',
  onSaveOriginDocs,
  selectedPath,
  setSelectedPath,
  onEditSection,
  onEditSubsection,
  onEditTopic,
  onAddSection,
  onAddSubsection,
  onAddTopic,
  onDeleteSection,
  onDeleteSubsection,
  onDeleteTopic
}) {
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [originDocsModalOpen, setOriginDocsModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const TITLE_PREVIEW_LEN = 30;
  const displayTitle = (title, showFull) =>
    showFull ? title : title.substring(0, TITLE_PREVIEW_LEN) + (title.length > TITLE_PREVIEW_LEN ? '...' : '');

  const getQCount = (topic) => topic.questions?.length || 0;
  const getSubCount = (sub) => sub.topics.reduce((acc, t) => acc + getQCount(t), 0);
  const getSecCount = (sec) => sec.subsections.reduce((acc, sub) => acc + getSubCount(sub), 0);

  const startEdit = (type, secIdx, subIdx, topIdx, title) => {
    setEditing({ type, secIdx, subIdx, topIdx, title });
  };

  const handleEditSave = () => {
    if (!editing) return;
    const { type, secIdx, subIdx, topIdx, title } = editing;
    const trimmed = title.trim();
    if (!trimmed) {
      setEditing(null);
      return;
    }
    if (type === 'section' && onEditSection) onEditSection(secIdx, trimmed);
    else if (type === 'subsection' && onEditSubsection) onEditSubsection(secIdx, subIdx, trimmed);
    else if (type === 'topic' && onEditTopic) onEditTopic(secIdx, subIdx, topIdx, trimmed);
    setEditing(null);
  };

  const handleEditCancel = () => setEditing(null);

  const handleEditChange = (e) => {
    setEditing(prev => prev ? { ...prev, title: e.target.value } : null);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') handleEditSave();
    else if (e.key === 'Escape') handleEditCancel();
  };

  const handleAddSection = () => {
    const newIdx = data.length;
    onAddSection?.();
    setExpanded(prev => ({ ...prev, [`sec-${newIdx}`]: true }));
    startEdit('section', newIdx, null, null, 'Новий розділ');
  };

  const handleAddSubsection = (secIdx) => {
    const newIdx = data[secIdx]?.subsections?.length ?? 0;
    onAddSubsection?.(secIdx);
    setExpanded(prev => ({ ...prev, [`sec-${secIdx}`]: true, [`sub-${secIdx}-${newIdx}`]: true }));
    startEdit('subsection', secIdx, newIdx, null, 'Новий підрозділ');
  };

  const handleAddTopic = (secIdx, subIdx) => {
    const newIdx = data[secIdx]?.subsections?.[subIdx]?.topics?.length ?? 0;
    onAddTopic?.(secIdx, subIdx);
    setExpanded(prev => ({
      ...prev,
      [`sec-${secIdx}`]: true,
      [`sub-${secIdx}-${subIdx}`]: true
    }));
    setSelectedPath({ sec: secIdx, sub: subIdx, top: newIdx });
    startEdit('topic', secIdx, subIdx, newIdx, 'Нова тема');
  };

  const handleCopyOriginDocs = async () => {
    try {
      await navigator.clipboard.writeText(originDocs || '');
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      alert('Не вдалося скопіювати текст');
    }
  };

  const handleSaveOriginDocs = (value) => {
    onSaveOriginDocs?.(value);
    setOriginDocsModalOpen(false);
  };

  const handleSidebarBackgroundClick = (e) => {
    if (e.target.closest('button, input, .tree-topic, .tree-section-header, .tree-subsection-header, .sidebar-empty')) {
      return;
    }
    setSelectedPath(null);
  };

  const renderActionButtons = (type, secIdx, subIdx, topIdx) => (
    <>
      {type === 'section' && (
        <button
          className="btn-icon tree-action-btn"
          onClick={(e) => { e.stopPropagation(); handleAddSubsection(secIdx); }}
          title="Додати підрозділ"
        >
          <PlusIcon style={{ width: 16, height: 16 }} />
        </button>
      )}
      {type === 'subsection' && (
        <button
          className="btn-icon tree-action-btn"
          onClick={(e) => { e.stopPropagation(); handleAddTopic(secIdx, subIdx); }}
          title="Додати тему"
        >
          <PlusIcon style={{ width: 16, height: 16 }} />
        </button>
      )}
      <button
        className="btn-icon tree-action-btn tree-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (type === 'section') onDeleteSection?.(secIdx);
          else if (type === 'subsection') onDeleteSubsection?.(secIdx, subIdx);
          else if (type === 'topic') onDeleteTopic?.(secIdx, subIdx, topIdx);
        }}
        title={type === 'section' ? 'Видалити розділ' : type === 'subsection' ? 'Видалити підрозділ' : 'Видалити тему'}
      >
        <TrashIcon style={{ width: 16, height: 16 }} />
      </button>
      <button
        className="btn-icon tree-action-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (type === 'section') startEdit('section', secIdx, null, null, data[secIdx].title);
          else if (type === 'subsection') startEdit('subsection', secIdx, subIdx, null, data[secIdx].subsections[subIdx].title);
          else startEdit('topic', secIdx, subIdx, topIdx, data[secIdx].subsections[subIdx].topics[topIdx].title);
        }}
        title={type === 'section' ? 'Редагувати назву розділу' : type === 'subsection' ? 'Редагувати назву підрозділу' : 'Редагувати назву теми'}
      >
        <EditIcon style={{ width: 16, height: 16 }} />
      </button>
    </>
  );

  return (
    <aside className="sidebar" onClick={handleSidebarBackgroundClick}>
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div className="sidebar-title">Структура бази</div>
          <button
            className="btn btn-sm sidebar-add-btn"
            onClick={handleAddSection}
            title="Додати розділ"
          >
            <PlusIcon style={{ width: 14, height: 14 }} /> Розділ
          </button>
        </div>
        <input
          className="sidebar-search"
          placeholder="Пошук (тимчасово неактивно)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="sidebar-tree">
        {(!data || data.length === 0) && (
          <div className="sidebar-empty">
            <p>База порожня</p>
            <button className="btn btn-sm" onClick={handleAddSection}>
              <PlusIcon style={{ width: 14, height: 14 }} /> Додати перший розділ
            </button>
          </div>
        )}
        {data.map((sec, secIdx) => {
          const secId = `sec-${secIdx}`;
          const isSecOpen = expanded[secId];
          const isSecEditing = editing?.type === 'section' && editing?.secIdx === secIdx;
          return (
            <div key={secIdx} className="tree-section">
              <div className="tree-section-header" onClick={() => !isSecEditing && toggle(secId)}>
                <ChevronIcon className={`tree-chevron ${isSecOpen ? 'open' : ''}`} />
                {isSecEditing ? (
                  <input
                    className="tree-edit-input"
                    type="text"
                    value={editing.title}
                    onChange={handleEditChange}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditSave}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                ) : (
                  <>
                    <div className={`tree-section-title${isSecOpen ? ' full' : ' preview'}`} title={sec.title}>
                      {displayTitle(sec.title, isSecOpen)}
                    </div>
                    <div className="tree-count">{getSecCount(sec)}</div>
                    {renderActionButtons('section', secIdx)}
                  </>
                )}
              </div>

              {isSecOpen && sec.subsections.map((sub, subIdx) => {
                const subId = `sub-${secIdx}-${subIdx}`;
                const isSubOpen = expanded[subId];
                const isSubEditing = editing?.type === 'subsection' && editing?.secIdx === secIdx && editing?.subIdx === subIdx;
                return (
                  <div key={subIdx} className="tree-subsection">
                    <div className="tree-subsection-header" onClick={() => !isSubEditing && toggle(subId)}>
                      <ChevronIcon className={`tree-chevron ${isSubOpen ? 'open' : ''}`} />
                      {isSubEditing ? (
                        <input
                          className="tree-edit-input"
                          type="text"
                          value={editing.title}
                          onChange={handleEditChange}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleEditSave}
                          autoFocus
                          style={{ flex: 1 }}
                        />
                      ) : (
                        <>
                          <div className={`tree-section-title${isSubOpen ? ' full' : ' preview'}`} title={sub.title}>
                            {displayTitle(sub.title, isSubOpen)}
                          </div>
                          <div className="tree-count">{getSubCount(sub)}</div>
                          {renderActionButtons('subsection', secIdx, subIdx)}
                        </>
                      )}
                    </div>

                    {isSubOpen && sub.topics.map((top, topIdx) => {
                      const isSelected = selectedPath?.sec === secIdx && selectedPath?.sub === subIdx && selectedPath?.top === topIdx;
                      const isTopicEditing = editing?.type === 'topic' && editing?.secIdx === secIdx && editing?.subIdx === subIdx && editing?.topIdx === topIdx;
                      return (
                        <div key={topIdx} className="tree-topics">
                          <div
                            className={`tree-topic ${isSelected ? 'selected' : ''}`}
                            onClick={() => !isTopicEditing && setSelectedPath({ sec: secIdx, sub: subIdx, top: topIdx })}
                          >
                            {isTopicEditing ? (
                              <input
                                className="tree-edit-input"
                                type="text"
                                value={editing.title}
                                onChange={handleEditChange}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleEditSave}
                                autoFocus
                                style={{ flex: 1 }}
                              />
                            ) : (
                              <>
                                <div className={`tree-topic-title${isSelected ? ' full' : ' preview'}`} title={top.title}>
                                  {displayTitle(top.title, isSelected)}
                                </div>
                                <div className="tree-count">{getQCount(top)}</div>
                                {renderActionButtons('topic', secIdx, subIdx, topIdx)}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="sidebar-footer">
        <button
          className="btn btn-sm sidebar-footer-btn"
          onClick={() => setOriginDocsModalOpen(true)}
          title="Редагувати опис документів-джерел бази"
        >
          <EditIcon style={{ width: 14, height: 14 }} /> Змінити
        </button>
        <button
          className="btn btn-sm sidebar-footer-btn"
          onClick={handleCopyOriginDocs}
          title="Копіювати опис документів у буфер обміну"
        >
          <CopyIcon /> {copyFeedback ? 'Скопійовано!' : 'Копіювати'}
        </button>
      </div>
      <EditTextModal
        isOpen={originDocsModalOpen}
        title="Документи-джерела бази"
        message="Опис тем та документів, на основі яких створена ця база даних:"
        value={originDocs}
        placeholder="Введіть опис документів-джерел..."
        saveText="Зберегти"
        discardText="Скасувати"
        onSave={handleSaveOriginDocs}
        onDiscard={() => setOriginDocsModalOpen(false)}
        minRows={12}
        maxWidth="640px"
      />
    </aside>
  );
}

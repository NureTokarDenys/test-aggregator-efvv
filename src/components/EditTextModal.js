import React, { useState, useEffect } from 'react';

export default function EditTextModal({
  isOpen,
  title,
  message,
  value = '',
  placeholder = '',
  saveText = 'Зберегти',
  discardText = 'Скасувати',
  onSave,
  onDiscard,
  multiline = true,
  minRows = 10,
  maxWidth = '560px',
  inputType = 'text'
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onDiscard?.();
  };

  const handleSave = () => onSave?.(draft);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth, margin: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onDiscard}>×</button>
        </div>
        <div className="modal-body">
          {message && (
            <div className="confirm-msg" style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text2)' }}>
              {message}
            </div>
          )}
          {multiline ? (
            <textarea
              className="form-input form-textarea edit-text-modal-area"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={minRows}
              autoFocus
            />
          ) : (
            <input
              type={inputType}
              className="form-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
          <button className="btn" onClick={onDiscard}>{discardText}</button>
          <button
            className="btn"
            style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}
            onClick={handleSave}
          >
            {saveText}
          </button>
        </div>
      </div>
    </div>
  );
}

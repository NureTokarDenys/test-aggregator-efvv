import React from 'react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Підтвердити",
  cancelText = "Скасувати",
  discardText = "Відкинути зміни",
  onConfirm,
  onCancel,
  onDiscard,
  isDanger = false,
  showDiscardOption = false,
  showInput = false,
  inputValue = '',
  inputPlaceholder = '',
  onInputChange
}) {
  if (!isOpen) return null;

  // Закриття при кліку на замилений фон (але не на саме вікно)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '480px', margin: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="confirm-msg" style={{ fontSize: '15px', textAlign: 'center', padding: '10px 0' }}>
            {message}
          </div>
          {showInput && (
            <input
              type="text"
              className="form-input"
              value={inputValue}
              onChange={onInputChange}
              placeholder={inputPlaceholder}
              style={{ marginTop: '16px', width: '100%', boxSizing: 'border-box' }}
              autoFocus
            />
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={onCancel}>{cancelText}</button>
          {showDiscardOption && onDiscard && (
            <button
              className="btn"
              style={{ background: 'var(--surface2)', color: 'var(--text)', borderColor: 'var(--border)' }}
              onClick={onDiscard}
            >
              {discardText}
            </button>
          )}
          <button
            className="btn"
            style={isDanger ? { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' } : { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}
            onClick={onConfirm}
            disabled={showInput && !inputValue.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
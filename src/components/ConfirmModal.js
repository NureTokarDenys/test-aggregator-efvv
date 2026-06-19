import React from 'react';

export default function ConfirmModal({ isOpen, title, message, confirmText = "Підтвердити", cancelText = "Скасувати", onConfirm, onCancel, isDanger = false }) {
  if (!isOpen) return null;

  // Закриття при кліку на замилений фон (але не на саме вікно)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '420px', margin: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="confirm-msg" style={{ fontSize: '15px', textAlign: 'center', padding: '10px 0' }}>
            {message}
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: '16px' }}>
          <button className="btn" onClick={onCancel}>{cancelText}</button>
          <button 
            className="btn" 
            style={isDanger ? { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' } : { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon, ChevronIcon } from './Icons';

export default function ImportDropdown({ onImportFile, onImportText, disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleFile = () => {
    setOpen(false);
    onImportFile();
  };

  const handleText = () => {
    setOpen(false);
    onImportText();
  };

  return (
    <div className="import-dropdown" ref={ref}>
      <button
        type="button"
        className="btn btn-sm import-dropdown-trigger"
        onClick={() => setOpen(prev => !prev)}
        disabled={disabled}
        title="Імпортувати базу даних"
        style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UploadIcon style={{ width: 16, height: 16 }} />
        Імпорт
        <ChevronIcon className={`import-dropdown-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="import-dropdown-menu" role="menu">
          <button type="button" className="import-dropdown-item" role="menuitem" onClick={handleFile}>
            <UploadIcon style={{ width: 16, height: 16 }} />
            <span>
              <strong>З файлу</strong>
              <small>Замінити поточну базу JSON-файлом</small>
            </span>
          </button>
          <button type="button" className="import-dropdown-item" role="menuitem" onClick={handleText}>
            <UploadIcon style={{ width: 16, height: 16 }} />
            <span>
              <strong>З тексту</strong>
              <small>Створити нову базу з вставленого JSON</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

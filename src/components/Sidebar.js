import React, { useState } from 'react';
import { ChevronIcon } from './Icons';

export default function Sidebar({ data, selectedPath, setSelectedPath }) {
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const getQCount = (topic) => topic.questions?.length || 0;
  const getSubCount = (sub) => sub.topics.reduce((acc, t) => acc + getQCount(t), 0);
  const getSecCount = (sec) => sec.subsections.reduce((acc, sub) => acc + getSubCount(sub), 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Структура бази</div>
        <input 
          className="sidebar-search" 
          placeholder="Пошук (тимчасово неактивно)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="sidebar-tree">
        {data.map((sec, secIdx) => {
          const secId = `sec-${secIdx}`;
          const isSecOpen = expanded[secId];
          return (
            <div key={secIdx} className="tree-section">
              <div className="tree-section-header" onClick={() => toggle(secId)}>
                <ChevronIcon className={`tree-chevron ${isSecOpen ? 'open' : ''}`} />
                <div className="tree-section-title">{sec.title.substring(0, 35)}...</div>
                <div className="tree-count">{getSecCount(sec)}</div>
              </div>

              {isSecOpen && sec.subsections.map((sub, subIdx) => {
                const subId = `sub-${secIdx}-${subIdx}`;
                const isSubOpen = expanded[subId];
                return (
                  <div key={subIdx} className="tree-subsection">
                    <div className="tree-subsection-header" onClick={() => toggle(subId)}>
                      <ChevronIcon className={`tree-chevron ${isSubOpen ? 'open' : ''}`} />
                      <div className="tree-section-title">{sub.title.substring(0, 30)}...</div>
                      <div className="tree-count">{getSubCount(sub)}</div>
                    </div>

                    {isSubOpen && sub.topics.map((top, topIdx) => {
                      const isSelected = selectedPath?.sec === secIdx && selectedPath?.sub === subIdx && selectedPath?.top === topIdx;
                      return (
                        <div key={topIdx} className="tree-topics">
                          <div 
                            className={`tree-topic ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedPath({ sec: secIdx, sub: subIdx, top: topIdx })}
                          >
                            <div className="tree-topic-title">{top.title}</div>
                            <div className="tree-count">{getQCount(top)}</div>
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
    </aside>
  );
}
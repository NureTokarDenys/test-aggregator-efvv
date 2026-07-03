import React, { useEffect, useMemo, useState } from 'react';
import {
  STAT_CARD_DEFS,
  computeAggregateStats,
  buildHierarchyBreakdown,
  truncateStatTitle,
} from '../dbStats';
import { ChevronIcon } from './Icons';

function formatPct(n) {
  if (!Number.isFinite(n)) return '0%';
  return n >= 10 || n === 0 ? `${Math.round(n)}%` : `${n.toFixed(1)}%`;
}

function StatBar({ pct, color }) {
  return (
    <div className="stats-bar-track">
      <div
        className="stats-bar-fill"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color || 'var(--accent)' }}
      />
    </div>
  );
}

function StatDetailRow({
  node,
  metric,
  barColor,
  depth = 0,
  hasChildren = false,
  isOpen = false,
  onToggle,
}) {
  const isCountMetric = metric === 'questions' || metric === 'sections';
  const barPct = isCountMetric ? node.sharePct : node.coveragePct;

  const countLabel = isCountMetric
    ? `${node.value}`
    : `${node.value} / ${node.total}`;

  const pctLabel = isCountMetric
    ? `${formatPct(node.sharePct)} від усіх`
    : `${formatPct(node.coveragePct)} у межах`;

  const handleKeyDown = (e) => {
    if (!hasChildren) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <div className="stats-detail-row" style={{ paddingLeft: `${12 + depth * 16}px` }}>
      <div
        className={`stats-detail-row-head${hasChildren ? ' stats-detail-row-head--collapsible' : ''}`}
        onClick={hasChildren ? onToggle : undefined}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        onKeyDown={handleKeyDown}
      >
        {hasChildren && (
          <ChevronIcon className={`tree-chevron stats-detail-chevron ${isOpen ? 'open' : ''}`} />
        )}
        <span className="stats-detail-title" title={node.title}>{truncateStatTitle(node.title)}</span>
        <span className="stats-detail-counts">
          <strong>{countLabel}</strong>
          <span className="stats-detail-pct">{pctLabel}</span>
        </span>
      </div>
      <StatBar pct={barPct} color={barColor} />
    </div>
  );
}

function StatDetailPanel({ metric, data, barColor }) {
  const [expanded, setExpanded] = useState({});
  const hierarchy = useMemo(() => buildHierarchyBreakdown(data, metric), [data, metric]);
  const aggregate = useMemo(() => computeAggregateStats(data), [data]);
  const cardDef = STAT_CARD_DEFS.find(c => c.key === metric);
  const isCountMetric = metric === 'questions' || metric === 'sections';

  const globalValue = metric === 'sections' ? aggregate.questions : aggregate[metric];
  const globalTotal = aggregate.questions;

  useEffect(() => {
    setExpanded({});
  }, [metric]);

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="stats-detail-panel">
      <div className="stats-detail-header">
        <div>
          <div className="stats-detail-heading">{cardDef?.title || metric}</div>
          <div className="stats-detail-sub">
            {isCountMetric
              ? `Розподіл ${metric === 'sections' ? 'питань по розділах' : 'питань'} — ${globalValue} у базі`
              : `${globalValue} з ${globalTotal} питань (${formatPct(globalTotal > 0 ? (globalValue / globalTotal) * 100 : 0)} загалом)`}
          </div>
        </div>
      </div>

      <div className="stats-detail-body">
        {hierarchy.length === 0 ? (
          <div className="stats-detail-empty">Немає даних для відображення</div>
        ) : (
          hierarchy.map((sec, sIdx) => {
            const secId = `sec-${sIdx}`;
            const isSecOpen = !!expanded[secId];
            const hasSubsections = sec.subsections.length > 0;

            return (
              <div key={sIdx} className="stats-detail-section">
                <StatDetailRow
                  node={sec}
                  metric={metric}
                  barColor={barColor}
                  depth={0}
                  hasChildren={hasSubsections}
                  isOpen={isSecOpen}
                  onToggle={() => toggle(secId)}
                />
                {isSecOpen && sec.subsections.map((sub, sbIdx) => {
                  const subId = `sub-${sIdx}-${sbIdx}`;
                  const isSubOpen = !!expanded[subId];
                  const hasTopics = sub.topics.length > 0;

                  return (
                    <div key={sbIdx}>
                      <StatDetailRow
                        node={sub}
                        metric={metric}
                        barColor={barColor}
                        depth={1}
                        hasChildren={hasTopics}
                        isOpen={isSubOpen}
                        onToggle={() => toggle(subId)}
                      />
                      {isSubOpen && sub.topics.map((top, tIdx) => (
                        <StatDetailRow
                          key={tIdx}
                          node={top}
                          metric={metric}
                          barColor={barColor}
                          depth={2}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function DbStatsDashboard({ data, gridMinWidth = 180 }) {
  const stats = useMemo(() => computeAggregateStats(data), [data]);
  const [expandedMetric, setExpandedMetric] = useState(null);

  const toggleMetric = (key) => {
    setExpandedMetric(prev => (prev === key ? null : key));
  };

  const activeDef = STAT_CARD_DEFS.find(c => c.key === expandedMetric);

  return (
    <>
      <div
        className="overview-grid"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))` }}
      >
        {STAT_CARD_DEFS.map(card => {
          const isActive = expandedMetric === card.key;
          return (
            <div
              key={card.key}
              className={`overview-card${isActive ? ' active' : ''}`}
              title={card.tooltip}
              style={card.borderColor ? { borderColor: card.borderColor } : undefined}
              onClick={() => toggleMetric(card.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleMetric(card.key);
                }
              }}
            >
              <div className="overview-card-title">{card.title}</div>
              <div
                className="overview-card-num"
                style={card.color ? { color: card.color } : undefined}
              >
                {stats[card.key]}
              </div>
              <div className="overview-card-sub">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {expandedMetric && (
        <StatDetailPanel
          metric={expandedMetric}
          data={data}
          barColor={activeDef?.color}
        />
      )}
    </>
  );
}

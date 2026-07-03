export const STAT_CARD_DEFS = [
  {
    key: 'sections',
    title: 'Розділи',
    sub: 'Всього дисциплін',
    tooltip: 'Кількість головних розділів у базі',
  },
  {
    key: 'questions',
    title: 'Всього питань',
    sub: 'У базі даних',
    tooltip: 'Загальна кількість питань, доступних для тестування',
  },
  {
    key: 'seen',
    title: 'Бачені (👁️)',
    sub: 'Вже опрацьовано',
    color: '#3b82f6',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    tooltip: 'Питання, на які ви вже хоча б раз давали відповідь',
  },
  {
    key: 'favorites',
    title: 'Обрані (🔥)',
    sub: 'Збережені вами',
    color: '#f97316',
    borderColor: 'rgba(249, 115, 22, 0.5)',
    tooltip: 'Питання, які ви відмітили вогником як важливі',
  },
  {
    key: 'verified',
    title: 'Перевірені (*)',
    sub: 'Якісні питання',
    color: 'var(--yellow)',
    tooltip: 'Питання, відмічені 1 зірочкою',
  },
  {
    key: 'official',
    title: 'Офіційні (**)',
    sub: 'З бази ЄФВВ',
    color: 'var(--yellow)',
    tooltip: 'Питання з офіційного джерела (ЄФВВ)',
  },
];

export function getAllTopicQuestions(data) {
  const allQs = [];
  (data || []).forEach(sec => {
    (sec.subsections || []).forEach(sub => {
      (sub.topics || []).forEach(top => {
        allQs.push(...(top.questions || []));
      });
    });
  });
  return allQs;
}

export function countByMetric(questions, metric) {
  if (metric === 'questions' || metric === 'sections') return questions.length;
  return questions.filter(q => {
    if (metric === 'seen') return !!q.seen;
    if (metric === 'favorites') return !!q.favorite;
    if (metric === 'verified') return q.status === 'verified';
    if (metric === 'official') return q.status === 'official';
    return false;
  }).length;
}

export function computeAggregateStats(data) {
  const allQs = getAllTopicQuestions(data);
  return {
    sections: (data || []).length,
    questions: allQs.length,
    seen: countByMetric(allQs, 'seen'),
    favorites: countByMetric(allQs, 'favorites'),
    verified: countByMetric(allQs, 'verified'),
    official: countByMetric(allQs, 'official'),
  };
}

export function buildHierarchyBreakdown(data, metric) {
  const aggregate = computeAggregateStats(data);
  const globalQuestions = aggregate.questions;
  const globalMetricTotal = metric === 'sections' ? globalQuestions : aggregate[metric];

  const buildNode = (title, questions) => {
    const total = questions.length;
    const value = metric === 'sections' ? total : countByMetric(questions, metric);
    const sharePct = globalQuestions > 0 ? (total / globalQuestions) * 100 : 0;
    const coveragePct = total > 0 ? (value / total) * 100 : 0;
    const globalPct = globalMetricTotal > 0 ? (value / globalMetricTotal) * 100 : 0;

    return {
      title,
      value,
      total,
      sharePct,
      coveragePct,
      globalPct,
    };
  };

  return (data || []).map(sec => {
    const secQuestions = [];
    (sec.subsections || []).forEach(sub => {
      (sub.topics || []).forEach(top => secQuestions.push(...(top.questions || [])));
    });

    const subsections = (sec.subsections || []).map(sub => {
      const subQuestions = [];
      (sub.topics || []).forEach(top => subQuestions.push(...(top.questions || [])));

      const topics = (sub.topics || []).map(top =>
        buildNode(top.title, top.questions || [])
      );

      return { ...buildNode(sub.title, subQuestions), topics };
    });

    return { ...buildNode(sec.title, secQuestions), subsections };
  });
}

export function buildQuestionStatsText(data) {
  const lines = ['Статистика кількості питань', ''];
  const aggregate = computeAggregateStats(data);
  lines.push(`Всього питань: ${aggregate.questions}`, '');

  buildHierarchyBreakdown(data, 'questions').forEach(sec => {
    lines.push(`${sec.title}: ${sec.value}`);
    sec.subsections.forEach(sub => {
      lines.push(`  ${sub.title}: ${sub.value}`);
      sub.topics.forEach(top => {
        lines.push(`    ${top.title}: ${top.value}`);
      });
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function truncateStatTitle(title, maxLen = 55) {
  if (!title) return '';
  return title.length > maxLen ? `${title.substring(0, maxLen)}…` : title;
}

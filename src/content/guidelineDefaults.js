export const GUIDELINE_IDS = {
  QUESTIONS: 'questions-guidelines',
  DB_CREATION: 'db-creation-guidelines',
};

export const GUIDELINE_MARKERS = {
  [GUIDELINE_IDS.QUESTIONS]: 'Questions guidelines:\n',
  [GUIDELINE_IDS.DB_CREATION]: 'Database creation guidelines:\n',
};

export const GUIDELINE_FILES = {
  [GUIDELINE_IDS.QUESTIONS]: 'questions-guidelines.txt',
  [GUIDELINE_IDS.DB_CREATION]: 'db-creation-guidelines.txt',
};

export function formatGuidelineCopy(id, content) {
  const marker = GUIDELINE_MARKERS[id] || '';
  return `${marker}${content || ''}`;
}

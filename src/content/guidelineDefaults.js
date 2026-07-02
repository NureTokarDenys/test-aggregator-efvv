import { DEFAULT_GUIDELINE_CONTENT } from './guidelineContent';

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

export function getDefaultGuidelineContent(guidelineId) {
  return DEFAULT_GUIDELINE_CONTENT[guidelineId] || '';
}

/** Load guideline text from API, falling back to bundled defaults if the server is unavailable or outdated. */
export async function fetchGuidelineContent(guidelineId, apiBase) {
  try {
    const response = await fetch(`${apiBase}/guidelines/${guidelineId}`);
    const raw = await response.text();
    if (raw.trim()) {
      const result = JSON.parse(raw);
      if (response.ok && result.success && typeof result.content === 'string') {
        return result.content;
      }
    }
  } catch {
    // API unavailable, outdated server, or invalid JSON — use bundled copy below.
  }

  const fallback = getDefaultGuidelineContent(guidelineId);
  if (!fallback) {
    throw new Error(`Інструкцію "${guidelineId}" не знайдено`);
  }
  return fallback;
}

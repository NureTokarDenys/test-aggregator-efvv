export {
  GUIDELINE_IDS,
  GUIDELINE_MARKERS,
  GUIDELINE_FILES,
  formatGuidelineCopy,
} from './guidelineDefaults';

export const QUESTIONS_GUIDELINES_MARKER = 'Questions guidelines:\n';

/** @deprecated Content lives in src/data/guidelines/questions-guidelines.txt — load via /api/guidelines */
export function formatQuestionsGuidelinesCopy() {
  return `${QUESTIONS_GUIDELINES_MARKER}`;
}

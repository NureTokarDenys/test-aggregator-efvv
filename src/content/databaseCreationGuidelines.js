export {
  GUIDELINE_IDS,
  GUIDELINE_MARKERS,
  GUIDELINE_FILES,
  formatGuidelineCopy,
} from './guidelineDefaults';

export const DATABASE_CREATION_GUIDELINES_MARKER = 'Database creation guidelines:\n';

/** @deprecated Content lives in src/data/guidelines/db-creation-guidelines.txt — load via /api/guidelines */
export function formatDatabaseCreationGuidelinesCopy() {
  return `${DATABASE_CREATION_GUIDELINES_MARKER}`;
}

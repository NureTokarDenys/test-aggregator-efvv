export const EMPTY_DB = { originDocs: '', sections: [] };

export function normalizeDbData(raw) {
  if (!raw) return { ...EMPTY_DB };
  if (Array.isArray(raw)) {
    return { originDocs: '', sections: raw };
  }
  if (typeof raw === 'object' && Array.isArray(raw.sections)) {
    return {
      originDocs: typeof raw.originDocs === 'string' ? raw.originDocs : '',
      sections: raw.sections
    };
  }
  return { ...EMPTY_DB };
}

export function getSections(dbData) {
  return normalizeDbData(dbData).sections;
}

export function countQuestions(dbData) {
  return getSections(dbData).reduce((acc, sec) =>
    acc + (sec.subsections?.reduce((sAcc, sub) =>
      sAcc + (sub.topics?.reduce((tAcc, top) =>
        tAcc + (top.questions?.length || 0), 0) || 0), 0) || 0), 0);
}

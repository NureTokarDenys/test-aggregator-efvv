import { normalizeDbData } from './dbFormat';

const FULL_DB_EXAMPLE = `[{
  "title": "РОЗДІЛ 1. НАЗВА",
  "subsections": [{
    "title": "1.1. Підрозділ",
    "topics": [{
      "title": "1.1.1. Тема",
      "questions": [{
        "q": "Текст питання?",
        "a": ["А", "Б", "В", "Г"],
        "correct": 0
      }]
    }]
  }]
}]`;

function isQuestionArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  return first && typeof first === 'object' && first.q !== undefined
    && first.title === undefined && first.subsections === undefined;
}

function validateQuestion(q, path) {
  const errors = [];
  if (!q || typeof q !== 'object') {
    errors.push({
      message: `${path}: питання має бути об'єктом.`,
      fix: 'Кожен елемент у "questions" має бути об\'єктом з полями q, a, correct.',
    });
    return errors;
  }
  if (typeof q.q !== 'string' || !q.q.trim()) {
    errors.push({
      message: `${path}: відсутній або порожній текст питання (поле "q").`,
      fix: 'Додайте непорожній рядок у поле "q".',
    });
  }
  if (!Array.isArray(q.a)) {
    errors.push({
      message: `${path}: поле "a" має бути масивом із 4 варіантів відповіді.`,
      fix: 'Вкажіть "a": ["варіант 1", "варіант 2", "варіант 3", "варіант 4"].',
    });
  } else if (q.a.length !== 4) {
    errors.push({
      message: `${path}: у полі "a" має бути рівно 4 варіанти (знайдено ${q.a.length}).`,
      fix: 'Додайте або видаліть варіанти, щоб залишилось рівно 4 елементи в масиві "a".',
    });
  } else if (q.a.some(item => typeof item !== 'string' || !item.trim())) {
    errors.push({
      message: `${path}: усі варіанти в "a" мають бути непорожніми рядками.`,
      fix: 'Перевірте, що кожен елемент масиву "a" — це текст відповіді.',
    });
  }
  if (q.correct === undefined || q.correct === null) {
    errors.push({
      message: `${path}: відсутнє поле "correct" (індекс правильної відповіді).`,
      fix: 'Додайте "correct": 0, 1, 2 або 3 — номер правильного варіанту (0 = перший).',
    });
  } else {
    const correct = Number(q.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      errors.push({
        message: `${path}: "correct" має бути цілим числом від 0 до 3 (зараз: ${q.correct}).`,
        fix: 'Вкажіть індекс правильної відповіді: 0 — перший варіант, 3 — четвертий.',
      });
    }
  }
  if (q.status !== undefined && q.status !== 'verified' && q.status !== 'official') {
    errors.push({
      message: `${path}: невідомий status "${q.status}".`,
      fix: 'Використовуйте "verified", "official" або не вказуйте поле status.',
    });
  }
  return errors;
}

function validateTopic(topic, path) {
  const errors = [];
  if (!topic || typeof topic !== 'object') {
    errors.push({
      message: `${path}: тема має бути об'єктом.`,
      fix: 'Кожна тема має мати "title" та "questions".',
    });
    return errors;
  }
  if (typeof topic.title !== 'string' || !topic.title.trim()) {
    errors.push({
      message: `${path}: відсутня або порожня назва теми ("title").`,
      fix: 'Додайте поле "title" з назвою теми, наприклад "1.1.1. Нормалізація".',
    });
  }
  if (!Array.isArray(topic.questions)) {
    errors.push({
      message: `${path}: відсутній масив "questions".`,
      fix: 'Додайте "questions": [] або масив питань у цій темі.',
    });
  } else {
    topic.questions.forEach((q, qi) => {
      errors.push(...validateQuestion(q, `${path} → questions[${qi}]`));
    });
  }
  return errors;
}

function validateSubsection(sub, path) {
  const errors = [];
  if (!sub || typeof sub !== 'object') {
    errors.push({
      message: `${path}: підрозділ має бути об'єктом.`,
      fix: 'Кожен підрозділ має мати "title" та "topics".',
    });
    return errors;
  }
  if (typeof sub.title !== 'string' || !sub.title.trim()) {
    errors.push({
      message: `${path}: відсутня або порожня назва підрозділу ("title").`,
      fix: 'Додайте поле "title", наприклад "1.1. Назва підрозділу".',
    });
  }
  if (!Array.isArray(sub.topics)) {
    errors.push({
      message: `${path}: відсутній масив "topics".`,
      fix: 'Додайте "topics": [] з темами. Питання не можна класти безпосередньо в підрозділ.',
    });
  } else if (sub.topics.length === 0) {
    errors.push({
      message: `${path}: підрозділ не містить жодної теми.`,
      fix: 'Додайте хоча б одну тему в "topics", навіть якщо "questions" поки порожній.',
    });
  } else {
    sub.topics.forEach((top, ti) => {
      errors.push(...validateTopic(top, `${path} → topics[${ti}]`));
    });
  }
  return errors;
}

function validateSection(sec, path) {
  const errors = [];
  if (!sec || typeof sec !== 'object') {
    errors.push({
      message: `${path}: розділ має бути об'єктом.`,
      fix: 'Кожен розділ має мати "title" та "subsections".',
    });
    return errors;
  }
  if (typeof sec.title !== 'string' || !sec.title.trim()) {
    errors.push({
      message: `${path}: відсутня або порожня назва розділу ("title").`,
      fix: 'Додайте поле "title", наприклад "РОЗДІЛ 1. НАЗВА".',
    });
  }
  if (!Array.isArray(sec.subsections)) {
    errors.push({
      message: `${path}: відсутній масив "subsections".`,
      fix: 'Додайте "subsections": []. Не пропускайте рівень підрозділу між розділом і темами.',
    });
  } else if (sec.subsections.length === 0) {
    errors.push({
      message: `${path}: розділ не містить жодного підрозділу.`,
      fix: 'Додайте хоча б один підрозділ у "subsections".',
    });
  } else {
    sec.subsections.forEach((sub, si) => {
      errors.push(...validateSubsection(sub, `${path} → subsections[${si}]`));
    });
  }
  return errors;
}

/**
 * Parse and validate full database JSON for import.
 * @returns {{ ok: true, data: object } | { ok: false, errors: Array<{message: string, fix: string}> }}
 */
export function validateDbImportJson(text) {
  if (!text || !text.trim()) {
    return {
      ok: false,
      errors: [{
        message: 'Поле JSON порожнє.',
        fix: 'Вставте повний JSON бази даних у текстове поле.',
      }],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const hint = err.message.includes('position')
      ? ' Перевірте коми, лапки та дужки навколо зазначеної позиції.'
      : '';
    return {
      ok: false,
      errors: [{
        message: `Невалідний JSON: ${err.message}.${hint}`,
        fix: 'Перевірте синтаксис у JSON-редакторі (jsonlint.com) або скопіюйте валідний експорт з «Експорт».',
      }],
    };
  }

  if (parsed === null || typeof parsed !== 'object') {
    return {
      ok: false,
      errors: [{
        message: 'Кореневий елемент має бути масивом розділів або об\'єктом з полем "sections".',
        fix: `Очікуваний формат:\n${FULL_DB_EXAMPLE}`,
      }],
    };
  }

  if (Array.isArray(parsed) && isQuestionArray(parsed)) {
    return {
      ok: false,
      errors: [{
        message: 'Це масив окремих питань, а не повна база даних.',
        fix: 'Для додавання питань використовуйте «Додати питання» → «Масове» або «Мульти-імпорт». Для нової бази потрібна ієрархія: розділ → підрозділ → тема → questions.',
      }, {
        message: 'Приклад правильної структури нової бази:',
        fix: FULL_DB_EXAMPLE,
      }],
    };
  }

  if (!Array.isArray(parsed) && !Array.isArray(parsed.sections)) {
    return {
      ok: false,
      errors: [{
        message: 'Невідомий формат кореневого елемента.',
        fix: 'Використовуйте масив розділів [...] або об\'єкт { "originDocs": "...", "sections": [...] }.',
      }],
    };
  }

  const data = normalizeDbData(parsed);
  const errors = [];

  if (!Array.isArray(data.sections)) {
    errors.push({
      message: 'Поле "sections" має бути масивом.',
      fix: 'Переконайтесь, що sections — це масив розділів.',
    });
  } else {
    data.sections.forEach((sec, si) => {
      errors.push(...validateSection(sec, `sections[${si}]`));
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function formatImportErrorsForAlert(errors) {
  return errors.map((e, i) => `${i + 1}. ${e.message}\n   Як виправити: ${e.fix}`).join('\n\n');
}

export function sanitizeDbId(name) {
  return name.trim().replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
}

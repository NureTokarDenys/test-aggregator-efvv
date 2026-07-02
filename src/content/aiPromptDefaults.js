export const AI_PROMPT_IDS = {
  MULTIIMPORT_ALL: 'multiimport-all-sections',
  SINGLE_SECTION: 'single-section-import',
  DB_CREATION: 'db-creation',
};

export const AI_GUIDE_SECTIONS = [
  {
    id: AI_PROMPT_IDS.MULTIIMPORT_ALL,
    label: 'Мульти-імпорт (усі розділи)',
    intro: 'Згенеруйте питання для всіх розділів поточної бази одним масивом мульти-імпорту. Передайте ШІ наявні питання бази, щоб уникнути дублікатів.',
    promptFile: 'multiimport-all-sections.txt',
    footer: 'Перевірте JSON, перейдіть на вкладку «База питань», оберіть будь-яку тему і через «Додати питання» вставте згенерований масив у форматі мульти-імпорту.',
  },
  {
    id: AI_PROMPT_IDS.SINGLE_SECTION,
    label: 'Імпорт в один розділ',
    intro: 'Згенеруйте питання лише для обраного розділу. Передайте ШІ наявні питання цього розділу, щоб уникнути дублікатів.',
    promptFile: 'single-section-import.txt',
    footer: 'Перевірте JSON (усі sec мають збігатися з обраним розділом), потім імпортуйте через «Додати питання» у форматі мульти-імпорту.',
  },
  {
    id: AI_PROMPT_IDS.DB_CREATION,
    label: 'Створення бази з нуля',
    intro: 'Підготуйте повну JSON-базу з ієрархією розділів і питань. Потрібні матеріали від користувача: originDocs (програма іспиту) та офіційні питання.',
    promptFile: 'db-creation.txt',
    footer: 'Перевірте JSON (поле originDocs має містити ваш джерельний документ). Збережіть як файл бази та імпортуйте через «Імпорт» у хедері або покладіть у src/data/databases/. Після імпорту натисніть «Зберегти».',
  },
];

export const DEFAULT_PROMPTS = {
  [AI_PROMPT_IDS.MULTIIMPORT_ALL]: `Ти — експерт зі створення тестових завдань для системи Test Aggregator.

ЗАВДАННЯ
Згенеруй рівно 100 нових питань у форматі мульти-імпорту (Частина 3 у «Questions guidelines») і розподіли їх між усіма головними розділами поточної бази.

ПРАВИЛА РОЗПОДІЛУ
• Кількість нових питань у кожному розділі має залежати від кількості вже існуючих питань у цьому розділі.
• У розділах, де зараз найменше питань, згенеруй більше нових питань.
• У розділах із найбільшою кількістю наявних питань — менше нових.
• Загальна сума по всіх розділах має дорівнювати 100 питанням.
• Розподіляй питання також між підрозділами та темами всередині кожного розділу пропорційно до їхньої тематичної ваги.

ВИМОГИ ДО ПИТАНЬ
• Кожне питання має відповідати тематиці розділу згідно з originDocs бази.
• Дотримуйся формату, полів та правил з «Questions guidelines».
• Питання мають бути різноманітними, без дублювання вже існуючих формулювань.
• Орієнтуйся на «Existing questions»: не повторюй формулювання, стиль і зміст наявних питань.
• Використовуй формат мульти-імпорту з обов'язковими полями: sec, sub, top, q, a, correct.
• Рекомендовано 4 варіанти відповідей у масиві "a".
• Поле correct — індекс правильної відповіді (0–3).

ДОДАТКОВІ МАТЕРІАЛИ (прикріплені окремо до цього промпту)
1. originDocs — джерельний документ / програма поточної бази.
   Текст починається з маркера: originDocs:
2. Questions guidelines — інструкція з форматування JSON та імпорту питань.
   Текст починається з маркера: Questions guidelines:
3. Existing questions — усі наявні питання поточної бази у форматі мульти-імпорту.
   Використовуй їх як еталон і для уникнення дублікатів.
   Текст починається з маркера: Existing questions:

РЕЗУЛЬТАТ
Надай лише валідний JSON-масив для мульти-імпорту без пояснень поза JSON.`,

  [AI_PROMPT_IDS.SINGLE_SECTION]: `Ти — експерт зі створення тестових завдань для системи Test Aggregator.

ЗАВДАННЯ
Згенеруй нові питання у форматі мульти-імпорту (Частина 3 у «Questions guidelines») ЛИШЕ для одного розділу поточної бази:
  • sec = {{SEC}} (індекс розділу)
  • Назва розділу: «{{SECTION_TITLE}}»

ПРАВИЛА
• У всіх об'єктах поле sec має дорівнювати {{SEC}}.
• Розподіляй питання між підрозділами (sub) та темами (top) всередині цього розділу.
• Використовуй карту індексів «Section index map» для коректних sub і top.
• Кількість питань — за запитом користувача або рівномірно по темах розділу.

ВИМОГИ ДО ПИТАНЬ
• Дотримуйся формату, полів та правил з «Questions guidelines».
• Орієнтуйся на «Existing questions»: не повторюй формулювання наявних питань цього розділу.
• Використовуй формат мульти-імпорту з обов'язковими полями: sec, sub, top, q, a, correct.
• Рекомендовано 4 варіанти відповідей у масиві "a".
• Поле correct — індекс правильної відповіді (0–3).

ДОДАТКОВІ МАТЕРІАЛИ (прикріплені окремо до цього промпту)
1. Section index map — індекси sub/top для обраного розділу.
   Текст починається з маркера: Section index map:
2. Questions guidelines — інструкція з форматування JSON та імпорту питань.
   Текст починається з маркера: Questions guidelines:
3. Existing questions — наявні питання обраного розділу (sec = {{SEC}}) у форматі мульти-імпорту.
   Використовуй їх як еталон і для уникнення дублікатів.
   Текст починається з маркера: Existing questions:

РЕЗУЛЬТАТ
Надай лише валідний JSON-масив для мульти-імпорту без пояснень поза JSON. Усі sec = {{SEC}}.`,

  [AI_PROMPT_IDS.DB_CREATION]: `Ти — експерт зі створення баз тестових питань для системи Test Aggregator.

ЗАВДАННЯ
На основі наданих матеріалів створи повну JSON-базу питань, готову до імпорту в систему.

ПРАВИЛА
• Кореневий елемент — JSON-об'єкт з полями originDocs та sections.
• Поле originDocs — скопіюй без змін текст із матеріалу «originDocs», наданого користувачем.
• Ієрархія в sections: section → subsection → topic → questions.
• Кожен вузол має title; розділи мають subsections, підрозділи — topics, теми — questions.
• Офіційні питання з матеріалу «Official questions» включай зі status: "official", зберігаючи формулювання.
• Генеруй додаткові питання за потреби, доповнюючи офіційні.
• Питання мають поля q, a (4 варіанти), correct (0–3).
• Зберігай оригінальну нумерацію з програми, якщо вона є.

ДОДАТКОВІ МАТЕРІАЛИ (прикріплені окремо до цього промпту)
1. Database creation guidelines — структура бази, приклади, карта індексів, чеклист.
   Текст починається з маркера: Database creation guidelines:
2. originDocs — офіційна програма або джерельний документ від користувача.
   Текст починається з маркера: originDocs:
3. Official questions — офіційні питання від користувача.
   Текст починається з маркера: Official questions:

РЕЗУЛЬТАТ
Надай лише валідний JSON-об'єкт бази (originDocs, sections) без пояснень поза JSON.`,
};

export function getDefaultPrompt(id) {
  return DEFAULT_PROMPTS[id] || '';
}

export function getPromptFileName(id) {
  const section = AI_GUIDE_SECTIONS.find((s) => s.id === id);
  return section?.promptFile || `${id}.txt`;
}

export function applyPromptTemplate(template, vars = {}) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.split(`{{${key}}}`).join(String(value ?? '')),
    template
  );
}

export const EXISTING_QUESTIONS_MARKER = 'Existing questions:\n';
export const ORIGIN_DOCS_MARKER = 'originDocs:\n';
export const OFFICIAL_QUESTIONS_MARKER = 'Official questions:\n';
export const SECTION_INDEX_MAP_MARKER = 'Section index map:\n';

export function formatExistingQuestionsCopy(sections, secIdx = null) {
  const items = [];
  (sections || []).forEach((sec, si) => {
    if (secIdx !== null && si !== secIdx) return;
    (sec.subsections || []).forEach((sub, sj) => {
      (sub.topics || []).forEach((top, tk) => {
        (top.questions || []).forEach((q) => {
          const item = {
            sec: si,
            sub: sj,
            top: tk,
            q: q.q,
            a: q.a,
            correct: q.correct,
          };
          if (q.status) item.status = q.status;
          items.push(item);
        });
      });
    });
  });
  return `${EXISTING_QUESTIONS_MARKER}${JSON.stringify(items, null, 2)}`;
}

export function countSectionQuestions(sections, secIdx = null) {
  let total = 0;
  (sections || []).forEach((sec, si) => {
    if (secIdx !== null && si !== secIdx) return;
    (sec.subsections || []).forEach((sub) => {
      (sub.topics || []).forEach((top) => {
        total += top.questions?.length || 0;
      });
    });
  });
  return total;
}

export function formatOriginDocsCopy(originDocs) {
  return `${ORIGIN_DOCS_MARKER}${originDocs || ''}`;
}

export function formatSectionIndexMap(sections, secIdx = null) {
  const lines = [];
  (sections || []).forEach((sec, si) => {
    if (secIdx !== null && si !== secIdx) return;
    lines.push(`[sec: ${si}] ${sec.title || ''}`);
    (sec.subsections || []).forEach((sub, sj) => {
      lines.push(`  [sub: ${sj}] ${sub.title || ''}`);
      (sub.topics || []).forEach((top, tk) => {
        lines.push(`    [top: ${tk}] ${top.title || ''}`);
      });
    });
  });
  return `${SECTION_INDEX_MAP_MARKER}${lines.join('\n')}`;
}

const COPY_STEP_DIVIDER = `${'═'.repeat(44)}\n`;

export function formatAllStepsCopy(steps) {
  return steps.map(({ stepNum, title, text }) => (
    `${COPY_STEP_DIVIDER}КРОК ${stepNum} — ${title}\n${COPY_STEP_DIVIDER}\n${text}`
  )).join('\n');
}

import {
  DEFAULT_PROMPTS,
  AI_PROMPT_IDS,
  getDefaultPrompt,
} from './aiPromptDefaults';

export { DEFAULT_PROMPTS, AI_PROMPT_IDS, getDefaultPrompt };

export const DEFAULT_AI_GENERATION_PROMPT = DEFAULT_PROMPTS[AI_PROMPT_IDS.MULTIIMPORT_ALL];

/** @deprecated Use DEFAULT_AI_GENERATION_PROMPT or getDefaultPrompt */
export const AI_GENERATION_PROMPT = DEFAULT_AI_GENERATION_PROMPT;

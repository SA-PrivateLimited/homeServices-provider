import type {QuestionnaireItem} from '../services/api/serviceCategoriesApi';

export type RequirementRow = {
  label: string;
  value: string;
};

type I18nLike = {
  language?: string;
  t: (key: string) => string;
};

function getI18n(): I18nLike {
  // Lazy require breaks Metro cycle with src/i18n/index.ts
  return require('../i18n').default as I18nLike;
}

function appLang(): 'hi' | 'en' {
  return getI18n().language?.startsWith('hi') ? 'hi' : 'en';
}

function questionLabel(q: QuestionnaireItem, lang: 'hi' | 'en'): string {
  if (lang === 'hi' && q.questionHi) return q.questionHi;
  return q.question;
}

function optionLabel(
  q: QuestionnaireItem & {optionsHi?: string[]},
  option: string,
  index: number,
  lang: 'hi' | 'en',
): string {
  if (lang === 'hi' && q.optionsHi?.[index]) return q.optionsHi[index];
  return option;
}

function formatAnswer(
  q: QuestionnaireItem & {optionsHi?: string[]},
  answer: unknown,
  lang: 'hi' | 'en',
): string {
  if (typeof answer === 'boolean') {
    return answer ? getI18n().t('jobDetail.yes') : getI18n().t('jobDetail.no');
  }
  if (Array.isArray(answer)) {
    return answer
      .map(item => {
        const idx = (q.options || []).indexOf(String(item));
        return idx >= 0 ? optionLabel(q, String(item), idx, lang) : String(item);
      })
      .join(', ');
  }
  if (answer === null || answer === undefined || answer === '') {
    return getI18n().t('jobDetail.notProvided');
  }
  const text = String(answer);
  if (q.type === 'boolean') {
    const lower = text.toLowerCase();
    if (lower === 'true' || lower === 'yes') return getI18n().t('jobDetail.yes');
    if (lower === 'false' || lower === 'no') return getI18n().t('jobDetail.no');
  }
  if (q.options?.length) {
    const idx = q.options.indexOf(text);
    if (idx >= 0) return optionLabel(q, text, idx, lang);
  }
  return text;
}

/** Map questionnaire answers to readable label/value rows. */
export function formatJobRequirements(
  answers: Record<string, unknown> | undefined,
  questionnaire: QuestionnaireItem[] | undefined,
  serviceType?: string,
): RequirementRow[] {
  if (!answers || !Object.keys(answers).length) return [];
  const lang = appLang();
  const byId = new Map((questionnaire || []).map(q => [q.id, q]));

  return Object.entries(answers).map(([questionId, answer]) => {
    const q = byId.get(questionId);
    if (q) {
      return {
        label: questionLabel(q, lang),
        value: formatAnswer(q, answer, lang),
      };
    }
    return {
      label: humanizeQuestionId(questionId, serviceType),
      value: formatAnswer(
        {id: questionId, question: questionId, type: 'text'},
        answer,
        lang,
      ),
    };
  });
}

function humanizeQuestionId(id: string, serviceType?: string): string {
  const stripped = id
    .replace(/^q_/, '')
    .replace(/_/g, ' ')
    .replace(/\d+$/, '')
    .trim();
  if (
    serviceType &&
    stripped.toLowerCase().startsWith(serviceType.toLowerCase())
  ) {
    return stripped.slice(serviceType.length).trim() || stripped;
  }
  return stripped.replace(/\b\w/g, c => c.toUpperCase());
}

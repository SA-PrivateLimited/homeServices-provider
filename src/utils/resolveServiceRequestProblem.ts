import {formatJobRequirements} from './formatJobRequirements';
import type {QuestionnaireItem} from '../services/api/serviceCategoriesApi';

function firstRawAnswer(
  answers?: Record<string, unknown>,
): string {
  if (!answers) return '';
  for (const value of Object.values(answers)) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) {
      return value.map(String).filter(Boolean).join(', ');
    }
  }
  return '';
}

/** Human-readable problem for cards — uses free text, then questionnaire answers. */
export function resolveServiceRequestProblemText(
  request: {
    problem?: string;
    questionnaireAnswers?: Record<string, unknown>;
    serviceType?: string;
  },
  questionnaire?: QuestionnaireItem[],
): string {
  const direct = String(request.problem || '').trim();
  if (direct) return direct;

  const rows = formatJobRequirements(
    request.questionnaireAnswers,
    questionnaire,
    request.serviceType,
  );
  if (rows.length) {
    const i18n = require('../i18n').default as {t: (k: string) => string};
    const notProvided = i18n.t('jobDetail.notProvided');
    const values = rows
      .map((row) => row.value.trim())
      .filter((value) => value && value !== notProvided);
    if (values.length) return values.join(' · ');
  }

  return firstRawAnswer(request.questionnaireAnswers);
}

import {isTechnicalErrorText} from '../src/utils/userFacingError';

describe('isTechnicalErrorText', () => {
  it('rejects HTTP jargon', () => {
    expect(isTechnicalErrorText('Forbidden')).toBe(true);
    expect(isTechnicalErrorText('AxiosError')).toBe(true);
    expect(isTechnicalErrorText('Network Error')).toBe(true);
    expect(isTechnicalErrorText('500 Internal Server Error')).toBe(true);
    expect(isTechnicalErrorText('HTTP 400: Bad Request')).toBe(true);
  });

  it('allows product copy', () => {
    expect(
      isTechnicalErrorText('Enter the 4-digit PIN from the customer'),
    ).toBe(false);
  });
});

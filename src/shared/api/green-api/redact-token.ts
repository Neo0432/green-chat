const REDACTED = '***';

export const redactToken = (text: string, token: string) => {
  if (token === '') {
    return text;
  }

  return text.replaceAll(token, REDACTED).replaceAll(encodeURIComponent(token), REDACTED);
};

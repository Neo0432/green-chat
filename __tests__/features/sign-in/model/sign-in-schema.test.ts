import { signInSchema } from '@features/sign-in/model/sign-in-schema';

const VALID = { idInstance: '4100000001', apiTokenInstance: 'mock-token', apiUrl: '' };

const getIssues = (input: unknown) => {
  const result = signInSchema.safeParse(input);

  return result.success ? [] : result.error.issues.map(({ path, message }) => [path.join('.'), message]);
};

describe('signInSchema', () => {
  it('trims the fields and derives the API URL from the Instance ID when it is empty', () => {
    expect(signInSchema.parse({ idInstance: ' 4100000001 ', apiTokenInstance: 'mock-token\n', apiUrl: '  ' })).toEqual({
      idInstance: '4100000001',
      apiTokenInstance: 'mock-token',
      apiUrl: 'https://4100.api.green-api.com',
    });
  });

  it('normalizes a given API URL', () => {
    expect(signInSchema.parse({ ...VALID, apiUrl: ' https://7103.api.green-api.com// ' }).apiUrl).toBe(
      'https://7103.api.green-api.com',
    );
  });

  it('requires an Instance ID of 4-20 digits', () => {
    expect(getIssues({ ...VALID, idInstance: ' ' })[0]).toEqual(['idInstance', 'Enter the Instance ID']);
    expect(getIssues({ ...VALID, idInstance: '41ab' })).toEqual([['idInstance', 'Digits only, 4–20 characters']]);
    expect(getIssues({ ...VALID, idInstance: '410' })).toEqual([['idInstance', 'Digits only, 4–20 characters']]);
    expect(signInSchema.safeParse({ ...VALID, idInstance: '4'.repeat(20) }).success).toBe(true);
    expect(getIssues({ ...VALID, idInstance: '4'.repeat(21) })).toHaveLength(1);
  });

  it('requires a token without whitespace inside', () => {
    expect(getIssues({ ...VALID, apiTokenInstance: ' \n' })[0]).toEqual(['apiTokenInstance', 'Enter the API token']);
    expect(getIssues({ ...VALID, apiTokenInstance: 'mock token' })).toEqual([
      ['apiTokenInstance', "The token can't contain spaces"],
    ]);
  });

  it('rejects an API URL that is not https:// (http://localhost is fine) or has the instance path pasted in', () => {
    expect(getIssues({ ...VALID, apiUrl: 'example.com' })).toEqual([['apiUrl', 'Enter a valid https:// URL']]);
    expect(getIssues({ ...VALID, apiUrl: 'https://4100.api.green-api.com/waInstance4100000001/' })).toEqual([
      ['apiUrl', 'Enter only the host, e.g. https://4100.api.green-api.com'],
    ]);
    expect(signInSchema.safeParse({ ...VALID, apiUrl: 'http://localhost:3000/green-api' }).success).toBe(true);
  });

  it('reports the errors of all the fields at once', () => {
    expect(getIssues({ idInstance: 'abc', apiTokenInstance: '', apiUrl: 'nope' }).map(([path]) => path)).toEqual([
      'idInstance',
      'apiTokenInstance',
      'apiTokenInstance',
      'apiUrl',
    ]);
  });
});

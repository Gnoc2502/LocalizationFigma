import { normalize } from './utils';

describe('normalize', () => {
  it('should trim leading and trailing spaces', () => {
    expect(normalize('  hello world  ')).toBe('hello world');
  });

  it('should replace multiple spaces with a single space', () => {
    expect(normalize('hello   world')).toBe('hello world');
  });

  it('should handle newlines and tabs', () => {
    expect(normalize('hello\tworld\n!')).toBe('hello world !');
  });

  it('should return empty string for string with only spaces', () => {
    expect(normalize('   ')).toBe('');
  });

  it('should return original string if it is already normalized', () => {
    expect(normalize('hello world')).toBe('hello world');
  });
});

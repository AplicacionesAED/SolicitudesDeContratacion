import { generatePassword } from '../password';

describe('generatePassword', () => {
  it('returns a string of length 10', () => {
    expect(generatePassword()).toHaveLength(10);
  });

  it('contains at least one uppercase letter', () => {
    expect(/[A-Z]/.test(generatePassword())).toBe(true);
  });

  it('contains at least one lowercase letter', () => {
    expect(/[a-z]/.test(generatePassword())).toBe(true);
  });

  it('contains at least one digit', () => {
    expect(/[0-9]/.test(generatePassword())).toBe(true);
  });

  it('contains at least one special character', () => {
    expect(/[!@#$%]/.test(generatePassword())).toBe(true);
  });

  it('generates unique passwords across multiple calls', () => {
    const passwords = Array.from({ length: 20 }, generatePassword);
    expect(new Set(passwords).size).toBeGreaterThan(1);
  });
});

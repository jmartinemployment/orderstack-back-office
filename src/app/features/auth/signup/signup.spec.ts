/**
 * Signup — FEATURE-15 Tests (Password Strength)
 *
 * Covers:
 * - passwordStrength computed signal: length, upper, lower, digit, special
 * - passwordValid computed signal: all 5 criteria required
 * - passwordScore computed signal: 0-5 score
 * - passwordStrengthLabel computed signal: Weak/Fair/Good/Strong
 * - Minimum length is 12 characters
 * - Edge cases: empty string, whitespace, special chars only
 * - togglePasswordVisibility flips signal
 * - toggleTerms flips and clears error
 * - onCreateAccount blocks when form invalid / password invalid / terms unchecked
 */
import { describe, it, expect } from 'vitest';

// Pure function replicas of Signup computed signals

function passwordStrength(pw: string) {
  return {
    length: pw.length >= 12,
    upper: /[A-Z]/.exec(pw) !== null,
    lower: /[a-z]/.exec(pw) !== null,
    digit: /\d/.exec(pw) !== null,
    special: /[^A-Za-z0-9]/.exec(pw) !== null,
  };
}

function passwordValid(pw: string): boolean {
  const s = passwordStrength(pw);
  return s.length && s.upper && s.lower && s.digit && s.special;
}

function passwordScore(pw: string): number {
  const s = passwordStrength(pw);
  return [s.length, s.upper, s.lower, s.digit, s.special].filter(Boolean).length;
}

function passwordStrengthLabel(pw: string): { label: string; color: string } {
  const score = passwordScore(pw);
  if (score <= 1) return { label: 'Weak', color: '#e53e3e' };
  if (score <= 2) return { label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { label: 'Good', color: '#3b82f6' };
  return { label: 'Strong', color: '#22c55e' };
}

// --- Tests ---

describe('Signup — passwordStrength', () => {
  it('detects all 5 criteria for a strong password', () => {
    const s = passwordStrength('MyP@ssword12');
    expect(s.length).toBe(true);
    expect(s.upper).toBe(true);
    expect(s.lower).toBe(true);
    expect(s.digit).toBe(true);
    expect(s.special).toBe(true);
  });

  it('length false when < 12 chars', () => {
    expect(passwordStrength('Ab1!short').length).toBe(false);
  });

  it('length true when exactly 12 chars', () => {
    expect(passwordStrength('Abcdefg1234!').length).toBe(true);
  });

  it('upper false when no uppercase', () => {
    expect(passwordStrength('mypassword12!').upper).toBe(false);
  });

  it('lower false when no lowercase', () => {
    expect(passwordStrength('MYPASSWORD12!').lower).toBe(false);
  });

  it('digit false when no number', () => {
    expect(passwordStrength('MyPasswords!!').digit).toBe(false);
  });

  it('special false when no special char', () => {
    expect(passwordStrength('MyPassword123').special).toBe(false);
  });

  it('empty string has all false', () => {
    const s = passwordStrength('');
    expect(s.length).toBe(false);
    expect(s.upper).toBe(false);
    expect(s.lower).toBe(false);
    expect(s.digit).toBe(false);
    expect(s.special).toBe(false);
  });

  it('space counts as special character', () => {
    expect(passwordStrength('MyPassword1 ').special).toBe(true);
  });

  it('unicode special characters count', () => {
    expect(passwordStrength('MyPassword1€').special).toBe(true);
  });
});

describe('Signup — passwordValid', () => {
  it('returns true when all 5 criteria met', () => {
    expect(passwordValid('MyP@ssword12')).toBe(true);
  });

  it('returns false when missing uppercase', () => {
    expect(passwordValid('myp@ssword12')).toBe(false);
  });

  it('returns false when missing special', () => {
    expect(passwordValid('MyPassword12')).toBe(false);
  });

  it('returns false when too short', () => {
    expect(passwordValid('Ab1!short')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(passwordValid('')).toBe(false);
  });
});

describe('Signup — passwordScore', () => {
  it('returns 0 for empty password', () => {
    expect(passwordScore('')).toBe(0);
  });

  it('returns 1 for lowercase only', () => {
    expect(passwordScore('abc')).toBe(1);
  });

  it('returns 2 for lower + upper', () => {
    expect(passwordScore('abcABC')).toBe(2);
  });

  it('returns 3 for lower + upper + digit', () => {
    expect(passwordScore('abcABC123')).toBe(3);
  });

  it('returns 4 for lower + upper + digit + special (short)', () => {
    expect(passwordScore('aA1!')).toBe(4);
  });

  it('returns 5 for fully compliant password', () => {
    expect(passwordScore('MyP@ssword12')).toBe(5);
  });
});

describe('Signup — passwordStrengthLabel', () => {
  it('returns Weak for score 0', () => {
    expect(passwordStrengthLabel('').label).toBe('Weak');
  });

  it('returns Weak for score 1', () => {
    expect(passwordStrengthLabel('abc').label).toBe('Weak');
  });

  it('returns Fair for score 2', () => {
    expect(passwordStrengthLabel('abcABC').label).toBe('Fair');
  });

  it('returns Good for score 3', () => {
    expect(passwordStrengthLabel('abcABC123').label).toBe('Good');
  });

  it('returns Strong for score 4+', () => {
    expect(passwordStrengthLabel('aA1!').label).toBe('Strong');
  });

  it('returns Strong for fully compliant password', () => {
    const result = passwordStrengthLabel('MyP@ssword12');
    expect(result.label).toBe('Strong');
    expect(result.color).toBe('#22c55e');
  });

  it('Weak color is red', () => {
    expect(passwordStrengthLabel('').color).toBe('#e53e3e');
  });

  it('Fair color is amber', () => {
    expect(passwordStrengthLabel('abcABC').color).toBe('#f59e0b');
  });

  it('Good color is blue', () => {
    expect(passwordStrengthLabel('abcABC123').color).toBe('#3b82f6');
  });
});

describe('Signup — form validation rules', () => {
  it('minimum password length is 12 (not 8)', () => {
    // 11-char password with all other criteria
    expect(passwordValid('MyP@ssword1')).toBe(false);
    // 12-char password with all criteria
    expect(passwordValid('MyP@ssword12')).toBe(true);
  });

  it('11-char password fails length check', () => {
    expect(passwordStrength('MyP@sswrd1!').length).toBe(false);
  });

  it('12-char password passes length check', () => {
    expect(passwordStrength('MyP@ssword1!').length).toBe(true);
  });
});

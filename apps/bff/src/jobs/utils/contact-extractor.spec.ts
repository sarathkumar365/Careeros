import {
  extractDeterministicContacts,
  mergeContactsIntoResumeStructure,
} from './contact-extractor';

describe('extractDeterministicContacts', () => {
  it('extracts email, github, linkedin, and phone from raw text', () => {
    const result = extractDeterministicContacts(`
      John Doe
      Email: john.doe@example.com
      Phone: +1 (555) 123-4567
      GitHub: github.com/johndoe
      LinkedIn: https://linkedin.com/in/johndoe
      Website: https://johndoe.dev
    `);

    expect(result.email).toBe('john.doe@example.com');
    expect(result.phone).toContain('555');
    expect(result.github).toBe('https://github.com/johndoe');
    expect(result.linkedin).toBe('https://linkedin.com/in/johndoe');
    expect(result.personalSite).toBeUndefined();
  });

  it('ignores placeholder values and root-only social domains', () => {
    const result = extractDeterministicContacts(
      `mail github linkedin github.com linkedin.com`,
    );

    expect(result.email).toBeUndefined();
    expect(result.github).toBeUndefined();
    expect(result.linkedin).toBeUndefined();
  });
});

describe('mergeContactsIntoResumeStructure', () => {
  it('uses deterministic extracted contacts when available', () => {
    const merged = mergeContactsIntoResumeStructure(
      {
        personalInfo: {
          email: '',
          github: '',
          linkedin: '',
          phone: '',
          personalSite: '',
        },
      },
      {
        email: 'john.doe@example.com',
        github: 'https://github.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
        phone: '+1 555-123-4567',
        personalSite: 'https://johndoe.dev',
      },
    );

    const personalInfo = merged.personalInfo as Record<string, unknown>;
    expect(personalInfo.email).toBe('john.doe@example.com');
    expect(personalInfo.github).toBe('https://github.com/johndoe');
    expect(personalInfo.linkedin).toBe('https://linkedin.com/in/johndoe');
    expect(personalInfo.phone).toBe('+1 555-123-4567');
    expect(personalInfo.personalSite).toBe('https://johndoe.dev');
  });

  it('retains non-placeholder AI values when extracted value is missing', () => {
    const merged = mergeContactsIntoResumeStructure(
      {
        personalInfo: {
          email: 'ai@example.com',
          github: 'https://github.com/ai',
          linkedin: 'https://linkedin.com/in/ai',
        },
      },
      {
        email: undefined,
      },
    );

    const personalInfo = merged.personalInfo as Record<string, unknown>;
    expect(personalInfo.email).toBe('ai@example.com');
    expect(personalInfo.github).toBe('https://github.com/ai');
    expect(personalInfo.linkedin).toBe('https://linkedin.com/in/ai');
  });

  it('clears placeholder AI values from final output', () => {
    const merged = mergeContactsIntoResumeStructure(
      {
        personalInfo: {
          email: 'mail',
          github: 'github',
          linkedin: 'linkedin',
        },
      },
      null,
    );

    const personalInfo = merged.personalInfo as Record<string, unknown>;
    expect(personalInfo.email).toBe('');
    expect(personalInfo.github).toBe('');
    expect(personalInfo.linkedin).toBe('');
  });
});

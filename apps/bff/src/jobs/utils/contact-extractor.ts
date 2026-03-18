export interface ExtractedContacts {
  email?: string;
  github?: string;
  linkedin?: string;
  personalSite?: string;
  phone?: string;
  source: 'raw_resume_content';
  extractedAt: string;
}

const PLACEHOLDERS = new Set([
  '',
  'mail',
  'email',
  'github',
  'linkedin',
  'github.com',
  'linkedin.com',
  'n/a',
  'na',
  'none',
  'null',
]);

function normalizeSpace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function sanitizeValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = normalizeSpace(value);
  if (PLACEHOLDERS.has(normalized.toLowerCase())) {
    return undefined;
  }
  return normalized;
}

function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim().replace(/[),.;]+$/g, '');
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^www\./i, '')}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

function pickEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return sanitizeValue(match?.[0]);
}

function pickPhone(text: string): string | undefined {
  const match = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/,
  );
  return sanitizeValue(match?.[0]);
}

function collectUrls(text: string): Array<string> {
  const urlRegex =
    /(?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[\w\-./?%&=+#]*)?/gi;
  const matches: Array<string> = [];
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const value = match[0];
    const charBefore = match.index > 0 ? text[match.index - 1] : '';
    const nextIndex = match.index + value.length;
    const charAfter = nextIndex < text.length ? text[nextIndex] : '';
    if (charBefore === '@' || charAfter === '@' || value.includes('@')) {
      continue;
    }
    matches.push(value);
  }

  const normalized = matches
    .map((value) => normalizeUrl(value))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
}

function pickGithub(urls: Array<string>): string | undefined {
  const hit = urls.find((url) => /github\.com\/.+/i.test(url));
  return sanitizeValue(hit);
}

function pickLinkedin(urls: Array<string>): string | undefined {
  const hit = urls.find((url) =>
    /linkedin\.com\/(in|pub|company)\/.+/i.test(url),
  );
  return sanitizeValue(hit);
}

export function extractDeterministicContacts(
  rawResumeContent: string,
): ExtractedContacts {
  const text = normalizeSpace(rawResumeContent || '');
  const urls = collectUrls(text);

  const github = pickGithub(urls);
  const linkedin = pickLinkedin(urls);

  return {
    email: pickEmail(text),
    phone: pickPhone(text),
    github,
    linkedin,
    source: 'raw_resume_content',
    extractedAt: new Date().toISOString(),
  };
}

export function mergeContactsIntoResumeStructure(
  resumeStructure: Record<string, unknown>,
  extractedContacts?: Partial<ExtractedContacts> | null,
): Record<string, unknown> {
  const safeResume =
    resumeStructure && typeof resumeStructure === 'object'
      ? resumeStructure
      : {};

  const personalInfoRaw =
    safeResume.personalInfo && typeof safeResume.personalInfo === 'object'
      ? (safeResume.personalInfo as Record<string, unknown>)
      : {};

  const nextPersonalInfo: Record<string, unknown> = {
    ...personalInfoRaw,
  };

  type ContactField =
    | 'email'
    | 'github'
    | 'linkedin'
    | 'personalSite'
    | 'phone';
  const mappings: Array<[ContactField, ContactField]> = [
    ['email', 'email'],
    ['github', 'github'],
    ['linkedin', 'linkedin'],
    ['personalSite', 'personalSite'],
    ['phone', 'phone'],
  ];

  for (const [sourceKey, targetKey] of mappings) {
    const extractedValue = sanitizeValue(extractedContacts?.[sourceKey]);

    if (extractedValue) {
      nextPersonalInfo[targetKey] = extractedValue;
      continue;
    }

    const existingRawValue = nextPersonalInfo[targetKey];
    const existingValue =
      typeof existingRawValue === 'string'
        ? sanitizeValue(existingRawValue)
        : undefined;
    nextPersonalInfo[targetKey] = existingValue ?? '';
  }

  return {
    ...safeResume,
    personalInfo: nextPersonalInfo,
  };
}

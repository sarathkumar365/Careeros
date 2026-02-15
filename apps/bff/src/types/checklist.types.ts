/*
 * IF U CHANGE ANYTHING
 * U MIGHT HAVE TO CHANGE ACROSS STACK
 */

interface KeywordItem {
  keyword: string;
  isFulfilled: boolean;
}

/**
 * Represents a single requirement item with associated keywords and matching logic
 */
export type ChecklistRequirement = {
  /**
   * Full requirement text preserving context
   * Examples:
   * - "3+ years of experience in web development"
   * - "Proficiency in JavaScript (ES6+), HTML5, and CSS3"
   * - "Experience with React.js or Vue.js"
   */
  requirement: string;

  /**
   * Atomic keywords extracted from the requirement
   * Examples:
   * - ["JavaScript", "HTML5", "CSS3"]
   * - ["React.js", "Vue.js"]
   * - ["AWS", "Azure", "GCP"]
   */
  keywords: KeywordItem[];

  /**
   * How to evaluate keyword matching
   * - "all": Resume must contain ALL keywords (AND logic)
   * - "any": Resume must contain AT LEAST ONE keyword (OR logic)
   * Default: "all" when ambiguous
   */
  matchType: 'all' | 'any';

  /**
   * Minimum years of experience required (optional)
   * Only present when explicitly mentioned in the JD
   * Examples:
   * - "3+ years" → 3
   * - "5-7 years" → 5
   */
  yearsRequired?: number;

  /**
   * Whether requirement is fulfilled by resume
   * - false during initial JD parsing (default: not fulfilled)
   * - true/false after checklist.match analysis (LLM sets to true if found in resume)
   */
  fulfilled?: boolean;

  /**
   * TODO: ADD comment
   */
  reason: string;
};

/**
 * Parsed job description checklist structure
 * Contains categorized requirements with keywords and match logic
 */
export type Checklist = {
  /**
   * Hard Requirements: Provable, measurable qualifications
   * - Technical skills, tools, languages
   * - Degrees, certifications
   * - Years of experience
   */
  hardRequirements: ChecklistRequirement[];

  /**
   * Soft Requirements: Interpersonal and behavioral skills
   * - Communication, leadership, collaboration
   * - Problem-solving, adaptability
   * - Code quality, documentation practices
   */
  softRequirements: ChecklistRequirement[];

  /**
   * Preferred Skills: Nice-to-have qualifications
   * - Bonus technologies or tools
   * - Additional certifications
   * - Industry-specific experience
   */
  preferredSkills: ChecklistRequirement[];

  /**
   * Keywords selected by user for AI tailoring
   */
  needTailoring: string[];
};

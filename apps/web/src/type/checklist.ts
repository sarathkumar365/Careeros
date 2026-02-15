/*
 * IF U CHANGE ANYTHING
 * U MIGHT HAVE TO CHANGE ACROSS STACK
 */

// Checklist types matching BFF structure

interface KeywordItem {
  keyword: string
  isFulfilled: boolean
}

export type ChecklistRequirement = {
  requirement: string
  keywords: Array<KeywordItem>
  matchType: 'all' | 'any'
  yearsRequired?: number
  fulfilled?: boolean
  reason: string
}

export type Checklist = {
  hardRequirements: Array<ChecklistRequirement>
  softRequirements: Array<ChecklistRequirement>
  preferredSkills: Array<ChecklistRequirement>
  needTailoring: Array<string>
}

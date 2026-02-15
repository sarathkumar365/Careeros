import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Checklist, ChecklistRequirement } from '../types/checklist.types';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  // Weight multipliers for different requirement types
  private readonly HARD_REQUIREMENT_WEIGHT = 3;
  private readonly SOFT_REQUIREMENT_WEIGHT = 1;
  private readonly PREFERRED_SKILL_WEIGHT = 1;

  constructor(private readonly database: DatabaseService) {}

  /**
   * Calculate fresh score from checklist and update database
   */
  async calculateAndUpdateScore(jobId: string): Promise<number> {
    try {
      const score = await this.calculateChecklistScore(jobId);
      await this.updateScore(jobId, score);
      return score;
    } catch (error) {
      this.logger.error(`Failed to calculate score ${jobId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate score based on fulfilled flags from checklist
   */
  private async calculateChecklistScore(jobId: string): Promise<number> {
    try {
      // Fetch checklist from database
      const jobApp = await this.database.jobApplication.findUnique({
        where: { id: jobId },
        select: { checklist: true },
      });

      const checklist = jobApp?.checklist as Checklist | null;
      if (!checklist) {
        this.logger.debug(`No checklist found ${jobId}, returning 0`);
        return 0;
      }

      // Calculate weighted score from fulfilled flags
      let totalWeight = 0;
      let matchedWeight = 0;

      // Process hard requirements (weight = 3)
      const hardResults = this.scoreFulfilledRequirements(
        checklist.hardRequirements || [],
        this.HARD_REQUIREMENT_WEIGHT,
      );
      totalWeight += hardResults.totalWeight;
      matchedWeight += hardResults.matchedWeight;

      // Process soft requirements (weight = 1)
      const softResults = this.scoreFulfilledRequirements(
        checklist.softRequirements || [],
        this.SOFT_REQUIREMENT_WEIGHT,
      );
      totalWeight += softResults.totalWeight;
      matchedWeight += softResults.matchedWeight;

      // Process preferred skills (weight = 1)
      const preferredResults = this.scoreFulfilledRequirements(
        checklist.preferredSkills || [],
        this.PREFERRED_SKILL_WEIGHT,
      );
      totalWeight += preferredResults.totalWeight;
      matchedWeight += preferredResults.matchedWeight;

      // Calculate final percentage
      const score =
        totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

      this.logger.log(
        `Checklist score ${jobId}: ${score}% (matched ${matchedWeight}/${totalWeight} weighted points)`,
      );

      return Math.max(0, Math.min(100, score)); // Clamp to 0-100
    } catch (error) {
      this.logger.error(`Failed to calculate checklist score ${jobId}:`, error);
      return 0;
    }
  }

  /**
   * Score requirements based on fulfilled flags from AI analysis
   */
  private scoreFulfilledRequirements(
    requirements: ChecklistRequirement[],
    baseWeight: number,
  ): { totalWeight: number; matchedWeight: number } {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const req of requirements) {
      // Each requirement has a base weight
      totalWeight += baseWeight;

      // If fulfilled flag is true, count it as matched
      if (req.fulfilled === true) {
        matchedWeight += baseWeight;
      }
    }

    return { totalWeight, matchedWeight };
  }

  /**
   * Update score in database
   */
  private async updateScore(jobId: string, percentage: number): Promise<void> {
    try {
      await this.database.jobApplication.update({
        where: { id: jobId },
        data: { matchPercentage: percentage },
      });
    } catch (error) {
      this.logger.error(`Failed to update score ${jobId}:`, error);
    }
  }
}

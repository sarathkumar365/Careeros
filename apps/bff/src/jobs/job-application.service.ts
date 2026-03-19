import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { ScoringService } from '../scoring/scoring.service';
import { WebSocketService } from '../websocket/websocket.service';
import { WorkflowService } from '../workflow/workflow.service';
import {
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  SaveResumeDto,
  TailorResumeDto,
  RetryFailedTasksDto,
} from './dto/job-application.dto';
import { requireAccessibleJobApplication } from './utils/job-validation';
import {
  SCORE_UPDATING_COMPLETED,
  type ScoreUpdatingCompleted,
} from '../types/task.types';
import { Checklist } from 'src/types/checklist.types';
import {
  extractDeterministicContacts,
  type ExtractedContacts,
} from './utils/contact-extractor';
import type { AuthenticatedUser } from '../auth/types/auth.types';

const GLOBAL_PROFILE_ID = 'global-profile';
const GLOBAL_PROFILE_SCOPE = 'global';

@Injectable()
export class JobApplicationService {
  private readonly logger = new Logger(JobApplicationService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly scoring: ScoringService,
    private readonly websocket: WebSocketService,
    private readonly workflow: WorkflowService,
  ) {}

  async createJobApplication(
    dto: CreateJobApplicationDto,
    user: AuthenticatedUser,
  ): Promise<{
    id: string;
  }> {
    const jobId = randomUUID();
    const profile = await this.ensureGlobalProfile();
    const extractedContacts = extractDeterministicContacts(
      dto.rawResumeContent,
    );

    let company = await this.database.company.findUnique({
      where: { name: dto.companyName },
    });
    if (!company) {
      company = await this.database.company.create({
        data: { name: dto.companyName },
      });
    }

    const jobApplication = await this.database.jobApplication.create({
      data: {
        id: jobId,
        companyId: company.id,
        profileId: profile.id,
        position: dto.position,
        dueDate: new Date(dto.dueDate),
        matchPercentage: 0,
        templateId: dto.templateId,
        jobDescription: dto.jobDescription,
        extractedContacts:
          extractedContacts as unknown as Prisma.InputJsonValue,
        originalResume: dto.rawResumeContent,
        userId: user.id,
      },
    });

    // Start workflow (fire and forget)
    this.workflow
      .createApplication(jobId, {
        rawResumeContent: dto.rawResumeContent,
        jobDescription: dto.jobDescription,
        jsonSchema: dto.jsonSchema,
      })
      .catch((error: unknown) => {
        this.logger.error(`Failed to start workflow for ${jobId}`, error);
      });

    return {
      id: jobApplication.id,
    };
  }

  async getAllJobApplications(user: AuthenticatedUser): Promise<
    Array<{
      id: string;
      companyName: string;
      position: string;
      dueDate: string;
      matchPercentage: number;
      applicationStatus: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    const jobApplications = await this.database.jobApplication.findMany({
      where: user.role === 'ADMIN' ? undefined : { userId: user.id },
      include: {
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jobApplications.map((app) => ({
      id: app.id,
      companyName: app.company.name,
      position: app.position,
      dueDate: app.dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
      matchPercentage: app.matchPercentage,
      applicationStatus: app.applicationStatus,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    }));
  }

  async updateTailoredResume(
    jobId: string,
    tailoredResume: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.database.jobApplication.update({
        where: { id: jobId },
        data: { tailoredResume: tailoredResume as Prisma.InputJsonValue },
      });
      this.logger.log(`Updated tailoredResume ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to update tailoredResume ${jobId}`, error);
    }
  }

  async updateChecklist(jobId: string, checklist: Checklist): Promise<void> {
    try {
      await this.database.jobApplication.update({
        where: { id: jobId },
        data: { checklist: checklist as unknown as Prisma.InputJsonValue },
      });
      this.logger.log(`Updated checklist ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to update checklist ${jobId}`, error);
    }
  }

  async updateParsedResume(
    jobId: string,
    parsedResume: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.database.jobApplication.update({
        where: { id: jobId },
        data: { parsedResume: parsedResume as Prisma.InputJsonValue },
      });
      this.logger.log(`Updated parsedResume ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to update parsedResume ${jobId}`, error);
    }
  }

  async getExtractedContacts(
    jobId: string,
  ): Promise<Partial<ExtractedContacts> | null> {
    const job = await this.database.jobApplication.findUnique({
      where: { id: jobId },
      select: { extractedContacts: true },
    });

    if (!job?.extractedContacts || typeof job.extractedContacts !== 'object') {
      return null;
    }

    return job.extractedContacts as Partial<ExtractedContacts>;
  }

  async upsertProfileContactsByJob(
    jobId: string,
    extractedContacts: Partial<ExtractedContacts> | null,
  ): Promise<void> {
    if (!extractedContacts) {
      return;
    }

    const job = await this.database.jobApplication.findUnique({
      where: { id: jobId },
      select: { profileId: true },
    });

    if (!job?.profileId) {
      return;
    }

    const profile = await this.database.profile.findUnique({
      where: { id: job.profileId },
    });

    if (!profile) {
      return;
    }

    const updateData: Prisma.ProfileUpdateInput = {};
    const fields: Array<
      keyof Pick<
        ExtractedContacts,
        'email' | 'github' | 'linkedin' | 'personalSite' | 'phone'
      >
    > = ['email', 'github', 'linkedin', 'personalSite', 'phone'];

    for (const field of fields) {
      const extractedValue = extractedContacts[field];
      if (
        typeof extractedValue === 'string' &&
        extractedValue.trim() !== '' &&
        (profile[field] === null || profile[field] === '')
      ) {
        updateData[field] = extractedValue.trim();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return;
    }

    await this.database.profile.update({
      where: { id: profile.id },
      data: updateData,
    });
  }

  async getJobApplication(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{
    id: string;
    companyName: string;
    position: string;
    dueDate: string;
    matchPercentage: number;
    applicationStatus: string | null;
    createdAt: string;
    updatedAt: string;
    templateId: string;
    jobDescription: string;
    tailoredResume: Record<string, unknown> | null;
    originalResume: string;
    checklist: Record<string, unknown> | null;
    workflowStatus: string | null;
    failedTasks: Record<string, unknown>;
  }> {
    const jobApplication = await requireAccessibleJobApplication(
      this.database,
      id,
      user,
      {
        include: {
          company: true,
        },
      },
    );

    // Compute failedTasks from workflowSteps for backwards compatibility
    const workflowSteps = jobApplication.workflowSteps as Record<
      string,
      unknown
    >;
    const failedTasks: Record<string, unknown> = {};

    if (
      workflowSteps &&
      typeof workflowSteps === 'object' &&
      'taskStates' in workflowSteps
    ) {
      const taskStates = workflowSteps.taskStates as Record<string, unknown>;
      Object.entries(taskStates).forEach(([task, status]) => {
        if (status === 'failed') {
          failedTasks[task] = { status: 'failed' };
        }
      });
    }

    return {
      id: jobApplication.id,
      companyName: jobApplication.company.name,
      position: jobApplication.position,
      dueDate: jobApplication.dueDate.toISOString().split('T')[0],
      matchPercentage: jobApplication.matchPercentage,
      applicationStatus: jobApplication.applicationStatus,
      createdAt: jobApplication.createdAt.toISOString(),
      updatedAt: jobApplication.updatedAt.toISOString(),
      templateId: jobApplication.templateId,
      jobDescription: jobApplication.jobDescription,
      tailoredResume: jobApplication.tailoredResume as Record<
        string,
        unknown
      > | null,
      originalResume: jobApplication.originalResume,
      checklist: jobApplication.checklist as Record<string, unknown> | null,
      workflowStatus: jobApplication.workflowStatus,
      failedTasks,
    };
  }

  async deleteJobApplication(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await requireAccessibleJobApplication(this.database, id, user);
    // Delete from database (this will cascade delete if configured)
    await this.database.jobApplication.delete({
      where: { id },
    });

    this.logger.log(`delete job ${id}`);

    // How can we cancel jobs that are already being processed by the AI worker
    // when are delete an application

    return { success: true };
  }

  async updateJobApplication(
    id: string,
    dto: UpdateJobApplicationDto,
    user: AuthenticatedUser,
  ): Promise<{
    id: string;
    companyName: string;
    position: string;
    dueDate: string;
    matchPercentage: number;
  }> {
    this.logger.log(`Updating job application ${id}`, dto);

    // Find existing job application with company
    const jobApplication = await requireAccessibleJobApplication(
      this.database,
      id,
      user,
      {
        include: { company: true },
      },
    );

    // If company name is being updated, find or create the company
    let companyId = jobApplication.companyId;
    let companyName = jobApplication.company.name;

    if (dto.companyName && dto.companyName !== jobApplication.company.name) {
      let company = await this.database.company.findUnique({
        where: { name: dto.companyName },
      });

      if (!company) {
        company = await this.database.company.create({
          data: { name: dto.companyName },
        });
      }

      companyId = company.id;
      companyName = company.name;
    }

    // Build update data
    const updateData: Prisma.JobApplicationUpdateInput = {};

    if (dto.companyName) {
      updateData.company = { connect: { id: companyId } };
    }
    if (dto.position) {
      updateData.position = dto.position;
    }
    if (dto.dueDate) {
      updateData.dueDate = new Date(dto.dueDate);
    }

    // Update job application
    const updated = await this.database.jobApplication.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      companyName,
      position: updated.position,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      matchPercentage: updated.matchPercentage,
    };
  }

  async tailorResume(
    jobId: string,
    dto: TailorResumeDto,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await requireAccessibleJobApplication(this.database, jobId, user);

    await this.workflow.tailorResume(jobId, {
      checklist: dto.checklist as Checklist,
      resumeStructure: dto.resumeStructure,
      jsonSchema: dto.jsonSchema,
    });

    return { success: true };
  }

  async saveResume(
    jobId: string,
    dto: SaveResumeDto,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await requireAccessibleJobApplication(this.database, jobId, user);
    // parsedResume in database IS ALWAYS representing USER'S ORIGINAL RESUME
    //
    // USER INPUT WILL NOT UPDATE THE CHECKLIST
    // SAVE ON:
    //    - USER CLICK SAVE IN FRONTEND
    //    - DOWNLOAD PDF = SAVE + DOWNLOAD

    // Save tailored resume to database
    try {
      await this.database.jobApplication.update({
        where: { id: jobId },
        data: {
          tailoredResume: dto.resumeStructure as Prisma.InputJsonValue,
          templateId: dto.templateId,
        },
      });
      this.logger.log(`Saved tailored resume for job ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save tailored resume for ${jobId}: ${(error as Error).message}`,
        error,
      );
      return {
        success: false,
      };
    }

    // Recalculate score with updated resume and publish to job-specific WebSocket
    try {
      const score = await this.scoring.calculateAndUpdateScore(jobId);
      const scoreEvent: ScoreUpdatingCompleted = {
        type: SCORE_UPDATING_COMPLETED,
        jobId,
        timestamp: new Date().toISOString(),
        matchPercentage: score,
      };

      // Publish to job-specific WebSocket
      this.websocket.broadcast(jobId, scoreEvent);
    } catch (error) {
      this.logger.error(
        `Failed to update score ${jobId}: ${(error as Error).message}`,
        error,
      );
      // Don't fail the save operation if score update fails
    }

    return {
      success: true,
    };
  }

  async retryFailedTasks(
    jobId: string,
    dto: RetryFailedTasksDto,
    user: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    retriedTasks: string[];
  }> {
    await requireAccessibleJobApplication(this.database, jobId, user);

    const retriedTasks = await this.workflow.retryFailedTasks(
      jobId,
      dto.jsonSchema,
    );

    return {
      success: true,
      message: `Retried ${retriedTasks.length} task(s)`,
      retriedTasks,
    };
  }

  private ensureGlobalProfile(): Promise<{ id: string }> {
    return this.database.profile.upsert({
      where: { scope: GLOBAL_PROFILE_SCOPE },
      update: {},
      create: {
        id: GLOBAL_PROFILE_ID,
        scope: GLOBAL_PROFILE_SCOPE,
      },
      select: { id: true },
    });
  }
}

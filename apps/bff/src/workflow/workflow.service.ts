import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ResumeParsingTask } from '../tasks/resume-parsing.task';
import { ResumeTailoringTask } from '../tasks/resume-tailoring.task';
import { ChecklistParsingTask } from '../tasks/checklist-parsing.task';
import { ChecklistMatchingTask } from '../tasks/checklist-matching.task';
import { ScoreUpdatingTask } from '../tasks/score-updating.task';
import type { TaskBundle } from '../tasks/task-bundle';
import type {
  Task,
  TaskResult,
  TaskSuccess,
  TaskFailed,
  ResumeParsing,
  ChecklistParsing,
  ResumeTailoring,
  TaskPayload,
} from '../types/task.types';
import type { Checklist } from '../types/checklist.types';
import type { Prisma } from '@prisma/client';
import {
  RESUME_PARSING,
  RESUME_TAILORING,
  CHECKLIST_PARSING,
  CHECKLIST_MATCHING,
  SCORE_UPDATING,
} from '../types/task.types';
import type {
  Workflow,
  WorkflowName,
  WorkflowInstance,
} from './workflow.types';
import {
  CREATE_APPLICATION_WORKFLOW,
  TAILORING_WORKFLOW,
} from './workflow.types';

/**
 * Central orchestrator for workflow execution
 *
 * Each workflow has its own method (e.g., createApplication, tailorResume)
 * that explicitly starts the workflow with typed initial data.
 *
 * Design:
 * - Explicit workflow methods instead of generic start()
 * - Type-safe initial data for each workflow
 * - Tasks are self-contained bundles (enqueue or execute)
 * - Workflow state persisted to job_applications.workflowSteps field
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  // Map of task type to task bundle instance
  private readonly taskBundles = new Map<Task, TaskBundle>();

  // Map of workflow name to workflow DAG
  private readonly workflows = new Map<WorkflowName, Workflow>([
    ['create-application', CREATE_APPLICATION_WORKFLOW],
    ['tailoring', TAILORING_WORKFLOW],
  ]);

  constructor(
    private readonly database: DatabaseService,
    @Inject(forwardRef(() => ResumeParsingTask))
    private readonly resumeParsingTask: ResumeParsingTask,
    @Inject(forwardRef(() => ResumeTailoringTask))
    private readonly resumeTailoringTask: ResumeTailoringTask,
    @Inject(forwardRef(() => ChecklistParsingTask))
    private readonly checklistParsingTask: ChecklistParsingTask,
    @Inject(forwardRef(() => ChecklistMatchingTask))
    checklistMatchingTask: ChecklistMatchingTask,
    @Inject(forwardRef(() => ScoreUpdatingTask))
    scoreUpdatingTask: ScoreUpdatingTask,
  ) {
    // Build task bundle map for quick lookup
    this.taskBundles.set(RESUME_PARSING, resumeParsingTask);
    this.taskBundles.set(RESUME_TAILORING, resumeTailoringTask);
    this.taskBundles.set(CHECKLIST_PARSING, checklistParsingTask);
    this.taskBundles.set(CHECKLIST_MATCHING, checklistMatchingTask);
    this.taskBundles.set(SCORE_UPDATING, scoreUpdatingTask);
  }

  /**
   * Start CREATE_APPLICATION workflow
   *
   * Entry tasks: resume.parsing, checklist.parsing (parallel)
   * Flow: Both parsing tasks → checklist.matching → score.updating
   *
   * @param jobId - Job application ID
   * @param data - Initial data (rawResumeContent, jobDescription, jsonSchema)
   */
  async createApplication(
    jobId: string,
    data: Omit<ResumeParsing, 'jobId'> & Omit<ChecklistParsing, 'jobId'>,
  ): Promise<void> {
    const workflowName = 'create-application';
    this.logger.log(`Starting workflow ${workflowName} for ${jobId}`);

    // Initialize workflow instance
    const instance: WorkflowInstance = this.initializeWorkflow(
      jobId,
      workflowName,
      CREATE_APPLICATION_WORKFLOW,
    );

    // Start entry tasks
    try {
      await this.resumeParsingTask.start({
        jobId,
        rawResumeContent: data.rawResumeContent,
        jsonSchema: data.jsonSchema,
      });
      instance.taskStates[RESUME_PARSING] = 'running';
      this.logger.debug(`Started task ${RESUME_PARSING} for ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start task ${RESUME_PARSING} for ${jobId}: ${error}`,
      );
      instance.taskStates[RESUME_PARSING] = 'failed';
    }

    try {
      await this.checklistParsingTask.start({
        jobId,
        jobDescription: data.jobDescription,
      });
      instance.taskStates[CHECKLIST_PARSING] = 'running';
      this.logger.debug(`Started task ${CHECKLIST_PARSING} for ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start task ${CHECKLIST_PARSING} for ${jobId}: ${error}`,
      );
      instance.taskStates[CHECKLIST_PARSING] = 'failed';
    }
    await this.saveWorkflow(instance);
  }

  /**
   * Start TAILORING workflow
   *
   * Entry task: resume.tailoring
   * Flow: resume.tailoring → checklist.matching → score.updating
   *
   * @param jobId - Job application ID
   * @param data - Initial data (checklist, resumeStructure, jsonSchema)
   */
  async tailorResume(
    jobId: string,
    data: Omit<ResumeTailoring, 'jobId'>,
  ): Promise<void> {
    const workflowName = 'tailoring';
    this.logger.log(`Starting workflow ${workflowName} for ${jobId}`);

    // Initialize workflow instance
    const instance = this.initializeWorkflow(
      jobId,
      workflowName,
      TAILORING_WORKFLOW,
    );

    // Start entry task
    try {
      await this.resumeTailoringTask.start({
        jobId,
        checklist: data.checklist,
        resumeStructure: data.resumeStructure,
        jsonSchema: data.jsonSchema,
      });
      instance.taskStates[RESUME_TAILORING] = 'running';
      this.logger.debug(`Started task ${RESUME_TAILORING} for ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start task ${RESUME_TAILORING} for ${jobId}: ${error}`,
      );
      instance.taskStates[RESUME_TAILORING] = 'failed';
    }

    // Persist workflow state
    await this.saveWorkflow(instance);
  }

  /**
   * Handle task completion event (from DequeueService)
   *
   * Called when a task completes (success or failure).
   * Determines next tasks to run based on workflow DAG.
   *
   * @param event - Task completion event
   */
  async handleTaskCompletion(event: TaskResult): Promise<void> {
    const jobId = event.jobId;

    // Load workflow instance
    const instance = await this.fetchWorkflow(jobId);
    if (!instance) {
      this.logger.error(
        `No workflow found for ${jobId} when handling ${event.type}`,
      );
      return;
    }

    // Determine task type from event (extract first two parts:
    // 'resume.parsing' from 'resume.parsing.completed')
    const taskType = event.type.split('.').slice(0, 2).join('.') as Task;

    const taskBundle = this.taskBundles.get(taskType);
    if (!taskBundle) {
      this.logger.error(`Task bundle not found for ${taskType}`);
      return;
    }

    // Update task state
    const isSuccess = event.type.endsWith('.completed');
    instance.taskStates[taskType] = isSuccess ? 'completed' : 'failed';

    this.logger.debug(
      `Task ${taskType} ${isSuccess ? 'completed' : 'failed'} for ${jobId}`,
    );

    // Call task handler
    try {
      if (isSuccess) {
        await taskBundle.onSuccess(event as TaskSuccess);
      } else {
        await taskBundle.onFailed(event as TaskFailed);
      }
    } catch (error) {
      this.logger.error(
        `Task handler error for ${taskType} in ${jobId}: ${error}`,
      );
    }

    // Persist workflow state
    await this.saveWorkflow(instance);

    // If task failed, don't start dependent tasks
    if (!isSuccess) {
      this.logger.warn(`Task ${taskType} failed, not starting dependent tasks`);
      const workflow = this.workflows.get(instance.workflowName);
      if (workflow && this.isWorkflowFailed(instance, workflow)) {
        instance.status = 'failed';
        await this.saveWorkflow(instance);
      }
      return;
    }

    // Find and start ready tasks
    const workflow = this.workflows.get(instance.workflowName);
    if (!workflow) {
      this.logger.error(`Workflow not found: ${instance.workflowName}`);
      return;
    }

    await this.startReadyTasks(jobId, instance, workflow);
  }

  /**
   * Initialize a new workflow instance
   *
   * @param jobId - Job application ID
   * @param workflowName - Workflow name
   * @param workflow - Workflow DAG
   * @returns Initialized WorkflowInstance
   */
  private initializeWorkflow(
    jobId: string,
    workflowName: WorkflowName,
    workflow: Workflow,
  ): WorkflowInstance {
    const instance: WorkflowInstance = {
      jobId,
      workflowName,
      taskStates: {},
      status: 'running',
    };

    // Initialize all tasks as pending
    for (const taskType of Object.keys(workflow) as Task[]) {
      instance.taskStates[taskType] = 'pending';
    }
    return instance;
  }

  /**
   * Start tasks that are ready to run
   *
   * @param jobId - Job application ID
   * @param instance - Workflow instance
   * @param workflow - Workflow DAG
   */
  private async startReadyTasks(
    jobId: string,
    instance: WorkflowInstance,
    workflow: Workflow,
  ): Promise<void> {
    const readyTasks = this.findReadyTasks(instance, workflow);

    if (readyTasks.length === 0) {
      // Check if all tasks are completed (not just no ready tasks)
      const allTasksCompleted = Object.keys(workflow).every(
        (taskType) => instance.taskStates[taskType as Task] === 'completed',
      );

      if (allTasksCompleted) {
        // Workflow completed successfully - reset workflowSteps to {}
        this.logger.log(
          `Workflow ${instance.workflowName} completed for ${jobId}`,
        );
        await this.database.jobApplication.update({
          where: { id: jobId },
          data: {
            workflowSteps: {},
            workflowStatus: 'completed',
          },
        });
      }
      return;
    }

    // Fetch data from DB once for all ready tasks
    const jobApplication = await this.database.jobApplication.findUnique({
      where: { id: jobId },
      select: {
        checklist: true,
        parsedResume: true,
        tailoredResume: true,
      },
    });

    // Start ready tasks
    for (const taskType of readyTasks) {
      const taskBundle = this.taskBundles.get(taskType);
      if (!taskBundle) {
        this.logger.error(`Task bundle not found for ${taskType}`);
        continue;
      }

      try {
        let result: TaskSuccess | void = undefined;

        // Build payload for each task type
        if (taskType === CHECKLIST_MATCHING) {
          result = await taskBundle.start({
            jobId,
            checklist: jobApplication?.checklist as unknown as Checklist,
            resumeStructure: jobApplication?.tailoredResume as Record<
              string,
              unknown
            >,
          });
        } else if (taskType === SCORE_UPDATING) {
          result = await taskBundle.start({ jobId });
        }
        // Add more task types as needed

        // If task returned a result (BFF tasks that execute synchronously),
        // handle completion immediately instead of waiting for queue
        if (result) {
          this.logger.debug(
            `BFF task ${taskType} completed synchronously for ${jobId}`,
          );
          await this.handleTaskCompletion(result);
        } else {
          // Task was enqueued (AI tasks), mark as running
          instance.taskStates[taskType] = 'running';
          this.logger.debug(`Started task ${taskType} for ${jobId}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to start task ${taskType} for ${jobId}: ${error}`,
        );
        instance.taskStates[taskType] = 'failed';
      }
    }

    // Persist updated state
    await this.saveWorkflow(instance);
  }

  /**
   * Find tasks that are ready to run
   *
   * A task is ready when all its prerequisites are completed.
   *
   * @param instance - Workflow instance
   * @param workflow - Workflow DAG
   * @returns Array of ready task types
   */
  private findReadyTasks(
    instance: WorkflowInstance,
    workflow: Workflow,
  ): Task[] {
    const ready: Task[] = [];

    for (const [taskType, taskDep] of Object.entries(workflow)) {
      const currentState = instance.taskStates[taskType as Task];

      // Skip if already running, completed, or failed
      if (
        currentState === 'running' ||
        currentState === 'completed' ||
        currentState === 'failed'
      ) {
        continue;
      }

      // Check if all prerequisites are completed
      const allPrerequisitesCompleted = taskDep.prerequisites.every(
        (prereq) => instance.taskStates[prereq] === 'completed',
      );

      if (allPrerequisitesCompleted) {
        ready.push(taskType as Task);
      }
    }

    return ready;
  }

  /**
   * Check if workflow has failed
   *
   * @param instance - Workflow instance
   * @param workflow - Workflow DAG
   * @returns true if any task has failed
   */
  private isWorkflowFailed(
    instance: WorkflowInstance,
    workflow: Workflow,
  ): boolean {
    for (const taskType of Object.keys(workflow) as Task[]) {
      if (instance.taskStates[taskType] === 'failed') {
        return true;
      }
    }
    return false;
  }

  /**
   * Persist workflow state to database
   *
   * @param instance - Workflow instance
   */
  private async saveWorkflow(instance: WorkflowInstance): Promise<void> {
    try {
      await this.database.jobApplication.update({
        where: { id: instance.jobId },
        data: {
          workflowSteps: instance as unknown as Prisma.JsonObject,
          workflowStatus: instance.status,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist workflow state for ${instance.jobId}: ${error}`,
      );
    }
  }

  /**
   * Load workflow instance from database
   *
   * @param jobId - Job application ID
   * @returns Workflow instance or null if not found
   */
  private async fetchWorkflow(jobId: string): Promise<WorkflowInstance | null> {
    try {
      const jobApplication = await this.database.jobApplication.findUnique({
        where: { id: jobId },
        select: { workflowSteps: true },
      });

      if (!jobApplication || !jobApplication.workflowSteps) {
        return null;
      }

      return jobApplication.workflowSteps as unknown as WorkflowInstance;
    } catch (error) {
      this.logger.error(
        `Failed to load workflow instance for ${jobId}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Retry failed tasks for a job application
   *
   * Resets failed tasks to 'pending' and restarts them.
   * All failed tasks are independent (on different branches), so they can be retried in parallel.
   *
   * @param jobId - Job application ID
   * @param jsonSchema - Optional JSON schema for tasks that need it
   * @returns Array of retried task types
   */
  async retryFailedTasks(
    jobId: string,
    jsonSchema?: Record<string, unknown>,
  ): Promise<Task[]> {
    // Load workflow instance
    const instance = await this.fetchWorkflow(jobId);
    if (!instance) {
      throw new Error(`No workflow found for ${jobId}`);
    }

    // Validate workflow state
    if (instance.status === 'running') {
      throw new Error('Workflow is currently running, cannot retry');
    }

    if (instance.status === 'completed') {
      this.logger.log(
        `Workflow already completed for ${jobId}, nothing to retry`,
      );
      return [];
    }

    // Find failed tasks
    const failedTasks = Object.entries(instance.taskStates)
      .filter(([, status]) => status === 'failed')
      .map(([task]) => task as Task);

    if (failedTasks.length === 0) {
      this.logger.log(`No failed tasks to retry for ${jobId}`);
      return [];
    }

    this.logger.log(
      `Retrying ${failedTasks.length} failed task(s) for ${jobId}: ${failedTasks.join(', ')}`,
    );

    // Get workflow definition
    const workflow = this.workflows.get(instance.workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${instance.workflowName}`);
    }

    // Reset failed tasks to pending
    for (const taskType of failedTasks) {
      instance.taskStates[taskType] = 'pending';
    }
    instance.status = 'running';
    await this.saveWorkflow(instance);

    // Fetch job data needed for retry
    const job = await this.database.jobApplication.findUnique({
      where: { id: jobId },
      select: {
        originalResume: true,
        jobDescription: true,
        checklist: true,
        parsedResume: true,
        tailoredResume: true,
      },
    });

    if (!job) {
      throw new Error(`Job application not found: ${jobId}`);
    }

    // Start tasks that are ready (failed tasks with completed prerequisites)
    const retriedTasks: Task[] = [];

    for (const taskType of failedTasks) {
      const taskDep = workflow[taskType];
      if (!taskDep) {
        this.logger.error(`Task ${taskType} not found in workflow definition`);
        continue;
      }

      const allPrerequisitesCompleted = taskDep.prerequisites.every(
        (prereq) => instance.taskStates[prereq] === 'completed',
      );

      if (!allPrerequisitesCompleted) {
        // Will be started automatically when prerequisites complete
        this.logger.debug(
          `Task ${taskType} has incomplete prerequisites, will retry after they complete`,
        );
        continue;
      }

      // Build payload based on task type
      const payload: TaskPayload = this.buildRetryPayload(
        taskType,
        jobId,
        job,
        jsonSchema,
      );

      const taskBundle = this.taskBundles.get(taskType);
      if (!taskBundle) {
        this.logger.error(`Task bundle not found for ${taskType}`);
        continue;
      }

      try {
        const result = await taskBundle.start(payload);

        if (result) {
          // BFF task (synchronous)
          await this.handleTaskCompletion(result);
        } else {
          // AI task (enqueued)
          instance.taskStates[taskType] = 'running';
        }

        retriedTasks.push(taskType);
        this.logger.log(`Retried task ${taskType} for ${jobId}`);
      } catch (error) {
        this.logger.error(`Failed to retry task ${taskType}: ${error}`);
        instance.taskStates[taskType] = 'failed';
      }
    }

    await this.saveWorkflow(instance);
    return retriedTasks;
  }

  /**
   * Build payload for retrying a specific task type
   *
   * @param taskType - Task type
   * @param jobId - Job application ID
   * @param job - Job application data from database
   * @param jsonSchema - Optional JSON schema
   * @returns Task payload
   */
  private buildRetryPayload(
    taskType: Task,
    jobId: string,
    job: {
      originalResume: string;
      jobDescription: string;
      checklist: Prisma.JsonValue | null;
      parsedResume: Prisma.JsonValue | null;
      tailoredResume: Prisma.JsonValue | null;
    },
    jsonSchema?: Record<string, unknown>,
  ): TaskPayload {
    switch (taskType) {
      case RESUME_PARSING:
        if (!job.originalResume) {
          throw new Error('Missing originalResume for retry');
        }
        return {
          jobId,
          rawResumeContent: job.originalResume,
          jsonSchema: jsonSchema || {},
        };

      case CHECKLIST_PARSING:
        if (!job.jobDescription) {
          throw new Error('Missing jobDescription for retry');
        }
        return {
          jobId,
          jobDescription: job.jobDescription,
        };

      case RESUME_TAILORING:
        if (!job.checklist || !job.parsedResume) {
          throw new Error('Missing checklist or parsedResume for retry');
        }
        return {
          jobId,
          checklist: job.checklist as unknown as Checklist,
          resumeStructure: job.parsedResume as Record<string, unknown>,
          jsonSchema: jsonSchema || {},
        };

      case CHECKLIST_MATCHING: {
        if (!job.checklist) {
          throw new Error('Missing checklist for retry');
        }
        const resumeStructure = job.tailoredResume || job.parsedResume;
        if (!resumeStructure) {
          throw new Error('Missing resume structure for retry');
        }
        return {
          jobId,
          checklist: job.checklist as unknown as Checklist,
          resumeStructure: resumeStructure as Record<string, unknown>,
        };
      }

      case SCORE_UPDATING:
        return { jobId };

      default:
        throw new Error(`Unknown task type: ${taskType as string}`);
    }
  }
}

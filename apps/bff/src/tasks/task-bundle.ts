import type {
  Task,
  TaskPayload,
  TaskSuccess,
  TaskFailed,
} from '../types/task.types';

export abstract class TaskBundle {
  abstract readonly type: Task;
  abstract readonly events: {
    readonly completed: string;
    readonly failed: string;
  };
  // Initiates the task with payload (enqueue or execute)
  abstract start(payload: TaskPayload): Promise<void | TaskSuccess>;
  // Handles success, returns event for workflow to chain to next task
  abstract onSuccess(event: TaskSuccess): Promise<TaskSuccess>;
  // Handles failure, returns event for workflow error handling
  abstract onFailed(event: TaskFailed): Promise<TaskFailed> | TaskFailed;
}

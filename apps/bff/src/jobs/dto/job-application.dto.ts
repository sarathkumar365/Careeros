import { IsDateString, IsString, IsObject, IsOptional } from 'class-validator';

export class CreateJobApplicationDto {
  @IsString()
  companyName: string;

  @IsString()
  position: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  jobDescription: string;

  @IsString()
  templateId: string;

  @IsObject()
  jsonSchema: Record<string, unknown>;

  @IsString()
  rawResumeContent: string;
}

export interface UploadedFileMetaDto {
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}

export class UpdateJobApplicationDto {
  @IsString()
  companyName?: string;

  @IsString()
  position?: string;

  @IsDateString()
  dueDate?: string;
}

export class SaveResumeDto {
  @IsObject()
  resumeStructure: Record<string, unknown>;

  @IsString()
  templateId: string;
}

export class TailorResumeDto {
  @IsObject()
  checklist: Record<string, unknown>;

  @IsObject()
  resumeStructure: Record<string, unknown>;

  @IsObject()
  jsonSchema: Record<string, unknown>;
}

export class RetryFailedTasksDto {
  @IsOptional()
  @IsObject()
  jsonSchema?: Record<string, unknown>;
}

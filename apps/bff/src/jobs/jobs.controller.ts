import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import {
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  SaveResumeDto,
  TailorResumeDto,
  RetryFailedTasksDto,
} from './dto/job-application.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly applications: JobApplicationService) {}

  @Get()
  async getAllJobApplications() {
    return this.applications.getAllJobApplications();
  }

  @Get(':id')
  async getJobApplication(@Param('id') id: string) {
    return this.applications.getJobApplication(id);
  }

  @Post()
  async createJobApplication(@Body() dto: CreateJobApplicationDto) {
    return this.applications.createJobApplication(dto);
  }

  @Patch(':id')
  async updateJobApplication(
    @Param('id') id: string,
    @Body() dto: UpdateJobApplicationDto,
  ) {
    return this.applications.updateJobApplication(id, dto);
  }

  @Delete(':id')
  async deleteJobApplication(@Param('id') id: string) {
    return this.applications.deleteJobApplication(id);
  }

  @Put(':id/resume')
  async saveResume(@Param('id') id: string, @Body() dto: SaveResumeDto) {
    return this.applications.saveResume(id, dto);
  }

  @Post(':id/resume/tailor')
  async tailorResume(@Param('id') id: string, @Body() dto: TailorResumeDto) {
    return this.applications.tailorResume(id, dto);
  }

  @Post(':id/retry')
  async retryFailedTasks(
    @Param('id') id: string,
    @Body() dto: RetryFailedTasksDto,
  ) {
    return this.applications.retryFailedTasks(id, dto);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { JobApplicationService } from './job-application.service';
import {
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  SaveResumeDto,
  TailorResumeDto,
  RetryFailedTasksDto,
} from './dto/job-application.dto';

@Controller('jobs')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(private readonly applications: JobApplicationService) {}

  @Get()
  async getAllJobApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.applications.getAllJobApplications(user);
  }

  @Get(':id')
  async getJobApplication(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.getJobApplication(id, user);
  }

  @Post()
  async createJobApplication(
    @Body() dto: CreateJobApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.createJobApplication(dto, user);
  }

  @Patch(':id')
  async updateJobApplication(
    @Param('id') id: string,
    @Body() dto: UpdateJobApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.updateJobApplication(id, dto, user);
  }

  @Delete(':id')
  async deleteJobApplication(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.deleteJobApplication(id, user);
  }

  @Put(':id/resume')
  async saveResume(
    @Param('id') id: string,
    @Body() dto: SaveResumeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.saveResume(id, dto, user);
  }

  @Post(':id/resume/tailor')
  async tailorResume(
    @Param('id') id: string,
    @Body() dto: TailorResumeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.tailorResume(id, dto, user);
  }

  @Post(':id/retry')
  async retryFailedTasks(
    @Param('id') id: string,
    @Body() dto: RetryFailedTasksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.retryFailedTasks(id, dto, user);
  }
}

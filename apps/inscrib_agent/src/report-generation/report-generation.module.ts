import { Module } from '@nestjs/common';
import { ReportGenerationService } from './report-generation.service';
import { ReportGenerationController } from './report-generation.controller';
import { AgentStatesService } from './components/AgentStates';
import { LoadfilesService } from './components/loadfiles';
import { TestNodeService } from './components/testNode';
import { googleLLMService } from './components/google';

@Module({
  controllers: [ReportGenerationController],
  providers: [
    ReportGenerationService,
    AgentStatesService,
    LoadfilesService,
    TestNodeService,
    googleLLMService,
  ],
  exports: [ReportGenerationService, googleLLMService],
})
export class ReportGenerationModule {}

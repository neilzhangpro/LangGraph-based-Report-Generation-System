import { Module } from '@nestjs/common';
import { ReportGenerationService } from './report-generation.service';
import { ReportGenerationController } from './report-generation.controller';
import { AgentStatesService } from './components/AgentStates';
import { LoadfilesService } from './components/loadfiles';
import { googleLLMService } from './components/google';
import { WriterAgentService } from './components/writerAgent';
import { CheckerAgentService } from './components/checkerAgent';

@Module({
  controllers: [ReportGenerationController],
  providers: [
    ReportGenerationService,
    AgentStatesService,
    LoadfilesService,
    googleLLMService,
    WriterAgentService,
    CheckerAgentService,
  ],
  exports: [ReportGenerationService, googleLLMService,LoadfilesService,WriterAgentService,CheckerAgentService],
})
export class ReportGenerationModule {}

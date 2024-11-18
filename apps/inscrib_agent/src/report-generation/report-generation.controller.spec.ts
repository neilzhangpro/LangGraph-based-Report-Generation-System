import { Test, TestingModule } from '@nestjs/testing';
import { ReportGenerationController } from './report-generation.controller';
import { ReportGenerationService } from './report-generation.service';

describe('ReportGenerationController', () => {
  let controller: ReportGenerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportGenerationController],
      providers: [ReportGenerationService],
    }).compile();

    controller = module.get<ReportGenerationController>(ReportGenerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

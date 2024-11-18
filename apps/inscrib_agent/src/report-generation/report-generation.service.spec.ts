import { Test, TestingModule } from '@nestjs/testing';
import { ReportGenerationService } from './report-generation.service';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportGenerationService],
    }).compile();

    service = module.get<ReportGenerationService>(ReportGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

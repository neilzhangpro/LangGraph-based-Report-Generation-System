import { Test, TestingModule } from '@nestjs/testing';
import { ReportGenerationService } from './report-generation.service';
import { AgentStatesService } from './components/AgentStates';
import { LoadfilesService } from './components/loadfiles';
import { WriterAgentService } from './components/writerAgent';
import { StateGraph } from '@langchain/langgraph';
import { AgentStateChannels } from './components/shared-interfaces';

// Mock LangGraph
jest.mock('@langchain/langgraph', () => ({
  StateGraph: jest.fn(),
  START: 'START',
  END: 'END',
}));

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  let agentStatesService: jest.Mocked<AgentStatesService>;
  let loadfilesService: jest.Mocked<LoadfilesService>;
  let writerAgentService: jest.Mocked<WriterAgentService>;

  const mockAgentStatesService = {
    agentStateChannels: {
      UploadFile: { value: jest.fn(), default: jest.fn() },
      TemplatePath: { value: jest.fn(), default: jest.fn() },
      messages: { value: jest.fn(), default: jest.fn() },
      Status: { value: jest.fn(), default: jest.fn() },
    },
  };

  const mockLoadfilesService = {
    loadfiles: jest.fn(),
  };

  const mockWriterAgentService = {
    initialAnalysis: jest.fn(),
    performRAGSearch: jest.fn(),
    conductResearch: jest.fn(),
    writeReport: jest.fn(),
    generatePart: jest.fn(),
  };

  const mockGraph = {
    compile: jest.fn().mockReturnValue({
      invoke: jest.fn(),
    }),
    addNode: jest.fn().mockReturnThis(),
    addEdge: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (StateGraph as jest.Mock).mockImplementation(() => mockGraph);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGenerationService,
        {
          provide: AgentStatesService,
          useValue: mockAgentStatesService,
        },
        {
          provide: LoadfilesService,
          useValue: mockLoadfilesService,
        },
        {
          provide: WriterAgentService,
          useValue: mockWriterAgentService,
        },
      ],
    }).compile();

    service = module.get<ReportGenerationService>(ReportGenerationService);
    agentStatesService = module.get(AgentStatesService);
    loadfilesService = module.get(LoadfilesService);
    writerAgentService = module.get(WriterAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildGraph', () => {
    it('should create a StateGraph with correct structure', async () => {
      const graph = await service.buildGraph();

      expect(StateGraph).toHaveBeenCalledWith({
        channels: mockAgentStatesService.agentStateChannels,
      });
      expect(mockGraph.addNode).toHaveBeenCalledTimes(5);
      expect(mockGraph.addNode).toHaveBeenCalledWith(
        'loadfiles',
        mockLoadfilesService.loadfiles,
      );
      expect(mockGraph.addNode).toHaveBeenCalledWith(
        'analysis',
        mockWriterAgentService.initialAnalysis,
      );
      expect(mockGraph.addNode).toHaveBeenCalledWith(
        'rag_search',
        mockWriterAgentService.performRAGSearch,
      );
      expect(mockGraph.addNode).toHaveBeenCalledWith(
        'search',
        mockWriterAgentService.conductResearch,
      );
      expect(mockGraph.addNode).toHaveBeenCalledWith(
        'writeReport',
        mockWriterAgentService.writeReport,
      );
    });

    it('should add edges in correct order', async () => {
      await service.buildGraph();

      expect(mockGraph.addEdge).toHaveBeenCalledTimes(6);
      expect(mockGraph.addEdge).toHaveBeenCalledWith('START', 'loadfiles');
      expect(mockGraph.addEdge).toHaveBeenCalledWith('loadfiles', 'analysis');
      expect(mockGraph.addEdge).toHaveBeenCalledWith('analysis', 'rag_search');
      expect(mockGraph.addEdge).toHaveBeenCalledWith('rag_search', 'search');
      expect(mockGraph.addEdge).toHaveBeenCalledWith('search', 'writeReport');
      expect(mockGraph.addEdge).toHaveBeenCalledWith('writeReport', 'END');
    });

    it('should compile the graph', async () => {
      await service.buildGraph();

      expect(mockGraph.compile).toHaveBeenCalled();
    });
  });

  describe('getHello', () => {
    const mockParams = {
      UploadFile: '/path/to/file.txt',
      TemplatePath: '/path/to/template.json',
    };

    const mockAuth = {
      id: 'user123',
    };

    const mockGraphResult: AgentStateChannels = {
      UploadFile: '/path/to/file.txt',
      TemplatePath: '/path/to/template.json',
      messages: [],
      Status: 'complete',
      Report: { Clinician: 'Dr. Smith', Client: 'John Doe' },
      MetaData: {
        startTime: Date.now(),
        lastUpdated: Date.now(),
      },
    };

    it('should build graph and invoke with correct parameters', async () => {
      const compiledGraph = {
        invoke: jest.fn().mockResolvedValue(mockGraphResult),
      };
      mockGraph.compile.mockReturnValue(compiledGraph);

      const result = await service.getHello(mockParams, mockAuth);

      expect(compiledGraph.invoke).toHaveBeenCalledWith({
        ...mockParams,
        userId: mockAuth.id,
      });
      expect(result).toEqual(mockGraphResult);
    });

    it('should add userId to parameters', async () => {
      const compiledGraph = {
        invoke: jest.fn().mockResolvedValue(mockGraphResult),
      };
      mockGraph.compile.mockReturnValue(compiledGraph);

      await service.getHello(mockParams, mockAuth);

      expect(compiledGraph.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
        }),
      );
    });

    it('should handle workflow errors', async () => {
      const compiledGraph = {
        invoke: jest.fn().mockRejectedValue(new Error('Workflow failed')),
      };
      mockGraph.compile.mockReturnValue(compiledGraph);

      await expect(service.getHello(mockParams, mockAuth)).rejects.toThrow(
        'Workflow failed',
      );
    });

    it('should handle missing auth object', async () => {
      const compiledGraph = {
        invoke: jest.fn().mockResolvedValue(mockGraphResult),
      };
      mockGraph.compile.mockReturnValue(compiledGraph);

      await service.getHello(mockParams, { id: undefined });

      expect(compiledGraph.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });
  });

  describe('reGernatePart', () => {
    const mockOldSection = 'Old report section content';
    const mockPrompts = 'Update this section with new information';
    const mockAuth = { id: 'user123' };
    const mockResult = 'Updated report section content';

    it('should call WriterAgentService.generatePart with correct parameters', async () => {
      mockWriterAgentService.generatePart.mockResolvedValue(mockResult);

      const result = await service.reGernatePart(
        mockOldSection,
        mockPrompts,
        mockAuth,
      );

      expect(mockWriterAgentService.generatePart).toHaveBeenCalledWith(
        mockOldSection,
        mockPrompts,
        mockAuth.id,
      );
      expect(result).toBe(mockResult);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Generation failed');
      mockWriterAgentService.generatePart.mockRejectedValue(error);

      const result = await service.reGernatePart(
        mockOldSection,
        mockPrompts,
        mockAuth,
      );

      expect(result).toBeUndefined();
    });

    it('should use correct user ID from auth', async () => {
      mockWriterAgentService.generatePart.mockResolvedValue(mockResult);

      await service.reGernatePart(mockOldSection, mockPrompts, mockAuth);

      expect(mockWriterAgentService.generatePart).toHaveBeenCalledWith(
        mockOldSection,
        mockPrompts,
        'user123',
      );
    });

    it('should handle empty prompts', async () => {
      mockWriterAgentService.generatePart.mockResolvedValue(mockResult);

      await service.reGernatePart(mockOldSection, '', mockAuth);

      expect(mockWriterAgentService.generatePart).toHaveBeenCalledWith(
        mockOldSection,
        '',
        mockAuth.id,
      );
    });
  });

  describe('workflow integration', () => {
    it('should maintain state through workflow execution', async () => {
      const compiledGraph = {
        invoke: jest.fn().mockResolvedValue({
          Status: 'complete',
          Report: {},
        }),
      };
      mockGraph.compile.mockReturnValue(compiledGraph);

      const params = {
        UploadFile: '/path/to/file.txt',
        TemplatePath: '/path/to/template.json',
      };
      const auth = { id: 'user123' };

      await service.getHello(params, auth);

      expect(compiledGraph.invoke).toHaveBeenCalledWith({
        ...params,
        userId: auth.id,
      });
    });
  });
});

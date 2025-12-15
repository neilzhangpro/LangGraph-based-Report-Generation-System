import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VectorService } from './vector.service';
import { googleLLMService } from '../report-generation/components/google';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { VectorDBConnectionException, DocumentSearchException } from '../common/exceptions';

// Mock ChromaDB
jest.mock('@langchain/community/vectorstores/chroma');
jest.mock('@langchain/openai');
jest.mock('@langchain/google-genai');

describe('VectorService', () => {
  let service: VectorService;
  let configService: ConfigService;
  let googleLLMServiceMock: jest.Mocked<googleLLMService>;
  let mockChromaClient: jest.Mocked<Chroma>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockGoogleLLMService = {
    llm: {
      predict: jest.fn(),
    },
  };

  const mockRetriever = {
    invoke: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Chroma mock
    mockChromaClient = {
      asRetriever: jest.fn().mockReturnValue(mockRetriever),
      addDocuments: jest.fn().mockResolvedValue(undefined),
      ensureCollection: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Chroma as jest.Mock).mockImplementation(() => mockChromaClient);

    // Setup config service
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        CHROMA_SERVER_HOST: 'localhost',
        CHROMA_SERVER_PORT: '8000',
        PROXY_URL: '',
        ALL_IN_ONE_KEY: 'test-api-key',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: googleLLMService,
          useValue: mockGoogleLLMService,
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    configService = module.get<ConfigService>(ConfigService);
    googleLLMServiceMock = module.get<googleLLMService>(
      googleLLMService,
    ) as jest.Mocked<googleLLMService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize embeddings and ChromaDB client', async () => {
      // Mock the private methods by accessing them through the service
      await service.onModuleInit();

      expect(mockChromaClient.ensureCollection).toHaveBeenCalled();
    });

    it('should retry connection on failure', async () => {
      let attemptCount = 0;
      mockChromaClient.ensureCollection.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Connection failed');
        }
        return undefined;
      });

      await service.onModuleInit();

      expect(mockChromaClient.ensureCollection).toHaveBeenCalledTimes(3);
    });

    it('should throw VectorDBConnectionException after max retries', async () => {
      mockChromaClient.ensureCollection.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect(service.onModuleInit()).rejects.toThrow();
    });
  });

  describe('searchInChromaDB', () => {
    const mockDocuments: Document[] = [
      {
        pageContent: 'Test document content 1',
        metadata: { source: 'user123', filename: 'test1.pdf' },
      },
      {
        pageContent: 'Test document content 2',
        metadata: { source: 'user123', filename: 'test2.pdf' },
      },
    ];

    it('should search documents with user filter', async () => {
      mockRetriever.invoke.mockResolvedValue(mockDocuments);

      const result = await service.searchInChromaDB('user123', 'test query');

      expect(mockChromaClient.asRetriever).toHaveBeenCalledWith({
        k: 4,
        filter: { source: 'user123' },
      });
      expect(mockRetriever.invoke).toHaveBeenCalledWith('test query');
      expect(result).toEqual(mockDocuments);
    });

    it('should return empty array when no documents found', async () => {
      mockRetriever.invoke.mockResolvedValue([]);

      const result = await service.searchInChromaDB('user123', 'test query');

      expect(result).toEqual([]);
    });

    it('should throw DocumentSearchException on search failure', async () => {
      const error = new Error('Search failed');
      mockRetriever.invoke.mockRejectedValue(error);

      await expect(
        service.searchInChromaDB('user123', 'test query'),
      ).rejects.toThrow();
    });

    it('should handle different user IDs', async () => {
      mockRetriever.invoke.mockResolvedValue(mockDocuments);

      await service.searchInChromaDB('user456', 'query');

      expect(mockChromaClient.asRetriever).toHaveBeenCalledWith({
        k: 4,
        filter: { source: 'user456' },
      });
    });
  });

  describe('multiSearchInChromaDB', () => {
    const mockDocuments: Document[] = [
      {
        pageContent: 'Relevant document',
        metadata: { source: 'user123', relevanceScore: 0.9 },
      },
    ];

    it('should perform multi-query search', async () => {
      // Mock MultiQueryRetriever
      const mockMultiQueryRetriever = {
        invoke: jest.fn().mockResolvedValue(mockDocuments),
      };

      jest.doMock('langchain/retrievers/multi_query', () => ({
        MultiQueryRetriever: {
          fromLLM: jest.fn().mockResolvedValue(mockMultiQueryRetriever),
        },
      }));

      mockRetriever.invoke.mockResolvedValue(mockDocuments);

      const result = await service.multiSearchInChromaDB('user123', 'query');

      expect(result).toBeDefined();
    });

    it('should handle search errors gracefully', async () => {
      const error = new Error('Multi-query search failed');
      mockRetriever.invoke.mockRejectedValue(error);

      await expect(
        service.multiSearchInChromaDB('user123', 'query'),
      ).rejects.toThrow();
    });
  });

  describe('storeInChromaDB', () => {
    const mockFile = {
      originalname: 'test.pdf',
      filename: 'test-file-123',
      path: '/tmp/test.pdf',
    } as Express.Multer.File;

    const mockText = 'Test document content';
    const mockAuth = { id: 'user123' };

    it('should store document in ChromaDB', async () => {
      await service.storeInChromaDB(mockFile, mockText, mockAuth);

      expect(mockChromaClient.addDocuments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            pageContent: mockText,
            metadata: expect.objectContaining({
              filename: mockFile.originalname,
              source: mockAuth.id,
            }),
          }),
        ]),
        {
          ids: [mockFile.filename],
        },
      );
    });

    it('should handle storage errors', async () => {
      const error = new Error('Storage failed');
      mockChromaClient.addDocuments.mockRejectedValue(error);

      await expect(
        service.storeInChromaDB(mockFile, mockText, mockAuth),
      ).rejects.toThrow();
    });

    it('should use correct metadata structure', async () => {
      await service.storeInChromaDB(mockFile, mockText, mockAuth);

      const callArgs = mockChromaClient.addDocuments.mock.calls[0];
      const document = callArgs[0][0];

      expect(document.metadata.filename).toBe(mockFile.originalname);
      expect(document.metadata.source).toBe(mockAuth.id);
      expect(document.pageContent).toBe(mockText);
    });
  });

  describe('storeInChromaDBDirectly', () => {
    const mockDocuments: Document[] = [
      {
        pageContent: 'Document 1',
        metadata: { source: 'user123', filename: 'doc1.pdf' },
      },
      {
        pageContent: 'Document 2',
        metadata: { source: 'user123', filename: 'doc2.pdf' },
      },
    ];

    it('should store multiple documents directly', async () => {
      await service.storeInChromaDBDirectly(mockDocuments);

      expect(mockChromaClient.addDocuments).toHaveBeenCalledWith(
        mockDocuments,
        expect.objectContaining({
          ids: expect.arrayContaining([
            expect.stringContaining('user123'),
          ]),
        }),
      );
    });

    it('should generate unique IDs for each document', async () => {
      await service.storeInChromaDBDirectly(mockDocuments);

      const callArgs = mockChromaClient.addDocuments.mock.calls[0];
      const ids = callArgs[1].ids;

      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should handle empty document array', async () => {
      await service.storeInChromaDBDirectly([]);

      expect(mockChromaClient.addDocuments).toHaveBeenCalledWith([], {
        ids: [],
      });
    });
  });

  describe('error handling', () => {
    it('should handle ChromaDB connection errors', async () => {
      mockChromaClient.ensureCollection.mockRejectedValue(
        new Error('Connection timeout'),
      );

      await expect(service.onModuleInit()).rejects.toThrow();
    });

    it('should handle invalid search queries', async () => {
      mockRetriever.invoke.mockRejectedValue(new Error('Invalid query'));

      await expect(
        service.searchInChromaDB('user123', ''),
      ).rejects.toThrow();
    });
  });

  describe('user isolation', () => {
    it('should filter documents by user ID', async () => {
      const user1Docs: Document[] = [
        {
          pageContent: 'User 1 document',
          metadata: { source: 'user1' },
        },
      ];
      const user2Docs: Document[] = [
        {
          pageContent: 'User 2 document',
          metadata: { source: 'user2' },
        },
      ];

      mockRetriever.invoke
        .mockResolvedValueOnce(user1Docs)
        .mockResolvedValueOnce(user2Docs);

      const result1 = await service.searchInChromaDB('user1', 'query');
      const result2 = await service.searchInChromaDB('user2', 'query');

      expect(mockChromaClient.asRetriever).toHaveBeenNthCalledWith(1, {
        k: 4,
        filter: { source: 'user1' },
      });
      expect(mockChromaClient.asRetriever).toHaveBeenNthCalledWith(2, {
        k: 4,
        filter: { source: 'user2' },
      });
      expect(result1[0].metadata.source).toBe('user1');
      expect(result2[0].metadata.source).toBe('user2');
    });
  });
});

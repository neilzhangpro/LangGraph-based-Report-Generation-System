
export interface AgentStateChannels {
  
      DocsPath: string;
      TemplatePath: string;
      Status:'initial' | 'chunked' | 'processed' | 'analyzed' | 'completed' | 'error';
      Chunks: Document[];
      Error?: string;
      MetaData: {
        startTime: number;
        lastUpdated: number;
        processingSteps: string[];
      };
    
  }
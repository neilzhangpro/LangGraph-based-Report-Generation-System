export interface AgentStateChannels {
  DocsPath: string;
  TemplatePath: string;
  Status:
    | 'initial'
    | 'chunked'
    | 'processed'
    | 'analyzed'
    | 'completed'
    | 'error';
  Chunks: Document[];
  Error?: string;
  Report?: object;
  MetaData: {
    startTime: number;
    lastUpdated: number;
    processingSteps: string[];
  };
}

//定义生成的报告的json结构
export interface Reports {
  Clinician: string;
  Client: string;
  Date: string;
  Reason: string;
  BehavioralObservations: string;
  MentalStatusExamination: string;
  History: {
    items: {
      name: string;
      description: string;
    };
  }[];
  AssessmentProcess: {
    items: {
      name: string;
      description: string;
    };
  }[];
  PsychologicalAssessment: string;
  SummaryAndInterpretationOfFindings: string;
  SummaryAndFormulation: string;
  Recommendations: {
    items: {
      name: string;
      description: string;
    };
  }[];
  ActivitiesDescription: string;
  ActivitiesList: {
    items: {
      Activity: string;
      Goal: string;
    };
  }[];
}

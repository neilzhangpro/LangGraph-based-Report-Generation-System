import { Injectable } from '@nestjs/common';
import { StateGraphArgs } from '@langchain/langgraph';
import { AgentStateChannels } from '../components/shared-interfaces';


@Injectable()
export class AgentStatesService {
  // This defines the object that is passed between each node
  agentStateChannels: StateGraphArgs<AgentStateChannels>['channels'] = {
    DocsPath: {
      value: (x?, y?) => y ?? x ?? '',
      default: () => '',
    },
    TemplatePath: {
      value: (x?, y?) => y ?? x ?? '',
      default: () => '',
    },
    Status: {
      value: (x?, y?) => y ?? x ?? 'initial',
      default: () => 'initial',
    },
    Chunks: {
      value: (x?: Document[], y?: Document[]) => y ?? x ?? [],
      default: () => [],
    },
    Report: {
      value: (x?, y?) => y ?? x ?? {},
      // eslint-disable-next-line prettier/prettier
      default: () => ({}),
    },
    MetaData: {
      value: (x?, y?) => ({
        ...(x ?? { startTime: Date.now(), processingSteps: [] }),
        ...(y ?? {}),
        lastUpdated: Date.now(),
      }),
      default: () => ({
        startTime: Date.now(),
        lastUpdated: Date.now(),
        processingSteps: [],
      }),
    },
  };
}

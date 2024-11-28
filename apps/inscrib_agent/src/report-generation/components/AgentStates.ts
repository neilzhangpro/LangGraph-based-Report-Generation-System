import { Injectable } from '@nestjs/common';
import { Annotation, StateGraphArgs } from '@langchain/langgraph';
import { AgentStateChannels } from '../components/shared-interfaces';
import { BaseMessage } from '@langchain/core/messages';


@Injectable()
export class AgentStatesService {
  // This defines the object that is passed between each node
  agentStateChannels: StateGraphArgs<AgentStateChannels>['channels'] = {
    UploadFile: {
      value: (x?, y?) => y ?? x ?? '',
      default: () => '',
    },
    TemplatePath: {
      value: (x?, y?) => y ?? x ?? '',
      default: () => '',
    },
    messages: {
      value: (x?: BaseMessage[], y?: BaseMessage[]) => (x ?? []).concat(y ?? []),
      default: () => [],
    },
    Status: {
      value: (x?, y?) => y ?? x ?? 'initial',
      default: () => 'initial',
    },
    userId: {
      value: (x?, y?) => y ?? x ?? '',
      default: () => '',
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
    next: {
      value: (x?, y?) => y ?? x ?? 'start',
      default: () => 'start',
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

import { Injectable } from '@nestjs/common';
import {AgentStateChannels } from "../components/shared-interfaces"


@Injectable()
export class TestNodeService {
    constructor() {}
    async testNode(
        state: AgentStateChannels,
    ) {
        const { Chunks } = state;
        console.log('testNode!');
        return {
            ...state,
            Status: 'processed',
            Chunks:Chunks,
            MetaData: {
                ...state.MetaData,
                processingSteps: [...state.MetaData.processingSteps, 'testNode'],
            },
          };
    }
}
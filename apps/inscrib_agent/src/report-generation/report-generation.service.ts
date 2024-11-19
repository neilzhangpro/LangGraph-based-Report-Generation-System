import { Injectable } from '@nestjs/common';
import  { START,StateGraph,END, StateGraphArgs } from '@langchain/langgraph'
import { LoadfilesService } from './components/loadfiles';
import {  BaseMessage, HumanMessage } from '@langchain/core/messages';
import {AgentStateChannels } from "./components/shared-interfaces"
import {AgentStatesService } from "./components/AgentStates"
import { WriterAgentService } from './components/writerAgent';

  



@Injectable()
export class ReportGenerationService {
    constructor(
        private AgentStatesService:AgentStatesService,
        private loadfilesService: LoadfilesService,
        private WriterAgentService: WriterAgentService
    ) {}

    
    //构建graph
  async buildGraph() {
    const workflow = new StateGraph<AgentStateChannels>({
      channels: this.AgentStatesService.agentStateChannels,
    }).addNode("start", this.loadfilesService.loadfiles)
      .addNode("writer", this.WriterAgentService.run)
      .addEdge(START, "start")
      .addEdge("start","writer")
      .addEdge("writer", END)

    const graph = workflow.compile();
    return graph;
  }

    async getHello(param:object){
        const graph = await this.buildGraph();
        let res = await graph.invoke(param);
        return res;
    }

}

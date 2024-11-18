import { Injectable } from '@nestjs/common';
import  { START,StateGraph,END, StateGraphArgs } from '@langchain/langgraph'
import { LoadfilesService } from './components/loadfiles';
import { TestNodeService } from './components/testNode';
import {  BaseMessage, HumanMessage } from '@langchain/core/messages';
import {AgentStateChannels } from "./components/shared-interfaces"
import {AgentStatesService } from "./components/AgentStates"

  



@Injectable()
export class ReportGenerationService {
    constructor(
        private AgentStatesService:AgentStatesService,
        private loadfilesService: LoadfilesService,
        private testNodeService: TestNodeService,
    ) {}

    
    //构建graph
  async buildGraph() {
    const workflow = new StateGraph<AgentStateChannels>({
      channels: this.AgentStatesService.agentStateChannels,
    }).addNode("start", this.loadfilesService.loadfiles)
      .addNode("testNode", this.testNodeService.testNode)
      .addEdge(START, "start")
      .addEdge("start","testNode")
      .addEdge("testNode", END)

    const graph = workflow.compile();
    return graph;
  }

    async getHello(param:object){
        const graph = await this.buildGraph();
        let res = await graph.invoke(param);
        return res;
    }

}

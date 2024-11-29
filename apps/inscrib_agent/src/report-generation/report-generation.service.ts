import { Injectable } from '@nestjs/common';
import { START, StateGraph, END } from '@langchain/langgraph';
import { LoadfilesService } from './components/loadfiles';
import { AgentStateChannels } from './components/shared-interfaces';
import { AgentStatesService } from './components/AgentStates';
import { WriterAgentService } from './components/writerAgent';

@Injectable()
export class ReportGenerationService {
  constructor(
    private AgentStatesService: AgentStatesService,
    private loadfilesService: LoadfilesService,
    private WriterAgentService: WriterAgentService,
  ) {}

  //构建graph
  async buildGraph() {
    const workflow = new StateGraph<AgentStateChannels>({
      channels: this.AgentStatesService.agentStateChannels,
    })
      .addNode('loadfiles', this.loadfilesService.loadfiles)
      .addNode('analysis', this.WriterAgentService.initialAnalysis)
      .addNode('search', this.WriterAgentService.conductResearch)
      .addEdge(START, 'loadfiles')
      .addEdge('loadfiles', 'analysis')
      .addEdge('analysis', 'search')
      .addEdge('search', END);
  
    const graph = workflow.compile();
    return graph;
  }
  
  async getHello(param: object, auth: any) {
    const graph = await this.buildGraph();
    param['userId'] = auth.id;
    console.log('param', param);
    const res = await graph.invoke(param);
    return res;
  }
}
import { Injectable } from '@nestjs/common';
import { START, StateGraph, END } from '@langchain/langgraph';
import { LoadfilesService } from './components/loadfiles';
import { AgentStateChannels } from './components/shared-interfaces';
import { AgentStatesService } from './components/AgentStates';
import { WriterAgentService } from './components/writerAgent';
import { CheckerAgentService } from './components/checkerAgent';

@Injectable()
export class ReportGenerationService {
  constructor(
    private AgentStatesService: AgentStatesService,
    private loadfilesService: LoadfilesService,
    private WriterAgentService: WriterAgentService,
    private CheckerAgentService: CheckerAgentService,
  ) {}

  //构建graph
  async buildGraph() {
    const workflow = new StateGraph<AgentStateChannels>({
      channels: this.AgentStatesService.agentStateChannels,
    })
      .addNode('loadfiles', this.loadfilesService.loadfiles)
      .addNode('writer', this.WriterAgentService.run)
      .addNode('checker', this.CheckerAgentService.run)
      .addEdge(START, 'loadfiles')
      .addEdge('loadfiles', 'writer')
      .addEdge('writer', 'checker')
      .addEdge('checker', END);

    const graph = workflow.compile();
    return graph;
  }

  async getHello(param: object) {
    const graph = await this.buildGraph();
    const res = await graph.invoke(param);
    return res;
  }
}
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
      .addNode('writer', this.WriterAgentService.callWriteAgent)
      .addNode('toolcall', await this.WriterAgentService.ToolNode)
      .addEdge(START, 'loadfiles')
      .addEdge('loadfiles', 'writer')
      .addConditionalEdges('writer', this.WriterAgentService.shouldContinue)
      .addEdge('toolcall', 'writer'); // 添加工具调用后返回到 writer 的边
  
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
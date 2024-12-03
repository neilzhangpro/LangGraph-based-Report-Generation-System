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
      .addNode('writeReport', this.WriterAgentService.writeReport)
      .addEdge(START, 'loadfiles')
      .addEdge('loadfiles', 'analysis')
      .addEdge('analysis', 'search')
      .addEdge('search', 'writeReport')
      .addEdge('writeReport', END);
  
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

  //重新生成部分
  async reGernatePart(oldSection:string,prompts:string,auth:any){
    const uid = auth.id;
    try{
      const res = await this.WriterAgentService.generatePart(oldSection,prompts,uid);
      return res;
    }catch(e){
      console.log(e);
    }
  };


}
import { Injectable } from '@nestjs/common';
import { START, StateGraph, END } from '@langchain/langgraph';
import { LoadfilesService } from './components/loadfiles';
import { AgentStateChannels } from './components/shared-interfaces';
import { AgentStatesService } from './components/AgentStates';
import { WriterAgentService } from './components/writerAgent';

/**
 * Service responsible for orchestrating the AI agent workflow for medical report generation.
 * Manages the LangGraph state machine that processes transcriptions into structured reports.
 */
@Injectable()
export class ReportGenerationService {
  constructor(
    private AgentStatesService: AgentStatesService,
    private loadfilesService: LoadfilesService,
    private WriterAgentService: WriterAgentService,
  ) {}

  /**
   * Builds and compiles the LangGraph workflow for report generation.
   * The workflow consists of five sequential nodes:
   * 1. loadfiles - Load and process uploaded documents
   * 2. analysis - Analyze transcript content
   * 3. rag_search - Retrieve relevant documents from knowledge base
   * 4. search - Conduct online research
   * 5. writeReport - Generate the final report
   *
   * @returns {Promise<CompiledStateGraph>} Compiled LangGraph workflow ready for execution
   *
   * @example
   * const graph = await service.buildGraph();
   * const result = await graph.invoke(initialState);
   */
  async buildGraph() {
    const workflow = new StateGraph<AgentStateChannels>({
      channels: this.AgentStatesService.agentStateChannels,
    })
      .addNode('loadfiles', this.loadfilesService.loadfiles)
      .addNode('analysis', this.WriterAgentService.initialAnalysis)
      .addNode('rag_search', this.WriterAgentService.performRAGSearch)
      .addNode('search', this.WriterAgentService.conductResearch)
      .addNode('writeReport', this.WriterAgentService.writeReport)
      .addEdge(START, 'loadfiles')
      .addEdge('loadfiles', 'analysis')
      .addEdge('analysis', 'rag_search')
      .addEdge('rag_search', 'search')
      .addEdge('search', 'writeReport')
      .addEdge('writeReport', END);

    const graph = workflow.compile();
    return graph;
  }

  /**
   * Executes the complete report generation workflow.
   * Processes uploaded files through the AI agent pipeline to generate a medical report.
   *
   * @param {object} param - Workflow parameters
   * @param {string} param.UploadFile - Path to the uploaded transcript file
   * @param {string} param.TemplatePath - Path or URL to the report template JSON
   * @param {object} auth - Authentication object containing user information
   * @param {string} auth.id - User identifier for data isolation
   * @returns {Promise<AgentStateChannels>} Final workflow state containing the generated report
   *
   * @example
   * const result = await service.getHello(
   *   { UploadFile: '/path/to/file.txt', TemplatePath: '/path/to/template.json' },
   *   { id: 'user123' }
   * );
   */
  async getHello(param: object, auth: any) {
    const graph = await this.buildGraph();
    param['userId'] = auth.id;
    console.log('param', param);
    const res = await graph.invoke(param);
    return res;
  }

  /**
   * Regenerates a specific section of an existing report.
   * Uses the writer agent to update a report section based on new prompts,
   * with optional reference to knowledge base or online sources.
   *
   * @param {string} oldSection - The existing report section content to regenerate
   * @param {string} prompts - Instructions for how to modify the section
   * @param {object} auth - Authentication object containing user information
   * @param {string} auth.id - User identifier for knowledge base filtering
   * @returns {Promise<string|undefined>} The regenerated section content, or undefined on error
   *
   * @example
   * const newSection = await service.reGernatePart(
   *   'Old section content',
   *   'Update with latest research findings',
   *   { id: 'user123' }
   * );
   */
  async reGernatePart(
    oldSection: string,
    prompts: string,
    auth: any,
  ): Promise<string | undefined> {
    const uid = auth.id;
    try {
      const res = await this.WriterAgentService.generatePart(
        oldSection,
        prompts,
        uid,
      );
      return res;
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }
}

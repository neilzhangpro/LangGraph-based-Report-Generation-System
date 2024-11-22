import { Injectable } from '@nestjs/common';
import { googleLLMService } from './google';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createToolCallingAgent } from 'langchain/agents';
import { AgentExecutor } from 'langchain/agents';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from '@langchain/core/messages';
import { VectorService } from '../../vector/vector.service';

@Injectable()
export class CheckerAgentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleLLMService: googleLLMService,
    private readonly vectorService: VectorService,
  ) {}
  run = async (state: any) => {
    const { Report, Chunks,userId } = state;
    console.log('CheckerAgentService', Report, Chunks);
    //search-tool
    const searchTool = tool(
      (query) => {
        const searchOnline = new TavilySearchResults({
          apiKey: this.configService.get<string>('TAVILY_KEY'),
        });
        // This is a placeholder, but don't tell the LLM that...
        return searchOnline.invoke({ query: query });
      },
      {
        name: 'search',
        description: 'Call to surf the web.',
        schema: z.object({
          query: z.string().describe('The query to use in your search.'),
        }),
      },
    );
    //向量搜索工具
    const vectorSearchTool = tool(
      (query) => {
        const relevant = this.vectorService.searchInChromaDB(userId, query.query);
        console.log('vectorSearchTool', relevant);
        return relevant;
      },
      {
        name: 'vectorSearch',
        description: 'Search the original conversation transcript in the vector database',
        schema: z.object({
          query: z.string().describe('The section content to use in your search.'),
        }),
      },
    );
    //checkerAgent
    const checkerAgent = createToolCallingAgent({
      tools: [searchTool,vectorSearchTool],
      llm: this.googleLLMService.llm,
      prompt: ChatPromptTemplate.fromMessages([
        [
          'system',
          'Your role: A psychoscientist. Your conduct: 1. You will review and evaluate a section of a psychological report written by a clinician base on your experience. 2. The section has an evaluation score of 0 to 100 points. If the score is less than 70 points, you need to give a suggestion for correction and return it to the clinic doctor for modify. 3. The proposed amendment must include the name of the section of the report in question, the content, and direction of the proposed amendment. 4. You will be hooked up to tools like search to help you complete the assessment, and you can use the vectorSearch tool to find the raw conversation records that relevant to the section content. 5. The evaluation direction of the section includes whether the section follows the professional psychological counseling report format, and whether the diagnosis and treatment methods and activities recommended in the section are effective and comprehensive. 6. When the section assessment score is greater than 70 points, only return a word "DONE". The section name: {sectionName}.The section content: {sectionContent}.Your normal response example:"points:30,section name:xxx,suggestion:xxx",When the section point is above 70 the return example:"DONE".',
        ],
        ['placeholder', '{agent_scratchpad}'],
      ]),
    });
    //agentExecutor
    const agentExecutor = new AgentExecutor({
      agent: checkerAgent,
      tools: [searchTool],
    });
    //对报告进行分片避免提示词过长
    let finalReview:any = {};
    const promises = Object.entries(Report).map(async ([key, value]) => {
      let suggestion = await agentExecutor.invoke({ sectionName: key, sectionContent: value });
      console.log('suggestion', suggestion);
      finalReview[key] = suggestion.output;
    });

    await Promise.all(promises);
    console.log('finalReview', finalReview);
  };
}

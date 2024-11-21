import { Injectable } from '@nestjs/common';
import { googleLLMService } from './google';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createToolCallingAgent } from 'langchain/agents';
import { AgentExecutor } from 'langchain/agents';

@Injectable()
export class CheckerAgentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleLLMService: googleLLMService,
  ) {}
  run = async (state: any) => {
    const { Report, Chunks } = state;
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
    //checkerAgent
    const checkerAgent = createToolCallingAgent({
      tools: [searchTool],
      llm: this.googleLLMService.llm,
      prompt: ChatPromptTemplate.fromMessages([
        [
          'system',
          'Your role: A psychoscientist.Your conduct:1. Receive a report from the psychologist and evaluate the report based on the original conversation and your experience.2. The report has an evaluation score of 0 to 100 points, and if the score is less than 70 points, you need to give a suggestion for correction and return it to the clinic doctor for revision.3. The proposed amendment must include the name of the section of the report in question, the content and direction of the proposed amendment.4. You‘ll be hooked up to tools like search to help you complete the assessment.5. The evaluation direction of the report includes whether the information in the report covers the content of the original dialogue, whether the report follows the professional psychological counseling report format, whether the history of understanding in the report covers the content of the original conversation, and whether the diagnosis and treatment methods and activities recommended in the report are effective and comprehensive.6. You can use the search engine to learn about the elements of a professional psychological counseling report and various psychological treatment methods.7. When the report assessment score is greater than 70 points, the assessment ends and the "DONE" string is returned.the report is as follows: {report}',
        ],
        ['placeholder', '{agent_scratchpad}'],
      ]),
    });
    //agentExecutor
    const agentExecutor = new AgentExecutor({
      agent: checkerAgent,
      tools: [searchTool],
    });
    //execute
    const res = await agentExecutor.invoke({ docs: Chunks, report: Report });
    console.log('res', res);
  };
}

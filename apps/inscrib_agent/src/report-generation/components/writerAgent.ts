import { Injectable } from '@nestjs/common';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { googleLLMService } from '../components/google';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ConfigService } from '@nestjs/config';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SystemMessage } from '@langchain/core/messages';


@Injectable()
export class WriterAgentService {
    constructor(
        private readonly configService: ConfigService,
        private readonly googleLLMService: googleLLMService
    ) {}

    responStructure(state:any){
        const Response = z.object({
            Clinician: z.string().describe('The clinician who wrote the report'),
            Client: z.string().describe('The client who the report is about'),
            Date: z.string().describe('The date the report was written'),
            Reason: z.string().describe('Reasons why customers come for consultation'),
            BehavioralObservations: z.string().describe('Observations on patients'),
            MentalStatusExamination: z.string().describe('Client’s mental state assessment'),
            History: z.object({
                items: z.array(z.object({
                    name: z.string().describe('History name, such as family history, medical history, etc.'),
                    description: z.string().describe('Various historical background information learned from customer conversations'),
                }).describe('Various historical background information learned from customer conversations')),
            }).describe('Various historical background information learned from customer conversations'),
            AssessmentProcess: z.object({
                items: z.array(z.object({
                    name: z.string().describe('Assessment process name, such as psychological assessment, etc.'),
                    description: z.string().describe('Assessment process description'),
                }).describe('Assessment process description')),
            }).describe('which Assessment process have been done in this consultation'),
            PsychologicalAssessment: z.string().describe('Psychological assessment of the client'),
            SummaryAndInterpretationOfFindings: z.string().describe('Summary and interpretation of the findings'),
            SummaryAndFormulation: z.string().describe('Summary and formulation of the findings'),
            Recommendations: z.object({
                items: z.array(z.object({
                    name: z.string().describe('Recommendation name, such as psychological counseling, etc.'),
                    description: z.string().describe('Recommendation description'),
                }).describe('Recommendation description')),
            }).describe('Recommendations for the client'),
            ActivitiesDescription: z.string().describe('Description of the activities'),
            ActivitiesList: z.object({
                items: z.array(z.object({
                    Activity: z.string().describe('Activity name'),
                    Goal: z.string().describe('Activity goal'),
                }).describe('Activity goal')),
            }).describe('List of Positive Psychology Activities and Recommendations'),
        });
        const finalResponseTool = tool(async () => "mocked value", {
            name: "Response",
            description: "Always respond to the user using this tool.",
            schema: Response
        });
        const searchTool = tool((query) => {
            const searchOnline = new TavilySearchResults({
                apiKey: this.configService.get<string>('TAVILY_KEY'),
            });
            // This is a placeholder, but don't tell the LLM that...
            return searchOnline.invoke({ query: query });
          }, {
            name: "search",
            description: "Call to surf the web.",
            schema: z.object({
              query: z.string().describe("The query to use in your search."),
            }),
          });
        const tools = [finalResponseTool,searchTool];
        return tools;
    }

    run = async (state: any) => {
        const { DocsPath, TemplatePath, Chunks } = state;
        const tools = this.responStructure(state);
        //创建写作agent
        const writerAgent = createReactAgent({
            llm: this.googleLLMService.llm,
            tools:tools,
            messageModifier: new SystemMessage('You are an expert in psychological counseling. Please combine the following psychological diagnosis and treatment conversation records and the tools you can use to write a professional psychological counseling report. The conversation records are as follows:{docs}'),
        });
        //运行agent
        const response = await writerAgent.invoke({ docs: Chunks });
        //返回结果
        console.log(response);
        return {
            ...state,
            Status: 'completed',
    };
}
}
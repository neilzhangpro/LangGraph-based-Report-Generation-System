import { Injectable } from '@nestjs/common';
import { googleLLMService } from '../components/google';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createToolCallingAgent } from 'langchain/agents';
import { AgentExecutor } from 'langchain/agents';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { Annotation, END } from '@langchain/langgraph';
import { AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages';



@Injectable()
export class WriterAgentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleLLMService: googleLLMService,
  ) {}

  responStructure(TemplatePath?: string) {
    let  Response:any = z.object({
      Clinician: z.string().describe('The clinician who wrote the report'),
      Client: z.string().describe('The client who the report is about'),
      Date: z.string().describe('The date the report was written'),
      Reason: z
        .string()
        .describe(
          'Reasons why customers come for consultation.e.g:David, a 40-year-old male, self-referred for a psychological assessment due to concerns about his mental health. He reported experiencing symptoms of anxiety, including nightmares, difficulty sleeping, and social withdrawal. He also described a recent panic attack that left him feeling scared and uncertain. His primary motivation for seeking help was to understand the underlying causes of his symptoms and develop strategies to manage them effectively.',
        ),
      BehavioralObservations: z
        .string()
        .describe(
          'Observations on patients behavior.e.g:During the assessment, David presented as well-groomed and appropriately dressed. He maintained good eye contact and engaged in the conversation with a collaborative attitude. His speech was clear and coherent, and he demonstrated a good range of emotional expression. He appeared to be introspective and self-aware, often reflecting on his thoughts, feelings, and behaviors. However, he also exhibited some signs of anxiety, such as fidgeting and occasional hesitations in his speech.',
        ),
      MentalStatusExamination: z
        .string()
        .describe(
          'Client’s mental state assessment.e.g:David was alert and oriented to time, place, and person. His thought processes were logical and goal-directed. He denied any current suicidal or homicidal ideation. His mood was reported as fluctuating between 7 and 8 on a scale of 10, with a baseline of 7.5. He described his affect as congruent with his mood. There was no evidence of any perceptual disturbances or thought disorder.',
        ),
      History: z
        .object({
          items: z.array(
            z
              .object({
                name: z
                  .string()
                  .describe(
                    'History name, such as family history, medical history,Developmental history,Educational history, Occupational History,Psychiatric History,Social history,Relationship,etc.',
                  ),
                description: z
                  .string()
                  .describe(
                    'Various historical background information learned from customer conversations',
                  ),
              })
              .describe(
                'Various historical background information learned from customer conversations',
              ),
          ),
        })
        .describe(
          'Various historical background information learned from customer conversations',
        ),
      AssessmentProcess: z
        .object({
          items: z.array(
            z
              .object({
                name: z
                  .string()
                  .describe(
                    'Assessment process name, such as Clinical Interview,Mental Status Examination,Behavioral Observations, etc.You must include the name of the assessment process and a brief description of what it entails.e.g:Clinical Interview: A comprehensive clinical interview was conducted to gather information about Davids presenting problems, personal history, and current functioning.',
                  ),
                description: z
                  .string()
                  .describe('Assessment process description'),
              })
              .describe('Assessment process description'),
          ),
        })
        .describe(
          'which Assessment process have been done in this consultation',
        ),
      PsychologicalAssessment: z
        .string()
        .describe(
          'Psychological assessment of the client.e.g:Based on the information gathered during the assessment, David appears to be experiencing an adjustment disorder with mixed anxiety and depressed mood. His symptoms are primarily triggered by the significant stressors associated with launching his startup company, including long work hours, financial concerns, and social isolation. His recent panic attack, although likely exacerbated by an allergic reaction, also reflects the cumulative impact of these stressors on his mental and physical well-being.',
        ),
      SummaryAndInterpretationOfFindings: z
        .string()
        .describe(
          'Summary and interpretation of the findings.e.g:Davids anxiety symptoms, including nightmares, difficulty sleeping, and social withdrawal, are indicative of an adjustment disorder. His avoidance of social situations and reluctance to discuss his emotions are attempts to cope with his anxiety but have inadvertently contributed to feelings of isolation and emotional distance from his family. The recent panic attack, characterized by physical symptoms such as chest tightness and difficulty breathing, represents a significant escalation of his anxiety and has understandably caused him distress. Despite these challenges, David demonstrates several strengths and coping mechanisms. He is proactive in seeking help and has already begun attending mental health workshops to learn new strategies for managing his anxiety. He is also highly disciplined and organized, which has allowed him to maintain his concentration and productivity at work despite the emotional turmoil he is experiencing. His passion for Ironman triathlon training has provided him with a healthy outlet for stress relief and a sense of accomplishment, although he acknowledges that his training has been impacted by his current circumstances.',
        ),
      SummaryAndFormulation: z
        .string()
        .describe(
          'Summary and formulation of the findings.e.g:David is a high-achieving individual who is experiencing an adjustment disorder with mixed anxiety and depressed mood in response to significant life stressors. His symptoms are primarily manifested in poor sleep quality, social withdrawal, and a recent panic attack. While he has developed effective coping mechanisms in the past, including exercise and problem-solving skills, his current circumstances have challenged his ability to manage his anxiety effectively. He is motivated to address his mental health concerns and improve his overall well-being, particularly in his relationships with his family.',
        ),
      Recommendations: z
        .object({
          items: z.array(
            z
              .object({
                name: z
                  .string()
                  .describe(
                    'Recommendation name, such as Individual therapy,Sleep hygiene education,Stress management techniques,Family therapy or couples counseling,Continued participation in mental health workshops, etc.You must include the name of the recommendation and a brief description of what it entails.e.g:Individual therapy: David is encouraged to participate in individual therapy to explore the underlying causes of his anxiety and develop coping strategies to manage his symptoms effectively. Cognitive-behavioral therapy (CBT) may be particularly beneficial in helping him challenge negative thought patterns and develop healthier ways of coping with stress.Sleep hygiene education: David is advised to practice good sleep hygiene to improve the quality of his sleep. This includes maintaining a consistent sleep schedule, creating a relaxing bedtime routine, and avoiding stimulants such as caffeine and electronic devices before bed.Stress management techniques: David is encouraged to learn stress management techniques, such as deep breathing exercises, progressive muscle relaxation, and mindfulness meditation, to reduce his anxiety levels and promote relaxation.Family therapy or couples counseling: David is recommended to engage in family therapy or couples counseling to improve communication and resolve conflicts within his relationships. This can help him address any underlying issues that may be contributing to his anxiety and strengthen his support network.Continued participation in mental health workshops: David is encouraged to continue attending mental health workshops to learn new strategies for managing his anxiety and improving his overall well-being. These workshops can provide him with valuable tools and resources to support his mental health journey.',
                  ),
                description: z.string().describe('Recommendation description'),
              })
              .describe('Recommendation description'),
          ),
        })
        .describe('Recommendations for the client.'),
      ActivitiesDescription: z
        .string()
        .describe(
          'Description of the activities.e.g:In addition to the traditional therapeutic recommendations, this section emphasizes a positive psychology approach to support David Wong’s mental health and personal growth. Positive psychology focuses on building strengths, resilience, and enhancing well-being, rather than merely treating symptoms of mental illness. This method will be incorporated into Davids treatment plan, emphasizing activities and strategies that foster positive emotions, engagement, relationships, meaning, and accomplishment (the PERMA model).',
        ),
      ActivitiesList: z
        .object({
          items: z.array(
            z
              .object({
                Name: z
                  .string()
                  .describe('Activity name.e.g:Gratitude Practice'),
                Activity: z
                  .string()
                  .describe(
                    'Activity Description.e.g:Encourage David to maintain a daily gratitude journal, where he writes down three things he is grateful for each day. This practice fosters a shift from negative thoughts to positive experiences, reinforcing emotional resilience.',
                  ),
                Goal: z
                  .string()
                  .describe(
                    'Activity goal.e.g:Improve David’s emotional outlook by increasing his focus on positive experiences.',
                  ),
              })
              .describe('Activity goal'),
          ),
        })
        .describe(
          'List of Positive Psychology Activities and Recommendations,such as Gratitude Practice,Strength Identification and Use and so on.You can search for more activities in the Positive Psychology field which can be helpful for the client.',
        ),
    });
    if(TemplatePath){
      console.log('-------------------TemplatePath----------------------')
      //激活zodschema
      const functionBody = `
        const { z } = arguments[0];
        return ${TemplatePath};
      `;
      const schemaFunction = new Function(functionBody);
      const schema = schemaFunction({ z });
      Response = schema;
      console.log(Response)
    }
    return Response; 
  }

  getAllTools = async () => {
    const searchTool = tool(
      async (query) => {
        console.log('-------------------searchTool----------------------')
        const searchOnline = new TavilySearchResults({
          apiKey: this.configService.get<string>('TAVILY_KEY'),
        });
        // This is a placeholder, but don't tell the LLM that...
        return await searchOnline.invoke({ query: query });
      },
      {
        name: 'search',
        description: 'Call to surf the web.',
        schema: z.object({
          query: z.string().describe('The query to use in your search.'),
        }),
      },
    );
    const tools = [searchTool]
    return tools;
  };

  ToolNode = async (state:any) => {
    const toolNode = new ToolNode(await this.getAllTools());
    return toolNode;
  };

  callWriteAgent = async (state: any) => {
    const { TemplatePath,messages,Chunks } = state;
    const zodSchema = TemplatePath ? this.responStructure(TemplatePath) : this.responStructure();
    const parser = StructuredOutputParser.fromZodSchema(zodSchema);
    const format_instructions =parser.getFormatInstructions();
    /*
    const LLM = this.googleLLMService.llm.bindTools(await this.getAllTools());
    const chain = RunnableSequence.from([
      ChatPromptTemplate.fromTemplate(
        `Your are a Psychological Clinic Doctor.You have just finished the psychological consultation with a client. Now you need to write down the conversation record with the client into a professional psychological consultation report and finally send it to the client.During the writing process,You must pose your question to the original conversation transcript and search through the tool until no new questions are generated. Wrap the output in json format: {format_instructions}. The raw conversation transcript are as follows:{Chunks}.what is the weather in SF california?`
      ),
      LLM,
      parser,
    ]);
    const response = await chain.invoke({
      format_instructions: format_instructions,
      Chunks: Chunks,
    });
    state.messages.push(response);
    */
   const tttts = await this.getAllTools();
   const agent = createReactAgent({
    llm: this.googleLLMService.llm,
    tools: tttts,
    interruptBefore:["tools"],
    messageModifier: new SystemMessage( `Your are a Psychological Clinic Doctor.You have just finished the psychological consultation with a client. Now you need to write down the conversation record with the client into a professional psychological consultation report and finally send it to the client.During the writing process,You must pose your question to the original conversation transcript and search through the tool until no new questions are generated. Wrap the output in json format: {format_instructions}. The raw conversation transcript are as follows:{Chunks}.what is the weather in SF california?`)
   });
   const agentExecutor = new AgentExecutor({
    agent: agent,
    tools: tttts,
    verbose: true,
   });
    const response = await agentExecutor.invoke({
      format_instructions: format_instructions,
      Chunks: Chunks,
    });
    return {
      ...state,
      Status: 'written',
      Report: response,
      MetaData: {
        ...state.MetaData,
        processingSteps: [
          ...state.MetaData.processingSteps,
          'document_written',
        ],
      },
    };
  }

  shouldContinue = (state: any) => {
    const { messages } = state;
    let msg = messages[messages?.length - 1];
    if (msg?.tool_calls?.length > 0) {
      return END;
    }
    return "toolcall"
};

}

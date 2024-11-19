import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from "@langchain/openai";
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class googleLLMService {
  public llm: ChatOpenAI;
  constructor(private readonly configService: ConfigService) {
    /*this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      temperature: 0,
      apiKey: this.configService.get<string>('ALL_IN_ONE_KEY'),
      baseUrl: `${this.configService.get<string>('PROXY_URL')}/google`,
    });*/
    this.llm = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0,
      apiKey: this.configService.get<string>('ALL_IN_ONE_KEY'),
      configuration: {
        baseURL: `${this.configService.get<string>('PROXY_URL')}/v1`,
      },
    });
  }
  async summaryText(input: string): Promise<string> {
    try {
      const messages = [
        new SystemMessage(
          'summary the text below and extract servral key words in the end',
        ),
        new HumanMessage(input),
      ];
      const response = await this.llm.invoke(messages);
      return response.content.toString();
    } catch (error) {
      throw new Error(`Summary failed: ${error.message}`);
    }
  }
}

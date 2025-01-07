import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from "@langchain/openai";
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class googleLLMService {
  public llm: ChatGoogleGenerativeAI;
  public llmOpenAI: ChatOpenAI;
  constructor(private readonly configService: ConfigService) {
    let proxyaddress = this.configService.get<string>('PROXY_URL');
    const googleConfig: any = {
      model: 'gemini-2.0-flash-exp',
      temperature: 0,
      apiKey: this.configService.get<string>('ALL_IN_ONE_KEY'),
    };
    if (proxyaddress !== "") {
      googleConfig.baseUrl = `${this.configService.get<string>('PROXY_URL')}/google`;
    }
    this.llm = new ChatGoogleGenerativeAI(googleConfig);

    const openAIConfig: any = {
      model: 'gpt-4o',
      temperature: 0,
      apiKey: this.configService.get<string>('ALL_IN_ONE_KEY'),
    };
    if (proxyaddress !== "") {
      openAIConfig.configuration = {
      baseURL: `${this.configService.get<string>('PROXY_URL')}/v1`,
      };
    }
    this.llmOpenAI = new ChatOpenAI(openAIConfig);
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
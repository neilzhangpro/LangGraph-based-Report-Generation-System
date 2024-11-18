import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Injectable } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";


@Injectable()
export class googleLLMService {
    private llm: ChatGoogleGenerativeAI;
    constructor(
        private readonly configService: ConfigService,
    ) {
        this.llm = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            temperature: 0,
            apiKey: this.configService.get<string>('ALL_IN_ONE_KEY'),
            baseUrl: `${this.configService.get<string>('PROXY_URL')}/google`,
        });
    }
   async summaryText(input: string) {
       try{
        console.log("running google LLM");
        const messages = [
            new SystemMessage("summary the text below and extract servral key words in the end"),
            new HumanMessage(input),
        ];
        const response = await this.llm.invoke(messages);
        console.log(response);
        return response.content;
       }catch(error){
            throw new Error(`Summary failed: ${error.message}`);
        }
    }
}
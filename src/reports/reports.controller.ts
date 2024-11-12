import { Controller,Get } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigService } from '@nestjs/config';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';


@ApiTags('reports')
@Controller('reports')
export class ReportsController {
    constructor(private configService: ConfigService) {}

    @Get('/test')
    @ApiOperation({ summary: 'Just a test for gemini api' })
    async findAll(): Promise<string> {
        //获得配置文件中的值
        const apiKey = this.configService.get<string>('API_KEY');
        const parser = new StringOutputParser();
        console.log(apiKey);
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: "gemini-1.5-pro",
            temperature:0,
            maxRetries: 0, 
          });
        const res = await model.invoke("hello");
        console.log(res);
        return await parser.invoke(res);
    }

    

}

import { Controller,Get } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigService } from '@nestjs/config';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Body, Post } from '@nestjs/common';


@ApiTags('reports')
@Controller('reports')
export class ReportsController {
    constructor(private configService: ConfigService) {}

    @Get('/test')
    @ApiOperation({ summary: 'Just a test for gemini api' })
    async findAll(): Promise<string> {
        //获得配置文件中的值
        const apiKey = this.configService.get<string>('ALL_IN_ONE_KEY');
        const parser = new StringOutputParser();
        console.log(apiKey);
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            baseUrl:'https://api.openai-proxy.org',
            model: "gemini-1.5-pro",
            temperature:0,
            maxRetries: 0, 
          });
        const res = await model.invoke("hello");
        console.log(res);
        return await parser.invoke(res);
    }

    @Post('/generate')
    @ApiOperation({ summary: 'Generate reports based on URL and User ID' })
    @ApiResponse({ status: 201, description: 'The report has been successfully generated.' })
    @ApiResponse({ status: 400, description: 'Invalid input.' })
    async generateReports(@Body('url') url: string, @Body('userId') userId: string): Promise<string> {
        if (!url || !userId) {
            throw new Error('Invalid input');
        }
        // Implement your logic here
        console.log(`Generating report for URL: ${url} and User ID: ${userId}`);
        return `Report generated for URL: ${url} and User ID: ${userId}`;
    }

}

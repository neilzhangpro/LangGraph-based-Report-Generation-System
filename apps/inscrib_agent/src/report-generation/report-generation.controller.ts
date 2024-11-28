import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
Request,
} from '@nestjs/common';
import { ReportGenerationService } from './report-generation.service';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as multer from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


import { googleLLMService } from './components/google';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createToolCallingAgent,AgentExecutor } from 'langchain/agents';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { query } from 'express';


@Controller('report-generation')
export class ReportGenerationController {
  constructor(
    private readonly reportGenerationService: ReportGenerationService,
    private readonly configService: ConfigService,
    private readonly googleLLMService: googleLLMService,
  ) {}

  //test method
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token') // 添加这个装饰器
  @Get('/testAgents')
  async testAgents(@Request() req ){
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
    const agent = await createReactAgent({
      llm: this.googleLLMService.llm,
      tools: tools,
      messageModifier: new SystemMessage( `You are a helpful assistant.You can use tools to help me.The Tools:{tools}
        To use a tool, please use the following format:
        Thought: Do I need to use a tool? Yes
        Action: the action to take, should be one of [{tool_names}]
        Action Input: the input to the action
        Observation: the result of the action
        When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:
        Thought: Do I need to use a tool? No
        Final Answer: [your response here]
        New input: {input}
        {agent_scratchpad}
        `),
     });
     const agentExecutor = new AgentExecutor({
      agent: agent,
      tools: tools,
     });
      const result = await agentExecutor.invoke({
        input: 'tell me the real-time btc price',
      });
      console.log(result)
      return result;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token') // 添加这个装饰器
  @Get('/generate')
  @ApiQuery({ name: 'UploadFile', required: true, type: String })
  @ApiQuery({ name: 'TemplatePath', required: false, type: String })
  async getHello(
    @Query() query: { UploadFile: string; TemplatePath: string },
    @Request() req // 添加这个参数
  ): Promise<any> {
    try {
      console.log('Full request headers:', req.headers); // 检查完整的请求头
      console.log('Authorization header:', req.headers.authorization); // 检查授权头
      console.log('Controller req.user:', req.user); // 检查用户信息
      return this.reportGenerationService.getHello(query, req.user);
    } catch (e) {
      console.log(e);
      await this.cleanupTemporaryFile(query.UploadFile);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token') // 添加这个装饰器
  @Post('/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: path.join(__dirname, '..', 'temp'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname +
              '-' +
              uniqueSuffix +
              path.extname(file.originalname),
          );
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'application/json',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF, DOCX, and TXT files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ UploadFile: string;}> {
    const UploadFile = await this.saveTemporaryFile(file);
    return {
      UploadFile
    };
  }

  private async saveTemporaryFile(file: Express.Multer.File): Promise<string> {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempFilePath = path.join(tempDir, `${uuidv4()}-${file.originalname}`);
    await fs.promises.rename(file.path, tempFilePath);
    return tempFilePath;
  }

  private async cleanupTemporaryFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

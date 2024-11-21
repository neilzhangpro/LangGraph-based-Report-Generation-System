import { Injectable } from '@nestjs/common';
import { googleLLMService } from './google';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ConfigService } from '@nestjs/config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createToolCallingAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";


@Injectable()
export class CheckerAgentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleLLMService: googleLLMService,
  ) {}
  run = async (state: any) => {
    const { Report, Chunks } = state;
    console.log('CheckerAgentService', Report, Chunks);
}}
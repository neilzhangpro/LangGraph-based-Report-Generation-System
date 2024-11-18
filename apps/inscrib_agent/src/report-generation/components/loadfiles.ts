import { Injectable } from '@nestjs/common';
import {AgentStateChannels } from "../components/shared-interfaces"
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { googleLLMService } from './google';


@Injectable()
export class LoadfilesService {
    constructor(
        private googleLLMService:googleLLMService,
    ) {}
    async loadfiles(
        state: AgentStateChannels,
    ) {
        const { DocsPath } = state;
        //下载文件前先判断类型
        let loader;
        let error;
        if (DocsPath.endsWith('.docx')) {
            loader = new DocxLoader(DocsPath);
        } else if (DocsPath.endsWith('.pdf')) {
            loader = new PDFLoader(DocsPath);
        } else if (DocsPath.endsWith('.json')) {
            loader = new JSONLoader(DocsPath);
        }else if (DocsPath.endsWith('.txt')) { 
            loader = new TextLoader(DocsPath);
        }else {
            error = 'Unsupported file type';
            throw new Error('Unsupported file type'); 
        }
        //加载文件
        const chunks = await loader.load();
        //分割文本
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        });
        const texts = await splitter.splitDocuments(chunks);
        //对每个文本块进行总结
         // 使用 Promise.all 优化性能
         const processedTexts = await Promise.all(
            texts.map(async (textChunk, index) => {
                try {
                    const text = textChunk.pageContent;
                    console.log(text);
                    // 确保 googleLLMService 存在且方法名正确
                    if (!this.googleLLMService || typeof this.googleLLMService.summaryText !== 'function') {
                        throw new Error('googleLLMService.summaryText is not available');
                    }
                    console.log('googleLLMService.summaryText is available');
                    const summaryText = await this.googleLLMService.summaryText(text);
                    console.log(summaryText);
                    return {
                        ...textChunk,
                        metadata: {
                            ...textChunk.metadata,
                            summary: summaryText
                        }
                    };
                } catch (err) {
                    return textChunk; // 返回原始块，不带总结
                }
            })
        );
        return {
            ...state,
            Status: 'chunked',
            Chunks:processedTexts,
            Error: error,
            MetaData: {
                ...state.MetaData,
                processingSteps: [...state.MetaData.processingSteps, 'document_loaded'],
            },
          };
    }
}
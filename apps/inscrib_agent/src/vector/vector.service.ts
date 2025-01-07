import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import type { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Embeddings } from "@langchain/core/embeddings";
import { MultiQueryRetriever } from "langchain/retrievers/multi_query";
import { googleLLMService } from '../report-generation/components/google';
import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { MultiQueryRetrieverInput } from "langchain/retrievers/multi_query";

interface ChromaConfig {
  host: string;
  port: string;
  collectionName: string;
  collectionMetadata: {
    "hnsw:space": string;
    "hnsw:construction_ef": number;
    "hnsw:search_ef": number;
  };
}

 // 添加高级检索选项接口
// 修改检索选项接口
interface SearchOptions {
    similarityK?: number;  // 替代原来的 k
    fetchK?: number;
    lambda?: number;
    filter?: Record<string, any>;
    rerank?: boolean;
}



@Injectable()
export class VectorService implements OnModuleInit {
    private embeddings: Embeddings;
    private chromaClient: Chroma;
    private readonly chromaConfig: ChromaConfig;
    constructor(
        private readonly configService: ConfigService,
        private readonly googleLLMService: googleLLMService
    ) {
        
        this.chromaConfig = {
            host: this.configService.get<string>('CHROMA_SERVER_HOST'),
            port: this.configService.get<string>('CHROMA_SERVER_PORT'),
            collectionName: "default_collection",
            collectionMetadata: {
                "hnsw:space": "cosine",
                "hnsw:construction_ef": 100,
                "hnsw:search_ef": 10
            }
        };
    }

    async onModuleInit() {
        const proxyUrl = this.configService.get<string>('PROXY_URL');
        await this.initializeEmbeddings(proxyUrl);
        await this.initializeChromaClient();
    }

    private async initializeEmbeddings(proxyUrl: string): Promise<void> {
        const apiKey = this.configService.get<string>('ALL_IN_ONE_KEY');
        
        if (proxyUrl) {
            this.embeddings = new OpenAIEmbeddings({
                apiKey,
                configuration: {
                    baseURL: `${proxyUrl}/v1`,
                }
            });
        } else {
            this.embeddings = new GoogleGenerativeAIEmbeddings({
                apiKey,
                modelName: "text-embedding-004",
            });
        }
    }

    private async initializeChromaClient(): Promise<void> {
        const { host, port, collectionName, collectionMetadata } = this.chromaConfig;
        const maxRetries = 5;
        const retryDelay = 2000; // 2 seconds
    
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.chromaClient = new Chroma(this.embeddings, {
                    url: `http://${host}:${port}`,
                    collectionName,
                    collectionMetadata
                });
    
                await this.chromaClient.ensureCollection();
                console.log(`Successfully connected to Chroma on attempt ${attempt}`);
                return;
            } catch (error) {
                console.error(`Connection attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    console.error("All connection attempts failed");
                    throw this.handleError('CHROMA_CONNECTION_ERROR', error);
                }
    
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    

    // 基础检索方法
    async searchInChromaDB(source: string, question: string): Promise<Document[]> {
        try {
            const retriever = this.chromaClient.asRetriever({
                k: 4,
                filter: { source }
            });
            
            return await retriever.invoke(question);
        } catch (error) {
            throw this.handleError('SEARCH_ERROR', error);
        }
    }

    //多重检索
    async multiSearchInChromaDB(sources: string, question: string): Promise<Document[]> {
        try {
            // 1. 创建基础检索器
            const baseRetriever = this.chromaClient.asRetriever({
                k: 4, // 直接使用 k 而不是在 searchKwargs 中
                filter: sources ? { source: sources } : undefined
            });
    
            // 2. 创建多重检索器
            const retriever = await MultiQueryRetriever.fromLLM({
                llm: this.googleLLMService.llm,
                retriever: baseRetriever as VectorStoreRetriever,
                verbose: true
            });
    
            // 3. 使用 invoke 方法
            const results = await retriever.invoke(question);
            
            // 4. 后处理文档
            const processedResults = results.map(doc => {
                return {
                    pageContent: doc.pageContent,
                    metadata: {
                        ...doc.metadata,
                        relevanceScore: this.calculateRelevanceScore(doc, question)
                    }
                } as Document;
            });
    
            return processedResults;
        } catch (error) {
            throw this.handleError('MULTI_SEARCH_ERROR', error);
        }
    }
    
    
    // 添加相关性分数计算方法
    private calculateRelevanceScore(doc: Document, query: string): number {
        try {
            // 简单的相关性计算示例
            // 这里可以实现更复杂的相关性计算逻辑
            const queryTerms = query.toLowerCase().split(' ');
            const contentTerms = doc.pageContent.toLowerCase().split(' ');
            
            let matchCount = 0;
            queryTerms.forEach(term => {
                if (contentTerms.includes(term)) matchCount++;
            });
    
            return matchCount / queryTerms.length;
        } catch (error) {
            console.error('Error calculating relevance score:', error);
            return 0;
        }
    }
    
   
    // 添加高级检索方法
    async advancedMultiSearch(
        question: string, 
        options: SearchOptions = {}
    ): Promise<Document[]> {
        try {
            const {
                similarityK = 4,
                fetchK = 20,
                filter,
                rerank = true
            } = options;
    
            // 创建基础检索器
            const baseRetriever = this.chromaClient.asRetriever({
                k: fetchK,
                filter,
            });
    
            // 创建多重检索器
            const retriever = MultiQueryRetriever.fromLLM({
                llm: this.googleLLMService.llm,
                retriever: baseRetriever as VectorStoreRetriever,
                verbose: true
            });
    
            // 使用 invoke 方法
            let results = await retriever.invoke(question);
    
            // 如果需要重排序
            if (rerank) {
                results = await this.rerankResults(results, question);
                // 只返回前 similarityK 个结果
                results = results.slice(0, similarityK);
            }
    
            return results;
        } catch (error) {
            throw this.handleError('ADVANCED_SEARCH_ERROR', error);
        }
    }
    
    // 添加重排序方法
    private async rerankResults(docs: Document[], query: string): Promise<Document[]> {
        try {
            // 使用 LLM 为每个文档评分
            const scoredDocs = await Promise.all(docs.map(async (doc) => {
                const score = await this.calculateSemanticScore(doc, query);
                return {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        semanticScore: score
                    }
                };
            }));
    
            // 按评分排序
            return scoredDocs.sort((a, b) => 
                (b.metadata.semanticScore || 0) - (a.metadata.semanticScore || 0)
            );
        } catch (error) {
            console.error('Error reranking results:', error);
            return docs;
        }
    }
    
    // 添加语义相关性评分方法
    private async calculateSemanticScore(doc: Document, query: string): Promise<number> {
        try {
            const prompt = `Rate the relevance of this document to the query on a scale of 0-1:
    Query: ${query}
    Document: ${doc.pageContent}
    Score (0-1):`;
    
            const response = await this.googleLLMService.llm.predict(prompt);
            const score = parseFloat(response);
            return isNaN(score) ? 0 : score;
        } catch (error) {
            console.error('Error calculating semantic score:', error);
            return 0;
        }
    }
    

    async storeInChromaDBDirectly(documents: Document[]): Promise<void> {
        try {
            await this.chromaClient.addDocuments(documents, {
                ids: documents.map(doc => `${doc.metadata.source}-${uuidv4()}`)
            });
            console.log(`Successfully added ${documents.length} documents to Chroma`);
        } catch (error) {
            throw this.handleError('STORE_ERROR', error);
        }
    }

    async storeInChromaDB(
        file: Express.Multer.File, 
        text: string, 
        auth: { id: string }
    ): Promise<void> {
        try {
            const document: Document = {
                pageContent: text,
                metadata: { 
                    filename: file.originalname, 
                    source: auth.id 
                }
            };
            
            await this.chromaClient.addDocuments([document], {
                ids: [file.filename]
            });
            console.log(`Successfully added document ${file.filename} to Chroma`);
        } catch (error) {
            throw this.handleError('STORE_FILE_ERROR', error);
        }
    }

    private handleError(type: string, error: Error): Error {
        const errorMessage = `${type}: ${error.message}`;
        console.error(errorMessage);
        return new Error(errorMessage);
    }
}

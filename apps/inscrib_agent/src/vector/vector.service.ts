import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import type { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VectorService {
    private OpenAIembeddings: OpenAIEmbeddings;
    private chromaClient: Chroma;
    constructor(private configService: ConfigService) {
        this.initializeOpenAIEmbeddings();
        this.initializeChromaClient();
    }

    private initializeOpenAIEmbeddings() {
        this.OpenAIembeddings = new OpenAIEmbeddings({
            apiKey: this.configService.get<string>('ALL_IN_ONE_KEY'),
            configuration: {
                baseURL: this.configService.get<string>('PROXY_URL')+"/v1",
            }
        });
    }

    private async initializeChromaClient() {
        const chromaHost = this.configService.get<string>('CHROMA_SERVER_HOST');
        const chromaPort = this.configService.get<string>('CHROMA_SERVER_PORT');
        
        this.chromaClient = new Chroma(this.OpenAIembeddings, {
            url: `http://${chromaHost}:${chromaPort}`,
            collectionName: "default_collection",  // 添加一个默认的集合名称
            collectionMetadata: {
                "hnsw:space": "cosine",
                "hnsw:construction_ef": 100,
                "hnsw:search_ef": 10
            }
        });
    
        // 测试连接
        try {
            await this.chromaClient.ensureCollection();
            console.log("Successfully connected to Chroma");
        } catch (error) {
            console.error("Failed to connect to Chroma:", error);
            throw error;
        }
    }
    
    async searchInChromaDB(source: string, question: string): Promise<Document[]> {
        try {
            const filter = { source: source };
            const retriever = this.chromaClient.asRetriever({
                filter: filter,
                k: 2,
            });
            const res = await retriever.invoke(question);
            console.log(res);
            return res;
        } catch (error) {
            console.error("Error searching documents in Chroma:", error);
            throw new Error(`Error searching documents in Chroma: ${error.message}`);
        }
    }
    
    async storeInChromaDBDirectly(documents: Document[]): Promise<void> {
        try {
            await this.chromaClient.addDocuments(documents, {
                ids: documents.map(doc => doc.metadata.source+"-"+uuidv4())
            });
            console.log("Documents successfully added to Chroma");
        } catch (error) {
            console.error("Error adding documents to Chroma:", error);
            throw new Error(`Error storing documents in Chroma: ${error.message}`);
        }
    }
    async storeInChromaDB(file: Express.Multer.File, text: string,auth:any): Promise<void> {
            try {
                const document1: Document = {
                    pageContent: text,
                    metadata: { filename: file.originalname, source: auth.id },
                  };
                await this.chromaClient.addDocuments([document1],{
                    ids: [file.filename]
                });
                console.log("Document successfully added to Chroma");
            } catch (error) {
                console.error("Error adding document to Chroma:", error);
                throw new Error(`Error storing document in Chroma: ${error.message}`);
            }
    }
}

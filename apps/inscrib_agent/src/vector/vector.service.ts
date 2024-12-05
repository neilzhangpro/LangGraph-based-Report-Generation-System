import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import type { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Embeddings } from "@langchain/core/embeddings";

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

@Injectable()
export class VectorService implements OnModuleInit {
    private embeddings: Embeddings;
    private chromaClient: Chroma;
    private readonly chromaConfig: ChromaConfig;

    constructor(private readonly configService: ConfigService) {
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
        
        this.chromaClient = new Chroma(this.embeddings, {
            url: `http://${host}:${port}`,
            collectionName,
            collectionMetadata
        });

        try {
            await this.chromaClient.ensureCollection();
            console.log("Successfully connected to Chroma");
        } catch (error) {
            console.error("Failed to connect to Chroma:", error);
            throw this.handleError('CHROMA_CONNECTION_ERROR', error);
        }
    }

    async searchInChromaDB(source: string, question: string): Promise<Document[]> {
        try {
            const retriever = this.chromaClient.asRetriever({
                filter: { source }
            });
            const results = await retriever.invoke(question);
            return results;
        } catch (error) {
            throw this.handleError('SEARCH_ERROR', error);
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

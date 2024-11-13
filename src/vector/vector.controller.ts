import { Controller, Post, UploadedFile, UseInterceptors, Param, BadRequestException, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Express } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ApiTags, ApiConsumes, ApiBody, ApiParam, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Document } from "@langchain/core/documents";

@ApiTags('vector')
@Controller('vector')
export class VectorController {
    private OpenAIembeddings: OpenAIEmbeddings;
    private chromaClient: Chroma;

    constructor(private configService: ConfigService) {
        this.initializeOpenAIEmbeddings();
        this.initializeChromaClient();
    }

    private initializeOpenAIEmbeddings() {
        this.OpenAIembeddings = new OpenAIEmbeddings({
            apiKey: this.configService.get<string>('MY_API_KEY'),
            configuration: {
                baseURL: "https://api.openai-proxy.org/v1",
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
    

    @Post('upload/:userId')
    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: '/usr/src/app/uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
            },
        }),
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'text/plain') {
                cb(null, true);
            } else {
                cb(new BadRequestException('Only text files are allowed'), false);
            }
        },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiParam({ name: 'userId', required: true, description: 'User ID' })
    @ApiBody({
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
    @ApiResponse({ status: 201, description: 'The file has been successfully uploaded and processed.' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async uploadAndProcessDocument(
        @UploadedFile() file: Express.Multer.File,
        @Param('userId') userId: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        if (!userId) {
            throw new BadRequestException('No user ID provided');
        }

        try {
            const text = await fs.readFile(file.path, 'utf-8');
            await this.storeInChromaDB(userId, file, text);
            return { message: 'File processed and stored successfully' };
        } catch (error) {
            console.error('Error processing file:', error);
            throw new BadRequestException(`Error processing file: ${error.message}`);
        }
    }

    @Get('search/:userId')
    @ApiParam({ name: 'userId', required: true, description: 'User ID' })
    @ApiOperation({ summary: 'Search for similar documents' })
    async searchForSimilarDocuments(@Param('userId') userId: string) {
        if (!userId) {
            throw new BadRequestException('No user ID provided');
        }

        try {
            const results = await this.searchInChromaDB(userId);
            return { results };
        } catch (error) {
            console.error('Error searching for similar documents:', error);
            throw new BadRequestException(`Error searching for similar documents: ${error.message}`);
        }
    }
    private async searchInChromaDB(userId: string): Promise<Document[]> {
        try {
            const filter = { userId: userId };
            const retriever = this.chromaClient.asRetriever({
                // Optional filter
                filter: filter,
                k: 2,
              });
              let res = await retriever.invoke("empty");
            console.log(res);
            return res;
        } catch (error) {
            console.error("Error searching documents in Chroma:", error);
            throw new Error(`Error searching documents in Chroma: ${error.message}`);
        }
    }
    private async storeInChromaDB(userId: string, file: Express.Multer.File, text: string): Promise<void> {
            try {
                const document1: Document = {
                    pageContent: text,
                    metadata: { filename: file.originalname, userId: userId },
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

import { Controller, Post, UploadedFile, UseInterceptors, Param, BadRequestException, Get, Body, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ApiTags, ApiConsumes, ApiBody, ApiParam, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VectorService } from './vector.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { TextLoader } from 'langchain/document_loaders/fs/text';

@ApiTags('vector')
@Controller('vector')
export class VectorController {
    constructor(private readonly vectorService: VectorService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: multer.diskStorage({
            destination: '/usr/src/app/uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
            },
        }),
        fileFilter: (req, file, cb) => {
            const allowedMimeTypes = [
                'text/plain',           // txt
                'application/json',     // json
                'application/pdf',      // pdf
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            ];
            
            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException('Only txt, json, pdf, and docx files are allowed'), false);
            }
        },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Supported file types: txt, json, pdf, docx',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'The file has been successfully uploaded and processed.' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async uploadAndProcessDocument(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        try {
            let docs;
            
            // 使用不同的 Loader 处理文件
            switch (file.mimetype) {
                case 'text/plain':
                    const textLoader = new TextLoader(file.path);
                    docs = await textLoader.load();
                    break;
                    
                case 'application/json':
                    const jsonLoader = new JSONLoader(file.path);
                    docs = await jsonLoader.load();
                    break;
                    
                case 'application/pdf':
                    const pdfLoader = new PDFLoader(file.path);
                    docs = await pdfLoader.load();
                    break;
                    
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    const docxLoader = new DocxLoader(file.path);
                    docs = await docxLoader.load();
                    break;
                    
                default:
                    throw new BadRequestException('Unsupported file type');
            }

            // 合并所有文档内容
            const text = docs.map(doc => doc.pageContent).join('\n');
            
            // 存储到向量数据库
            await this.vectorService.storeInChromaDB(file, text, { id: req.user.id });

            // 处理完成后删除上传的文件
            await fs.unlink(file.path);

            return { 
                message: 'File processed and stored successfully',
                documentCount: docs.length
            };
        } catch (error) {
            // 确保在发生错误时也清理文件
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }

            console.error('Error processing file:', error);
            throw new BadRequestException(`Error processing file: ${error.message}`);
        }
    }
    
    @Post('search')
    @UseGuards(JwtAuthGuard)  // 添加认证守卫
    @ApiBearerAuth('access-token')  // 添加 Swagger 认证标记
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                question: { type: 'string' },
            },
            required: ['id', 'question'],
        },
    })
    @ApiOperation({ summary: 'Search for similar documents' })
    @ApiResponse({ status: 200, description: 'Successfully retrieved similar documents' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async searchForSimilarDocuments(
        @Body() body: { id: string, question: string }
    ) {
        const { id, question } = body;

        if (!id) {
            throw new BadRequestException('No ID provided');
        }
        if (!question) {
            throw new BadRequestException('No question provided');
        }

        try {
            const results = await this.vectorService.searchInChromaDB(id, question);
            return { 
                success: true,
                results 
            };
        } catch (error) {
            console.error('Error searching for similar documents:', error);
            throw new BadRequestException(`Error searching for similar documents: ${error.message}`);
        }
    }

}

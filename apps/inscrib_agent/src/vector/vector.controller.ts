import { Controller, Post, UploadedFile, UseInterceptors, Param, BadRequestException, Get, Body, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ApiTags, ApiConsumes, ApiBody, ApiParam, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VectorService } from './vector.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@ApiTags('vector')
@Controller('vector')
export class VectorController {
    constructor(private readonly vectorService: VectorService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token') // 添加这个装饰器
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
            if (file.mimetype === 'text/plain') {
                cb(null, true);
            } else {
                cb(new BadRequestException('Only text files are allowed'), false);
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
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'The file has been successfully uploaded and processed.' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async uploadAndProcessDocument(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any, // 添加这个参数
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        try {
            const text = await fs.readFile(file.path, 'utf-8');
            await this.vectorService.storeInChromaDB(file, text, req.user.id);
            return { message: 'File processed and stored successfully' };
        } catch (error) {
            console.error('Error processing file:', error);
            throw new BadRequestException(`Error processing file: ${error.message}`);
        }
    }
    
    @Post('search')
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
            return { results };
        } catch (error) {
            console.error('Error searching for similar documents:', error);
            throw new BadRequestException(`Error searching for similar documents: ${error.message}`);
        }
    }
}

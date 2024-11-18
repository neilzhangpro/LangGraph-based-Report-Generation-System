import { Controller, Post, UploadedFile, UseInterceptors, Param, BadRequestException, Get, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ApiTags, ApiConsumes, ApiBody, ApiParam, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VectorService } from './vector.service';


@ApiTags('vector')
@Controller('vector')
export class VectorController {
    constructor(private readonly vectorService: VectorService) {}
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
            await this.vectorService.storeInChromaDB(userId, file, text);
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
                userId: { type: 'string' },
                question: { type: 'string' },
            },
            required: ['userId', 'question'],
        },
    })
    @ApiOperation({ summary: 'Search for similar documents' })
    async searchForSimilarDocuments(
        @Body() body: { userId: string, question: string }
    ) {
        const { userId, question } = body;

        if (!userId) {
            throw new BadRequestException('No user ID provided');
        }
        if (!question) {
            throw new BadRequestException('No question provided');
        }

        try {
            const results = await this.vectorService.searchInChromaDB(userId, question);
            return { results };
        } catch (error) {
            console.error('Error searching for similar documents:', error);
            throw new BadRequestException(`Error searching for similar documents: ${error.message}`);
        }
    }
}

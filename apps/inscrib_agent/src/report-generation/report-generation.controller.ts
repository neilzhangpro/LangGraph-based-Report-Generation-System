import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ReportGenerationService } from './report-generation.service';
import { ApiQuery } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as multer from 'multer';


@Controller('report-generation')
export class ReportGenerationController {
  constructor(
    private readonly reportGenerationService: ReportGenerationService,
  ) {}

  @Get('/test')
  @ApiQuery({ name: 'DocsPath', required: true, type: String })
  @ApiQuery({ name: 'TemplatePath', required: false, type: String })
  async getHello(@Query() query: { DocsPath: string; TemplatePath: string }) {
    try {
      return this.reportGenerationService.getHello(query);
    } catch (e) {
      console.log(e);
      await this.cleanupTemporaryFile(query.DocsPath);
    }
  }

  @Post('/upload/:userId')
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
    @Param('userId') userId: string,
  ): Promise<{ DocsPath: string; userId: string }> {
    const DocsPath = await this.saveTemporaryFile(file);
    return {
      DocsPath,
      userId,
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

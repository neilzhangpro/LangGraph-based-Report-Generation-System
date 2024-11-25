import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
Request,
} from '@nestjs/common';
import { ReportGenerationService } from './report-generation.service';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as multer from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@Controller('report-generation')
export class ReportGenerationController {
  constructor(
    private readonly reportGenerationService: ReportGenerationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token') // 添加这个装饰器
  @Get('/generate')
  @ApiQuery({ name: 'UploadFile', required: true, type: String })
  @ApiQuery({ name: 'TemplatePath', required: false, type: String })
  async getHello(
    @Query() query: { UploadFile: string; TemplatePath: string },
    @Request() req // 添加这个参数
  ): Promise<any> {
    try {
      console.log('Full request headers:', req.headers); // 检查完整的请求头
      console.log('Authorization header:', req.headers.authorization); // 检查授权头
      console.log('Controller req.user:', req.user); // 检查用户信息
      return this.reportGenerationService.getHello(query, req.user);
    } catch (e) {
      console.log(e);
      await this.cleanupTemporaryFile(query.UploadFile);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token') // 添加这个装饰器
  @Post('/upload')
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
  ): Promise<{ UploadFile: string;}> {
    const UploadFile = await this.saveTemporaryFile(file);
    return {
      UploadFile
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

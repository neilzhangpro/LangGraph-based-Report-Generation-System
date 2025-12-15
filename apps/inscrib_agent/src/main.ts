import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（包括浏览器直接访问）
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        /^http:\/\/localhost(:\d+)?$/,        // 所有 localhost 端口
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,     // 127.0.0.1 所有端口
      ];

      const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.setGlobalPrefix('api');

  //swagger
  const config = new DocumentBuilder()
    .setTitle('LangGraph Report Generation API')
    .setDescription('API for LangGraph-based report generation system')
    .setVersion('1.0')
    .addTag('report-generation')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Please enter JWT token',
        in: 'header',
      },
      'access-token', // 这个名称要和装饰器中的一致
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);
  await app.listen(3000, '0.0.0.0');
}
bootstrap();

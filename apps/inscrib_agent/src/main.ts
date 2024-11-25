import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 确保上传目录存在
  /*const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }*/
  //swagger
  const config = new DocumentBuilder()
    .setTitle('Inscrib Agent')
    .setDescription('The inscrib agent API description')
    .setVersion('1.0')
    .addTag('inscrib agent')
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
  SwaggerModule.setup('api', app, document);
  await app.listen(3000,'0.0.0.0');
}
bootstrap();

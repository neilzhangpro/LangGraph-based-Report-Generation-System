import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 确保上传目录存在
  /*const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }*/
  //开启CORS
  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（比如移动端应用）
      if (!origin) {
        return callback(null, true);
      }

      try {
        const url = new URL(origin);

        // 检查是否允许访问
        const isAllowed =
          // 允许所有 localhost 端口
          url.hostname === 'localhost' ||
          // 允许特定 IP 的所有端口
          url.hostname === '34.31.147.139' ||
          // 允许特定域名（包括子域名）
          url.hostname === 'ironmind.ai' ||
          url.hostname.endsWith('.ironmind.ai');

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } catch (err) {
        callback(new Error('Invalid origin'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // 如果需要支持跨域携带凭证
    allowedHeaders: 'Content-Type, Accept, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.setGlobalPrefix('api');

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
  SwaggerModule.setup('api-doc', app, document);
  await app.listen(3000, '0.0.0.0');
}

bootstrap();

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { VectorController } from './vector/vector.controller';
import { VectorService } from './vector/vector.service';
import { ReportGenerationModule } from './report-generation/report-generation.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用程序中全局可用
    }),
    ReportGenerationModule,
    AuthModule,
  ],
  controllers: [AppController, VectorController],
  providers: [AppService, VectorService],
  exports: [VectorService],
})
export class AppModule {}

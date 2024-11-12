import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReportsController } from './reports/reports.controller';
import { ConfigModule } from '@nestjs/config';
import { VectorController } from './vector/vector.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用程序中全局可用
    }),
  ],
  controllers: [AppController, ReportsController, VectorController],
  providers: [AppService],
})
export class AppModule {}

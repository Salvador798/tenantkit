import { Module } from '@nestjs/common';
import { HealthController } from './infrastructure/health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

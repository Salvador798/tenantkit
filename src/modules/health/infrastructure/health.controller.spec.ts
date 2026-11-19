import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { DATABASE_POOL } from '../../../database/database.tokens.js';
import { REDIS_CLIENT } from '../../../shared/redis/redis.tokens.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;
  let poolMock: { query: ReturnType<typeof vi.fn> };
  let redisMock: { ping: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    poolMock = {
      query: vi.fn(),
    };
    redisMock = {
      ping: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DATABASE_POOL,
          useValue: poolMock,
        },
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('returns ok status with an ISO timestamp', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    });
  });

  describe('getReadiness', () => {
    it('returns ok when both postgres and redis are healthy', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      redisMock.ping.mockResolvedValueOnce('PONG');

      const result = await controller.getReadiness();

      expect(poolMock.query).toHaveBeenCalledWith('SELECT 1');
      expect(redisMock.ping).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        status: 'ok',
        services: {
          postgres: 'up',
          redis: 'up',
        },
      });
    });

    it('throws ServiceUnavailableException when postgres is down', async () => {
      poolMock.query.mockRejectedValueOnce(new Error('Connection refused'));
      redisMock.ping.mockResolvedValueOnce('PONG');

      try {
        await controller.getReadiness();
        expect.unreachable('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect((error as ServiceUnavailableException).getResponse()).toEqual({
          status: 'error',
          services: {
            postgres: 'down',
            redis: 'up',
          },
        });
      }
    });

    it('throws ServiceUnavailableException when redis is down', async () => {
      poolMock.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      redisMock.ping.mockRejectedValueOnce(new Error('Redis unreachable'));

      try {
        await controller.getReadiness();
        expect.unreachable('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect((error as ServiceUnavailableException).getResponse()).toEqual({
          status: 'error',
          services: {
            postgres: 'up',
            redis: 'down',
          },
        });
      }
    });

    it('throws ServiceUnavailableException when both services are down', async () => {
      poolMock.query.mockRejectedValueOnce(new Error('DB down'));
      redisMock.ping.mockRejectedValueOnce(new Error('Redis down'));

      try {
        await controller.getReadiness();
        expect.unreachable('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect((error as ServiceUnavailableException).getResponse()).toEqual({
          status: 'error',
          services: {
            postgres: 'down',
            redis: 'down',
          },
        });
      }
    });
  });
});

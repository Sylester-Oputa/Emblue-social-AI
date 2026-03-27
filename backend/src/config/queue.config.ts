import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  defaultAttempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3', 10),
  defaultBackoff: parseInt(process.env.QUEUE_DEFAULT_BACKOFF || '3000', 10),
}));

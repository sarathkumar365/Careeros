import {
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type Options,
} from 'amqplib';
import {
  RABBITMQ_CHANNEL_TOKEN,
  RABBITMQ_CONNECTION_TOKEN,
} from './rabbitmq.tokens';

const DEFAULT_RABBIT_URL = 'amqp://default:default@localhost:5672';

// BUG: A dropped RabbitMQ connection leaves this singleton channel dead until
// the Nest process restarts;
// TODO: add automatic reconnect/backoff logic and channel recreation.
async function createConnection(logger: Logger): Promise<ChannelModel> {
  const url = process.env.RABBITMQ_URL ?? DEFAULT_RABBIT_URL;
  const socketOptions: Options.Connect = {};

  logger.log(`Connecting to RabbitMQ at ${url}`);
  const connection = await connect(url, socketOptions);

  connection.on('error', (error) => {
    logger.error(`RabbitMQ connection error: ${(error as Error).message}`);
  });

  connection.on('close', () => {
    logger.warn('RabbitMQ connection closed');
  });

  return connection;
}

async function createChannel(
  connection: ChannelModel,
  logger: Logger,
): Promise<ConfirmChannel> {
  const channel = await connection.createConfirmChannel();

  const prefetch = Number.parseInt(process.env.RABBITMQ_PREFETCH ?? '5', 10);
  if (Number.isFinite(prefetch) && prefetch > 0) {
    await channel.prefetch(prefetch);
    logger.log(`RabbitMQ channel prefetch set to ${prefetch}`);
  }

  return channel;
}

@Injectable()
class RabbitMqShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqShutdownService.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL_TOKEN)
    private readonly channel: ConfirmChannel,
    @Inject(RABBITMQ_CONNECTION_TOKEN)
    private readonly connection: ChannelModel,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.channel.close();
      this.logger.log('RabbitMQ channel closed');
    } catch (error) {
      this.logger.warn(
        `Failed to close RabbitMQ channel: ${(error as Error).message}`,
      );
    }

    try {
      await this.connection.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.warn(
        `Failed to close RabbitMQ connection: ${(error as Error).message}`,
      );
    }
  }
}

@Module({
  providers: [
    Logger,
    {
      provide: RABBITMQ_CONNECTION_TOKEN,
      inject: [Logger],
      useFactory: async (logger: Logger) => createConnection(logger),
    },
    {
      provide: RABBITMQ_CHANNEL_TOKEN,
      inject: [RABBITMQ_CONNECTION_TOKEN, Logger],
      useFactory: async (connection: ChannelModel, logger: Logger) =>
        createChannel(connection, logger),
    },
    RabbitMqShutdownService,
  ],
  exports: [RABBITMQ_CONNECTION_TOKEN, RABBITMQ_CHANNEL_TOKEN],
})
export class RabbitMqModule {}

// Valkey バックエンド実装

import Redis from 'ioredis';
import { StorageBackend, Message } from './interface.js';

export interface ValkeyConfig {
  host?: string;
  port?: number;
  db?: number;
  password?: string;
  prefix?: string;
}

export class ValkeyBackend implements StorageBackend {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private prefix: string;
  private subscriptions: Map<string, (message: Message) => void> = new Map();

  constructor(config: ValkeyConfig = {}) {
    const {
      host = 'localhost',
      port = 6379,
      db = 0,
      password,
      prefix = 'agent-team',
    } = config;

    this.prefix = prefix;

    const redisOptions: any = {
      host,
      port,
      db,
      lazyConnect: true,
    };

    if (password) {
      redisOptions.password = password;
    }

    this.client = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);
    this.publisher = new Redis(redisOptions);

    // エラーハンドリング
    this.client.on('error', (err) => console.error('[Valkey Client] Error:', err));
    this.subscriber.on('error', (err) => console.error('[Valkey Subscriber] Error:', err));
    this.publisher.on('error', (err) => console.error('[Valkey Publisher] Error:', err));
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.client.connect(),
      this.subscriber.connect(),
      this.publisher.connect(),
    ]);

    // Pub/Sub リスナーを設定
    this.subscriber.on('message', (channel, data) => {
      const callback = this.subscriptions.get(channel);
      if (callback) {
        try {
          const message: Message = JSON.parse(data);
          callback(message);
        } catch (error) {
          console.error('[Valkey] Failed to parse message:', error);
        }
      }
    });
  }

  private messageKey(agentId: string): string {
    return `${this.prefix}:messages:${agentId}`;
  }

  private channel(agentId: string): string {
    return `${this.prefix}:channel:${agentId}`;
  }

  private stateKey(key: string): string {
    return `${this.prefix}:state:${key}`;
  }

  private lockKey(resource: string): string {
    return `${this.prefix}:lock:${resource}`;
  }

  async writeMessage(agentId: string, message: Message): Promise<void> {
    const key = this.messageKey(agentId);

    // リストに追加（LPUSH）
    await this.client.lpush(key, JSON.stringify(message));
  }

  async readMessages(agentId: string): Promise<Message[]> {
    const key = this.messageKey(agentId);

    // すべてのメッセージを取得（LRANGE 0 -1）
    const messages = await this.client.lrange(key, 0, -1);

    // 逆順にする（LPUSH したので古い順にする）
    return messages.reverse().map(m => JSON.parse(m));
  }

  async clearMessages(agentId: string): Promise<void> {
    const key = this.messageKey(agentId);
    await this.client.del(key);
  }

  async subscribe(channel: string, callback: (message: Message) => void): Promise<void> {
    const fullChannel = this.channel(channel);
    this.subscriptions.set(fullChannel, callback);
    await this.subscriber.subscribe(fullChannel);
  }

  async publish(channel: string, message: Message): Promise<void> {
    const fullChannel = this.channel(channel);
    const data = JSON.stringify(message);
    await this.publisher.publish(fullChannel, data);
  }

  async unsubscribe(channel: string): Promise<void> {
    const fullChannel = this.channel(channel);
    this.subscriptions.delete(fullChannel);
    await this.subscriber.unsubscribe(fullChannel);
  }

  async acquireLock(resource: string, holder: string, ttl: number = 60000): Promise<boolean> {
    const key = this.lockKey(resource);
    const lockValue = `${holder}:${Date.now()}`;

    // SET NX EX コマンドでアトミックなロック取得
    const result = await this.client.set(key, lockValue, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(resource: string, holder: string): Promise<void> {
    const key = this.lockKey(resource);
    const lockValue = `${holder}:`;

    // Lua スクリプトでアトミックなロック解放
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await this.client.eval(luaScript, 1, key, lockValue);
  }

  async setState(key: string, value: any): Promise<void> {
    const fullKey = this.stateKey(key);
    await this.client.set(fullKey, JSON.stringify(value));
  }

  async getState(key: string): Promise<any> {
    const fullKey = this.stateKey(key);
    const value = await this.client.get(fullKey);

    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async close(): Promise<void> {
    // 全てのサブスクリプションを解除
    for (const channel of this.subscriptions.keys()) {
      await this.subscriber.unsubscribe(channel);
    }
    this.subscriptions.clear();

    // 接続を閉じる
    await Promise.all([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);
  }
}

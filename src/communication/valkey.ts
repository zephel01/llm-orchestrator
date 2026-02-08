// Valkey バックエンド実装

import Redis from 'ioredis';
import { StorageBackend, Message } from './interface.js';

// Redisインスタンスの型エイリアス
type RedisClient = Redis.Redis;

export interface ValkeyConfig {
  host?: string;
  port?: number;
  db?: number;
  password?: string;
  prefix?: string;
  // Redlock 用の追加設定
  redlock?: {
    driftFactor?: number;
    retryCount?: number;
    retryDelay?: number;
    retryJitter?: number;
    automaticExtensionThreshold?: number;
  };
}

export interface RedlockOptions {
  driftFactor?: number;
  retryCount?: number;
  retryDelay?: number;
  retryJitter?: number;
  automaticExtensionThreshold?: number;
}

export interface LockInfo {
  resource: string;
  holder: string;
  acquiredAt: number;
  ttl: number;
  extensionCount: number;
}

// Redlock 分散ロック実装
export class Redlock {
  private clients: RedisClient[];
  private driftFactor: number;
  private retryCount: number;
  private retryDelay: number;
  private retryJitter: number;
  private automaticExtensionThreshold: number;
  private activeLocks: Map<string, LockInfo> = new Map();
  private extensionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(clients: RedisClient[], options: RedlockOptions = {}) {
    if (clients.length === 0) {
      throw new Error('Redlock requires at least one Redis client');
    }

    this.clients = clients;
    this.driftFactor = options.driftFactor ?? 0.01;
    this.retryCount = options.retryCount ?? 10;
    this.retryDelay = options.retryDelay ?? 200;
    this.retryJitter = options.retryJitter ?? 50;
    this.automaticExtensionThreshold = options.automaticExtensionThreshold ?? 0.5;
  }

  /**
   * 分散ロックを取得する
   */
  async acquireLock(
    resource: string,
    holder: string,
    ttl: number
  ): Promise<LockInfo | null> {
    const lockValue = `${holder}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const drift = Math.floor(this.driftFactor * ttl) + 2;

    let attempts = 0;
    while (attempts < this.retryCount) {
      const startTime = Date.now();
      let successes = 0;
      const promises: Promise<'OK' | null>[] = [];

      // 全クライアントでロック取得を試行
      for (const client of this.clients) {
        promises.push(
          client.set(resource, lockValue, 'PX', ttl, 'NX')
        );
      }

      const results = await Promise.all(promises);

      // 成功した数をカウント
      for (const result of results) {
        if (result === 'OK') {
          successes++;
        }
      }

      const elapsedTime = Date.now() - startTime;
      const validityTime = ttl - elapsedTime - drift;

      // 過半数以上で成功し、有効時間が残っている場合
      if (successes >= Math.floor(this.clients.length / 2) + 1 && validityTime > 0) {
        const lockInfo: LockInfo = {
          resource,
          holder,
          acquiredAt: Date.now(),
          ttl,
          extensionCount: 0,
        };

        // 自動延長を設定
        this.setupAutomaticExtension(resource, lockValue, ttl);

        return lockInfo;
      }

      // 失敗した場合、取得したロックを解放してリトライ
      await this.unlockInternal(resource, lockValue);

      // リトライ前に待機
      const delay = this.retryDelay + Math.floor(Math.random() * this.retryJitter);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }

    return null;
  }

  /**
   * ロックを解放する
   */
  async releaseLock(resource: string, holder: string): Promise<boolean> {
    const lockValue = `${holder}:`;
    return await this.unlockInternal(resource, lockValue);
  }

  /**
   * ロックを延長する
   */
  async extendLock(
    resource: string,
    holder: string,
    ttl: number
  ): Promise<boolean> {
    const lockValuePrefix = `${holder}:`;
    let successes = 0;
    const promises: Promise<unknown>[] = [];

    const drift = Math.floor(this.driftFactor * ttl) + 2;
    const startTime = Date.now();

    for (const client of this.clients) {
      const script = `
        local value = redis.call("get", KEYS[1])
        if value and string.sub(value, 1, #ARGV[1]) == ARGV[1] then
          redis.call("pexpire", KEYS[1], ARGV[2])
          return 1
        else
          return 0
        end
      `;
      promises.push(
        client.eval(script, 1, resource, lockValuePrefix, ttl)
      );
    }

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result === 1) {
        successes++;
      }
    }

    const elapsedTime = Date.now() - startTime;
    const validityTime = ttl - elapsedTime - drift;

    if (successes >= Math.floor(this.clients.length / 2) + 1 && validityTime > 0) {
      // 延長成功
      const key = `${resource}:${lockValuePrefix}`;
      if (this.activeLocks.has(key)) {
        const lockInfo = this.activeLocks.get(key)!;
        lockInfo.extensionCount++;
        this.activeLocks.set(key, lockInfo);
      }

      // 自動延長タイマーを再設定
      this.setupAutomaticExtension(resource, lockValuePrefix, ttl);

      return true;
    }

    return false;
  }

  /**
   * ロックの所有権を確認する
   */
  async isLockedBy(resource: string, holder: string): Promise<boolean> {
    const lockValuePrefix = `${holder}:`;

    for (const client of this.clients) {
      const value = await client.get(resource);
      if (value && value.startsWith(lockValuePrefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 自動延長をセットアップする
   */
  private setupAutomaticExtension(resource: string, lockValue: string, ttl: number): void {
    const key = `${resource}:${lockValue}`;

    // 既存のタイマーをクリア
    const existingTimer = this.extensionTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 閾値に達した時間に延長を試みる
    const delay = Math.floor(ttl * this.automaticExtensionThreshold);
    const timer = setTimeout(async () => {
      try {
        const holder = lockValue.split(':')[0];
        const success = await this.extendLock(resource, holder, ttl);

        if (!success) {
          // 延長失敗の場合、ロック情報をクリア
          this.activeLocks.delete(key);
          this.extensionTimers.delete(key);
        }
      } catch (error) {
        console.error('[Redlock] Extension failed:', error);
        this.activeLocks.delete(key);
        this.extensionTimers.delete(key);
      }
    }, delay);

    this.extensionTimers.set(key, timer);
  }

  /**
   * 内部ロック解放（Lua スクリプトを使用）
   */
  private async unlockInternal(resource: string, lockValuePrefix: string): Promise<boolean> {
    let successes = 0;

    const script = `
      if redis.call("get", KEYS[1]) and string.sub(redis.call("get", KEYS[1]), 1, #ARGV[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const promises = this.clients.map(client =>
      client.eval(script, 1, resource, lockValuePrefix)
    );

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result === 1) {
        successes++;
      }
    }

    // タイマーをクリア
    const key = `${resource}:${lockValuePrefix}`;
    const timer = this.extensionTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.extensionTimers.delete(key);
    }
    this.activeLocks.delete(key);

    return successes >= Math.floor(this.clients.length / 2) + 1;
  }

  /**
   * 全てのロックを解放する
   */
  async releaseAllLocks(holder: string): Promise<void> {
    const locks = Array.from(this.activeLocks.values());

    for (const lock of locks) {
      if (lock.holder === holder) {
        await this.releaseLock(lock.resource, lock.holder);
      }
    }
  }
}

export class ValkeyBackend implements StorageBackend {
  private client: RedisClient;
  private subscriber: RedisClient;
  private publisher: RedisClient;
  private prefix: string;
  private subscriptions: Map<string, (message: Message) => void> = new Map();
  private redlock?: Redlock;

  constructor(config: ValkeyConfig = {}) {
    const {
      host = 'localhost',
      port = 6379,
      db = 0,
      password,
      prefix = 'agent-team',
      redlock,
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

    // Redlock を初期化（オプション）
    if (redlock) {
      this.redlock = new Redlock([this.client], redlock);
    }

    // エラーハンドリング
    this.client.on('error', (err: Error) => console.error('[Valkey Client] Error:', err));
    this.subscriber.on('error', (err: Error) => console.error('[Valkey Subscriber] Error:', err));
    this.publisher.on('error', (err: Error) => console.error('[Valkey Publisher] Error:', err));
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.client.connect(),
      this.subscriber.connect(),
      this.publisher.connect(),
    ]);

    // Pub/Sub リスナーを設定
    this.subscriber.on('message', (channel: string, data: string) => {
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
    return messages.reverse().map((m: string) => JSON.parse(m));
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
    // Redlock が利用可能な場合は Redlock を使用
    if (this.redlock) {
      const lockInfo = await this.redlock.acquireLock(this.lockKey(resource), holder, ttl);
      return lockInfo !== null;
    }

    // 基本的なロック取得
    const key = this.lockKey(resource);
    const lockValue = `${holder}:${Date.now()}`;

    // SET NX EX コマンドでアトミックなロック取得
    const result = await this.client.set(key, lockValue, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(resource: string, holder: string): Promise<void> {
    // Redlock が利用可能な場合は Redlock を使用
    if (this.redlock) {
      await this.redlock.releaseLock(this.lockKey(resource), holder);
      return;
    }

    // 基本的なロック解放
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
    // Redlock の全ロックを解放
    if (this.redlock) {
      // 注: Redlock の全ロック解放は現在の実装では holder が必要
      // 将来的にはホルダー情報を追跡して解放する
    }

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

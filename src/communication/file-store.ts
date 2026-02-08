// ファイルベースメッセージングシステム

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import type { Message } from './interface.js';

export { Message };


export interface CommunicationBus {
  write(targetId: string, message: Message): Promise<void>;
  broadcast(message: Message): Promise<void>;
  read(agentId: string): Promise<Message[]>;
  markRead(agentId: string, messageId: string): Promise<void>;
  clear(agentId: string): Promise<void>;
  acquireLock(resource: string, agentId: string): Promise<boolean>;
  releaseLock(resource: string, agentId: string): Promise<void>;
}


// StorageBackend 互換の拡張インターフェース
export interface FileBackendConfig {
  basePath?: string;
  teamName?: string;
}

export class FileCommunicationBus implements CommunicationBus {
  private basePath: string;
  private teamName: string;
  // Pub/Sub エミュレーション用
  private subscriptions: Map<string, (message: Message) => void> = new Map();
  // 状態管理用
  private state: Map<string, any> = new Map();

  constructor(teamName: string, basePath?: string) {
    this.teamName = teamName;
    this.basePath = basePath || path.join(process.env.HOME || '.', '.llm-orchestrator', 'teams', teamName);
  }

  // StorageBackend 互換のコンストラクタ（ファクトリーから呼ばれる用）
  static fromConfig(config: FileBackendConfig): FileCommunicationBus {
    const teamName = config.teamName || 'default';
    return new FileCommunicationBus(teamName, config.basePath);
  }

  async initialize(): Promise<void> {
    const dirs = [
      path.join(this.basePath, 'messages'),
      path.join(this.basePath, 'shared'),
      path.join(this.basePath, 'logs'),
      path.join(process.env.HOME || '.', '.llm-orchestrator', 'locks'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private getMessagePath(agentId: string): string {
    return path.join(this.basePath, 'messages', `${agentId}.json`);
  }

  // StorageBackend 互換メソッド: writeMessage
  async writeMessage(agentId: string, message: Message): Promise<void> {
    await this.write(agentId, message);
  }

  // StorageBackend 互換メソッド: readMessages
  async readMessages(agentId: string): Promise<Message[]> {
    const messagePath = this.getMessagePath(agentId);
    if (!existsSync(messagePath)) {
      return [];
    }

    try {
      const content = await fs.readFile(messagePath, 'utf-8');
      if (!content || !content.trim()) {
        return [];
      }
      const messages: Message[] = JSON.parse(content);
      return messages;
    } catch (error) {
      console.error(`[FileCommunicationBus] Error reading messages from ${messagePath}:`, error);
      return [];
    }
  }

  async write(targetId: string, message: Message): Promise<void> {
    const messagePath = this.getMessagePath(targetId);

    let messages: Message[] = [];
    try {
      if (existsSync(messagePath)) {
        const content = await fs.readFile(messagePath, 'utf-8');
        if (content.trim()) {
          messages = JSON.parse(content);
        }
      }
    } catch (error) {
      console.error(`[FileCommunicationBus] Error reading message file: ${messagePath}`, error);
      messages = [];
    }

    messages.push(message);
    try {
      await fs.writeFile(messagePath, JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error(`[FileCommunicationBus] Error writing message file: ${messagePath}`, error);
    }
  }

  async broadcast(message: Message): Promise<void> {
    const messagesDir = path.join(this.basePath, 'messages');
    const files = await fs.readdir(messagesDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const agentId = file.replace('.json', '');
        await this.write(agentId, message);
      }
    }
  }

  async read(agentId: string): Promise<Message[]> {
    const messagePath = this.getMessagePath(agentId);
    if (!existsSync(messagePath)) {
      return [];
    }

    const content = await fs.readFile(messagePath, 'utf-8');
    const messages: Message[] = JSON.parse(content);

    // 未読のメッセージのみ返す
    return messages.filter(m => m.status === 'pending' || m.status === 'delivered');
  }

  async markRead(agentId: string, messageId: string): Promise<void> {
    const messagePath = this.getMessagePath(agentId);
    if (!existsSync(messagePath))
      return;

    const content = await fs.readFile(messagePath, 'utf-8');
    const messages: Message[] = JSON.parse(content);

    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.status = 'read';
    }

    await fs.writeFile(messagePath, JSON.stringify(messages, null, 2));
  }

  async clear(agentId: string): Promise<void> {
    const messagePath = this.getMessagePath(agentId);
    await fs.writeFile(messagePath, JSON.stringify([], null, 2));
  }

  // StorageBackend 互換メソッド: clearMessages
  async clearMessages(agentId: string): Promise<void> {
    await this.clear(agentId);
  }

  // StorageBackend 互換メソッド: subscribe (ファイルベースなのでエミュレーション)
  async subscribe(channel: string, callback: (message: Message) => void): Promise<void> {
    this.subscriptions.set(channel, callback);
  }

  // StorageBackend 互換メソッド: publish (ファイルベースなのでエミュレーション)
  async publish(channel: string, message: Message): Promise<void> {
    const callback = this.subscriptions.get(channel);
    if (callback) {
      // 非同期でコールバックを実行
      setImmediate(() => callback(message));
    }
  }

  // StorageBackend 互換メソッド: unsubscribe
  async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
  }

  private getLockPath(resource: string): string {
    return path.join(process.env.HOME || '.', '.llm-orchestrator', 'locks', `${resource}.${this.teamName}.lock`);
  }

  // StorageBackend 互換メソッド: acquireLock (TTL パラメータ追加)
  async acquireLock(resource: string, holder: string, ttl: number = 60000): Promise<boolean> {
    return await this.acquireLockInternal(resource, holder, ttl);
  }

  async acquireLockInternal(resource: string, agentId: string, timeout: number = 60000): Promise<boolean> {
    const lockPath = this.getLockPath(resource);
    const now = Date.now();

    // 既存のロックをチェック
    if (existsSync(lockPath)) {
      const content = await fs.readFile(lockPath, 'utf-8');
      const lock = JSON.parse(content);

      // ロックが期限切れの場合は解放
      if (now - lock.acquiredAt > timeout) {
        await this.releaseLock(resource, lock.holder);
      } else {
        return false;
      }
    }

    // 新しいロックを作成
    const lockData = {
      holder: agentId,
      acquiredAt: now,
    };
    await fs.writeFile(lockPath, JSON.stringify(lockData, null, 2));
    return true;
  }

  async releaseLock(resource: string, agentId: string): Promise<void> {
    const lockPath = this.getLockPath(resource);

    if (existsSync(lockPath)) {
      const content = await fs.readFile(lockPath, 'utf-8');
      const lock = JSON.parse(content);

      if (lock.holder === agentId) {
        await fs.unlink(lockPath);
      }
    }
  }

  // StorageBackend 互換メソッド: setState
  async setState(key: string, value: any): Promise<void> {
    const statePath = path.join(this.basePath, 'shared', `${key}.json`);
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(value, null, 2));
    this.state.set(key, value);
  }

  // StorageBackend 互換メソッド: getState
  async getState(key: string): Promise<any> {
    // まずメモリ上の値を確認
    if (this.state.has(key)) {
      return this.state.get(key);
    }

    const statePath = path.join(this.basePath, 'shared', `${key}.json`);
    if (!existsSync(statePath)) {
      return null;
    }

    const content = await fs.readFile(statePath, 'utf-8');
    const value = JSON.parse(content);
    this.state.set(key, value);
    return value;
  }

  // StorageBackend 互換メソッド: close
  async close(): Promise<void> {
    // 全てのサブスクリプションを解除
    this.subscriptions.clear();
    this.state.clear();
  }

  // チーム名を取得
  getTeamName(): string {
    return this.teamName;
  }

  // ベースパスを取得
  getBasePath(): string {
    return this.basePath;
  }
}

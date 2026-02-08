// ファイルベースメッセージングシステム

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface Message {
  id: string;
  from: string;
  to: string | '*';
  type: 'command' | 'report' | 'proposal' | 'approval' | 'broadcast' | 'response';
  content: any;
  timestamp: number;
  status: 'pending' | 'delivered' | 'read' | 'processed';
}

export interface CommunicationBus {
  write(targetId: string, message: Message): Promise<void>;
  broadcast(message: Message): Promise<void>;
  read(agentId: string): Promise<Message[]>;
  markRead(agentId: string, messageId: string): Promise<void>;
  clear(agentId: string): Promise<void>;
  acquireLock(resource: string, agentId: string): Promise<boolean>;
  releaseLock(resource: string, agentId: string): Promise<void>;
}

export class FileCommunicationBus implements CommunicationBus {
  private basePath: string;
  private teamName: string;

  constructor(teamName: string, basePath?: string) {
    this.teamName = teamName;
    this.basePath = basePath || path.join(process.env.HOME || '.', '.llm-orchestrator', 'teams', teamName);
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

  async write(targetId: string, message: Message): Promise<void> {
    const messagePath = this.getMessagePath(targetId);

    let messages: Message[] = [];
    if (existsSync(messagePath)) {
      const content = await fs.readFile(messagePath, 'utf-8');
      messages = JSON.parse(content);
    }

    messages.push(message);
    await fs.writeFile(messagePath, JSON.stringify(messages, null, 2));
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
    if (!existsSync(messagePath)) return;

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

  private getLockPath(resource: string): string {
    return path.join(process.env.HOME || '.', '.llm-orchestrator', 'locks', `${resource}.${this.teamName}.lock`);
  }

  async acquireLock(resource: string, agentId: string, timeout: number = 60000): Promise<boolean> {
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
}

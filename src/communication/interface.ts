// ストレージ抽象化インターフェース

import { Message } from './file-store.js';

export { Message };


export interface StorageBackend {
  // 初期化
  initialize(): Promise<void>;

  // メッセージ保存・取得
  writeMessage(agentId: string, message: Message): Promise<void>;
  readMessages(agentId: string): Promise<Message[]>;

  // Pub/Sub
  subscribe(channel: string, callback: (message: Message) => void): Promise<void>;
  publish(channel: string, message: Message): Promise<void>;
  unsubscribe(channel: string): Promise<void>;

  // ロック
  acquireLock(resource: string, holder: string, ttl: number): Promise<boolean>;
  releaseLock(resource: string, holder: string): Promise<void>;

  // 状態管理
  setState(key: string, value: any): Promise<void>;
  getState(key: string): Promise<any>;

  // クリーンアップ
  close(): Promise<void>;
}

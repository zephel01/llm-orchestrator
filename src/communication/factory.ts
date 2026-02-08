// Communication backend factory

import { StorageBackend } from './interface.js';
import { FileCommunicationBus } from './file-store.js';
import { ValkeyBackend, ValkeyConfig } from './valkey.js';

export type BackendType = 'file' | 'valkey';

export interface BackendConfig {
  type: BackendType;
  // ファイルバックエンド用設定
  basePath?: string;
  teamName?: string;
  // Valkey バックエンド用設定
  valkey?: ValkeyConfig;
}

/**
 * 通信バックエンドを作成するファクトリー関数
 */
export function createBackend(config: BackendConfig): StorageBackend {
  switch (config.type) {
    case 'file':
      // チーム名が必要
      const teamName = config.teamName || 'default';
      const basePath = config.basePath || path.join(process.env.HOME || '.', '.llm-orchestrator');
      return new FileCommunicationBus(teamName, basePath);

    case 'valkey':
      return new ValkeyBackend(config.valkey);

    default:
      throw new Error(`Unknown backend type: ${(config as any).type}`);
  }
}

/**
 * 環境変数からバックエンド設定を取得するユーティリティ関数
 */
export function getBackendConfigFromEnv(teamName: string = 'default'): BackendConfig {
  const backendType = process.env.LLM_ORCHESTRATOR_BACKEND as BackendType || 'file';

  const config: BackendConfig = {
    type: backendType,
    teamName,
  };

  if (backendType === 'file') {
    config.basePath = process.env.LLM_ORCHESTRATOR_DATA_PATH;
  } else if (backendType === 'valkey') {
    config.valkey = {
      host: process.env.VALKEY_HOST,
      port: process.env.VALKEY_PORT ? parseInt(process.env.VALKEY_PORT, 10) : undefined,
      db: process.env.VALKEY_DB ? parseInt(process.env.VALKEY_DB, 10) : undefined,
      password: process.env.VALKEY_PASSWORD,
      prefix: process.env.VALKEY_PREFIX,
      redlock: process.env.VALKEY_USE_REDLOCK === 'true' ? {
        driftFactor: process.env.VALKEY_REDLOCK_DRIFT_FACTOR ? parseFloat(process.env.VALKEY_REDLOCK_DRIFT_FACTOR) : undefined,
        retryCount: process.env.VALKEY_REDLOCK_RETRY_COUNT ? parseInt(process.env.VALKEY_REDLOCK_RETRY_COUNT, 10) : undefined,
        retryDelay: process.env.VALKEY_REDLOCK_RETRY_DELAY ? parseInt(process.env.VALKEY_REDLOCK_RETRY_DELAY, 10) : undefined,
        retryJitter: process.env.VALKEY_REDLOCK_RETRY_JITTER ? parseInt(process.env.VALKEY_REDLOCK_RETRY_JITTER, 10) : undefined,
        automaticExtensionThreshold: process.env.VALKEY_REDLOCK_AUTO_EXTEND_THRESHOLD ? parseFloat(process.env.VALKEY_REDLOCK_AUTO_EXTEND_THRESHOLD) : undefined,
      } : undefined,
    };
  }

  return config;
}

// path のインポートを追加
import * as path from 'path';

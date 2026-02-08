// Team Manager - チームのライフサイクル管理

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { BackendType } from '../communication/factory.js';
import { ApprovalCriteria } from '../approval/index.js';

export interface TeamConfig {
  name: string;
  createdAt: number;
  backend: BackendType;
  leadProvider: {
    type: 'anthropic' | 'openai' | 'ollama' | 'lmstudio' | 'llama-server';
    model?: string;
    baseURL?: string;
  };
  teammateProvider?: {
    type: 'anthropic' | 'openai' | 'ollama' | 'lmstudio' | 'llama-server';
    model?: string;
    baseURL?: string;
  };
  budget?: {
    maxTokens: number;
    maxCost?: number;
  };
  uiMode: 'inline' | 'split';
  approvalCriteria?: ApprovalCriteria;
}

export interface TeamInfo {
  name: string;
  createdAt: number;
  status: 'active' | 'paused' | 'completed';
  agentCount: number;
}

export interface AgentInfo {
  id: string;
  type: 'lead' | 'teammate';
  status: 'idle' | 'busy' | 'waiting_approval';
  task?: string;
}

export class TeamManager {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(process.env.HOME || '.', '.llm-orchestrator');
  }

  private getConfigPath(teamName: string): string {
    return path.join(this.getTeamPath(teamName), 'config.json');
  }

  private getStatePath(teamName: string): string {
    return path.join(this.getTeamPath(teamName), 'state.json');
  }

  async initializeGlobal(): Promise<void> {
    await fs.mkdir(path.join(this.basePath, 'teams'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'locks'), { recursive: true });
  }

  async spawnTeam(config: TeamConfig): Promise<void> {
    console.log(`[TeamManager] Spawning team: ${config.name}`);
    const teamPath = this.getTeamPath(config.name);
    console.log(`[TeamManager] Team path: ${teamPath}`);

    // チームディレクトリ作成
    await fs.mkdir(teamPath, { recursive: true });
    console.log(`[TeamManager] Created team directory`);

    await fs.mkdir(path.join(teamPath, 'messages'), { recursive: true });
    await fs.mkdir(path.join(teamPath, 'shared'), { recursive: true });
    await fs.mkdir(path.join(teamPath, 'logs'), { recursive: true });
    console.log(`[TeamManager] Created subdirectories`);

    // 設定ファイル保存
    const configPath = this.getConfigPath(config.name);
    console.log(`[TeamManager] Config path: ${configPath}`);
    console.log(`[TeamManager] Config to save:`, JSON.stringify(config, null, 2));

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`[TeamManager] Saved config file`);

    // 初期状態
    const state = {
      phase: 'initialization',
      currentTask: '',
      subtasks: [],
      agents: [],
      createdAt: Date.now(),
    };
    await fs.writeFile(this.getStatePath(config.name), JSON.stringify(state, null, 2));
    console.log(`[TeamManager] Saved state file`);

    console.log(`Team "${config.name}" created successfully.`);
  }

  async discoverTeams(): Promise<TeamInfo[]> {
    const teamsPath = path.join(this.basePath, 'teams');

    if (!existsSync(teamsPath)) {
      return [];
    }

    const dirs = await fs.readdir(teamsPath);
    const teams: TeamInfo[] = [];

    for (const dir of dirs) {
      const configPath = this.getConfigPath(dir);
      if (existsSync(configPath)) {
        const content = await fs.readFile(configPath, 'utf-8');
        const config: TeamConfig = JSON.parse(content);

        teams.push({
          name: config.name,
          createdAt: config.createdAt,
          status: 'active',
          agentCount: 1, // Lead のみ初期状態
        });
      }
    }

    return teams;
  }

  async getTeamConfig(teamName: string): Promise<TeamConfig | null> {
    const configPath = this.getConfigPath(teamName);

    if (!existsSync(configPath)) {
      return null;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  async getTeamState(teamName: string): Promise<any> {
    const statePath = this.getStatePath(teamName);

    if (!existsSync(statePath)) {
      return null;
    }

    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content);
  }

  async updateTeamState(teamName: string, updates: any): Promise<void> {
    const statePath = this.getStatePath(teamName);
    const state = await this.getTeamState(teamName) || {};

    const updatedState = { ...state, ...updates, updatedAt: Date.now() };
    await fs.writeFile(statePath, JSON.stringify(updatedState, null, 2));
  }

  async shutdownTeam(teamName: string): Promise<void> {
    const teamPath = this.getTeamPath(teamName);

    if (!existsSync(teamPath)) {
      throw new Error(`Team "${teamName}" not found.`);
    }

    // アクティブなエージェントの停止（将来実装）
    // 現在は単にディレクトリを削除
    try {
      await fs.rm(teamPath, { recursive: true, force: true });
      console.log(`Team "${teamName}" shutdown successfully.`);
      console.log(`Team "${teamName}" deleted.`);
    } catch (error) {
      throw new Error(`Error deleting team: ${error}`);
    }
  }

  getTeamPath(teamName: string): string {
    return path.join(this.basePath, 'teams', teamName);
  }
}

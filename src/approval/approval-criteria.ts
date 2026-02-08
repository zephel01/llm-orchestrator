// 承認基準クラス - 計画の承認・拒否を判断

export interface ApprovalCriteria {
  test?: TestCriteria;
  security?: SecurityCriteria;
  cost?: CostCriteria;
}

export interface TestCriteria {
  requireTests: boolean;
  testResults?: {
    passed: number;
    total: number;
  };
}

export interface SecurityCriteria {
  requireApproval: boolean;
  allowedPaths?: string[];
  blockedCommands?: string[];
}

export interface CostCriteria {
  maxTokens?: number;
  maxCost?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
}

export interface ApprovalResult {
  approved: boolean;
  reason: string;
  score: number; // 0-100、100が最善
  criteria: {
    test?: {
      passed: boolean;
      score: number;
      reason?: string;
    };
    security?: {
      passed: boolean;
      score: number;
      violations: string[];
    };
    cost?: {
      passed: boolean;
      score: number;
      warnings: string[];
    };
  };
}

export class ApprovalCriteriaEvaluator {
  /**
   * 計画の承認評価を実行
   */
  async evaluate(proposal: any, criteria: ApprovalCriteria): Promise<ApprovalResult> {
    const results = {
      test: criteria.test ? this.evaluateTest(proposal, criteria.test!) : undefined,
      security: criteria.security ? this.evaluateSecurity(proposal, criteria.security!) : undefined,
      cost: criteria.cost ? this.evaluateCost(proposal, criteria.cost!) : undefined,
    };

    // 全ての基準が通るか確認
    const allPassed = Object.values(results).every(r => r?.passed !== false);

    // 合計スコアを計算
    const scores = Object.values(results)
      .filter(r => r !== undefined)
      .map(r => r!.score);

    const avgScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 100;

    // 原因の構成
    const reasons: string[] = [];

    if (results.test && !results.test.passed) {
      reasons.push(`Test criteria not met: ${results.test.score}/100`);
    }

    if (results.security && !results.security.passed) {
      reasons.push(`Security violations: ${results.security.violations.join(', ')}`);
    }

    if (results.cost && !results.cost.passed) {
      reasons.push(`Cost exceeds limits: ${results.cost.warnings.join(', ')}`);
    }

    const overallReason = reasons.length > 0
      ? reasons.join('; ')
      : allPassed
        ? 'Plan meets all approval criteria'
        : 'Plan requires manual review';

    return {
      approved: allPassed,
      reason: overallReason,
      score: Math.round(avgScore),
      criteria: results as any,
    };
  }

  /**
   * テスト基準の評価
   */
  private evaluateTest(proposal: any, criteria: TestCriteria): { passed: boolean; score: number; reason?: string } {
    if (!criteria.requireTests) {
      return { passed: true, score: 100 };
    }

    if (!criteria.testResults) {
      return { passed: false, score: 50, reason: 'No test results provided' };
    }

    const { passed: passedCount, total } = criteria.testResults;
    const passRate = total > 0 ? (passedCount / total) * 100 : 0;

    // 80%以上のパス率で承認
    const isPassed = passRate >= 80;
    const score = Math.round(passRate);

    return { passed: isPassed, score };
  }

  /**
   * セキュリティ基準の評価
   */
  private evaluateSecurity(proposal: any, criteria: SecurityCriteria): {
    passed: boolean;
    score: number;
    violations: string[];
  } {
    const violations: string[] = [];
    let score = 100;

    // 許可されたパスチェック
    if (criteria.allowedPaths && proposal.paths) {
      const unauthorizedPaths = proposal.paths.filter((p: string) =>
        !criteria.allowedPaths!.some(allowed => p.startsWith(allowed))
      );

      if (unauthorizedPaths.length > 0) {
        violations.push(`Unauthorized paths: ${unauthorizedPaths.join(', ')}`);
        score -= 20;
      }
    }

    // 禁止されたコマンドチェック
    if (criteria.blockedCommands && proposal.commands) {
      const blockedCommands = proposal.commands.filter((cmd: string) =>
        criteria.blockedCommands!.some(blocked => cmd.includes(blocked))
      );

      if (blockedCommands.length > 0) {
        violations.push(`Blocked commands: ${blockedCommands.join(', ')}`);
        score -= 40;
      }
    }

    const passed = violations.length === 0;

    return { passed, score, violations };
  }

  /**
   * コスト基準の評価
   */
  private evaluateCost(proposal: any, criteria: CostCriteria): {
    passed: boolean;
    score: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let score = 100;

    // トークン制限チェック
    if (criteria.maxTokens && criteria.estimatedTokens) {
      if (criteria.estimatedTokens > criteria.maxTokens) {
        warnings.push(`Token usage exceeds limit: ${criteria.estimatedTokens} > ${criteria.maxTokens}`);
        score -= 30;
      } else {
        // 制限内であれば使用率をスコアに反映
        const usageRate = (criteria.estimatedTokens / criteria.maxTokens) * 100;
        score = Math.round(score - (100 - usageRate));
      }
    }

    // コスト制限チェック
    if (criteria.maxCost && criteria.estimatedCost) {
      if (criteria.estimatedCost > criteria.maxCost) {
        warnings.push(`Cost exceeds limit: ${criteria.estimatedCost} > ${criteria.maxCost}`);
        score -= 50;
      } else {
        // 制限内であれば使用率をスコアに反映
        const usageRate = (criteria.estimatedCost / criteria.maxCost) * 100;
        score = Math.round(score - (100 - usageRate));
      }
    }

    const passed = warnings.length === 0;

    return { passed, score, warnings };
  }

  /**
   * デフォルトの厳しいセキュリティ基準
   */
  static getStrictSecurityCriteria(): SecurityCriteria {
    return {
      requireApproval: true,
      blockedCommands: ['rm -rf', 'delete', 'format', '>'],
    };
  }

  /**
   * デフォルトのコスト基準
   */
  static getDefaultCostCriteria(maxTokens?: number): CostCriteria {
    return {
      maxTokens: maxTokens || 100000,
    };
  }

  /**
   * デフォルトのテスト基準
   */
  static getDefaultTestCriteria(): TestCriteria {
    return {
      requireTests: false, // デフォルトではテスト不要
    };
  }
}

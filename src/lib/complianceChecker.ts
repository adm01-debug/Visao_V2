/**
 * Compliance Checker
 */
export interface ComplianceRule { id: string; name: string; check: () => boolean | Promise<boolean>; }
export class ComplianceChecker {
  private rules: ComplianceRule[] = [];
  addRule(rule: ComplianceRule): void { this.rules.push(rule); }
  async checkAll(): Promise<{ passed: string[]; failed: string[] }> {
    const results = await Promise.all(this.rules.map(async r => ({ id: r.id, passed: await r.check() })));
    return { passed: results.filter(r => r.passed).map(r => r.id), failed: results.filter(r => !r.passed).map(r => r.id) };
  }
}
export const complianceChecker = new ComplianceChecker();

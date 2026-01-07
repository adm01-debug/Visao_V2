/**
 * @fileoverview Custom Playwright Reporter for VISÃO
 * @description Generates detailed test reports with coverage metrics
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  startTime: Date;
  endTime: Date;
}

interface TestSummary {
  name: string;
  status: string;
  duration: number;
  retries: number;
  error?: string;
  screenshot?: string;
  video?: string;
}

class VisaoReporter implements Reporter {
  private metrics: TestMetrics = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    duration: 0,
    startTime: new Date(),
    endTime: new Date(),
  };

  private testSummaries: TestSummary[] = [];
  private outputDir: string;

  constructor(options: { outputDir?: string } = {}) {
    this.outputDir = options.outputDir || 'test-results';
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.metrics.startTime = new Date();
    this.metrics.totalTests = suite.allTests().length;
    
    console.log('\n🎭 VISÃO E2E Test Suite');
    console.log('═'.repeat(50));
    console.log(`📋 Total tests: ${this.metrics.totalTests}`);
    console.log(`🖥️  Projects: ${config.projects.map(p => p.name).join(', ')}`);
    console.log('═'.repeat(50));
  }

  onTestBegin(test: TestCase) {
    console.log(`\n▶️  Running: ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const duration = result.duration;
    const status = result.status;

    // Update metrics
    if (status === 'passed') {
      this.metrics.passed++;
      console.log(`   ✅ Passed (${duration}ms)`);
    } else if (status === 'failed') {
      this.metrics.failed++;
      console.log(`   ❌ Failed (${duration}ms)`);
      if (result.error) {
        console.log(`      Error: ${result.error.message?.slice(0, 100)}...`);
      }
    } else if (status === 'skipped') {
      this.metrics.skipped++;
      console.log(`   ⏭️  Skipped`);
    } else if (status === 'timedOut') {
      this.metrics.failed++;
      console.log(`   ⏰ Timed out (${duration}ms)`);
    }

    // Check for flaky tests
    if (result.retry > 0 && status === 'passed') {
      this.metrics.flaky++;
    }

    // Collect test summary
    const summary: TestSummary = {
      name: test.title,
      status,
      duration,
      retries: result.retry,
    };

    if (result.error) {
      summary.error = result.error.message;
    }

    // Check for attachments
    for (const attachment of result.attachments) {
      if (attachment.name === 'screenshot' && attachment.path) {
        summary.screenshot = attachment.path;
      }
      if (attachment.name === 'video' && attachment.path) {
        summary.video = attachment.path;
      }
    }

    this.testSummaries.push(summary);
    this.metrics.duration += duration;
  }

  onEnd(result: FullResult) {
    this.metrics.endTime = new Date();

    console.log('\n' + '═'.repeat(50));
    console.log('📊 VISÃO E2E Test Results Summary');
    console.log('═'.repeat(50));
    console.log(`   ✅ Passed:  ${this.metrics.passed}`);
    console.log(`   ❌ Failed:  ${this.metrics.failed}`);
    console.log(`   ⏭️  Skipped: ${this.metrics.skipped}`);
    console.log(`   🔄 Flaky:   ${this.metrics.flaky}`);
    console.log('─'.repeat(50));
    console.log(`   📈 Pass Rate: ${this.getPassRate()}%`);
    console.log(`   ⏱️  Duration: ${this.formatDuration(this.metrics.duration)}`);
    console.log(`   🏁 Status:   ${result.status.toUpperCase()}`);
    console.log('═'.repeat(50));

    // Generate detailed report
    this.generateDetailedReport();
    this.generateCoverageReport();
  }

  private getPassRate(): string {
    const total = this.metrics.passed + this.metrics.failed;
    if (total === 0) return '0';
    return ((this.metrics.passed / total) * 100).toFixed(2);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
  }

  private generateDetailedReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      metrics: this.metrics,
      passRate: this.getPassRate(),
      tests: this.testSummaries,
      failedTests: this.testSummaries.filter(t => t.status === 'failed'),
      flakyTests: this.testSummaries.filter(t => t.retries > 0),
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const reportPath = path.join(this.outputDir, 'detailed-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private generateCoverageReport() {
    const coverage = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: this.metrics.totalTests,
        executed: this.metrics.passed + this.metrics.failed,
        passed: this.metrics.passed,
        failed: this.metrics.failed,
        skipped: this.metrics.skipped,
        passRate: parseFloat(this.getPassRate()),
      },
      byCategory: this.getCoverageByCategory(),
      recommendations: this.getRecommendations(),
    };

    const coveragePath = path.join(this.outputDir, 'coverage-report.json');
    fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));
    console.log(`📊 Coverage report saved to: ${coveragePath}`);
  }

  private getCoverageByCategory(): Record<string, { total: number; passed: number; failed: number }> {
    const categories: Record<string, { total: number; passed: number; failed: number }> = {};

    for (const test of this.testSummaries) {
      // Extract category from test name (e.g., "Dashboard > Navigation > should navigate")
      const parts = test.name.split(' > ');
      const category = parts[0] || 'Other';

      if (!categories[category]) {
        categories[category] = { total: 0, passed: 0, failed: 0 };
      }

      categories[category].total++;
      if (test.status === 'passed') {
        categories[category].passed++;
      } else if (test.status === 'failed') {
        categories[category].failed++;
      }
    }

    return categories;
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.failed > 0) {
      recommendations.push(`Fix ${this.metrics.failed} failing test(s) before merging`);
    }

    if (this.metrics.flaky > 0) {
      recommendations.push(`Investigate ${this.metrics.flaky} flaky test(s) for stability issues`);
    }

    if (parseFloat(this.getPassRate()) < 90) {
      recommendations.push('Improve test pass rate to at least 90%');
    }

    if (this.metrics.skipped > this.metrics.totalTests * 0.1) {
      recommendations.push('Review skipped tests - too many tests are being skipped');
    }

    if (this.metrics.duration > 300000) {
      recommendations.push('Consider parallelizing tests to reduce execution time');
    }

    return recommendations;
  }
}

export default VisaoReporter;

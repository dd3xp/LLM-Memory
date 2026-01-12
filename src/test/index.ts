/**
 * 测试入口
 * 运行各种评估和对比实验
 */

import { ComparisonTest } from './comparison/ComparisonTest'
import { AblationTest } from './ablation/AblationTest'

async function main() {
  const args = process.argv.slice(2)
  const testType = args[0] || 'comparison'

  try {
    switch (testType) {
      case 'comparison':
        console.log('[Test] 运行对比测试...\n')
        await ComparisonTest.run()
        break

      case 'ablation':
        console.log('[Test] 运行消融实验...\n')
        await AblationTest.run()
        break

      case 'all':
        console.log('[Test] 运行所有测试...\n')
        console.log('=' .repeat(60))
        console.log('[Test] 测试计划:')
        console.log('  1. 对比测试（Baseline vs Full Memory）')
        console.log('  2. 消融实验（验证各模块作用）')
        console.log('=' .repeat(60))
        console.log()
        
        // 运行对比测试
        console.log('[1/2] 开始对比测试...\n')
        await ComparisonTest.run()
        console.log('\n[OK] 对比测试完成！\n')
        
        // 短暂延迟，避免过快
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 运行消融实验
        console.log('[2/2] 开始消融实验...\n')
        await AblationTest.run()
        console.log('\n[OK] 消融实验完成！\n')
        break

      default:
        console.log('未知的测试类型:', testType)
        console.log('可用的测试类型:')
        console.log('  - comparison: 对比测试（Baseline vs Full Memory）')
        console.log('  - ablation: 消融实验（验证各模块作用）')
        console.log('  - all: 运行所有测试（对比测试 + 消融实验）')
        process.exit(1)
    }

    console.log('\n[OK] 所有测试完成！')
    process.exit(0)
  } catch (error) {
    console.error('\n[ERROR] 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
main()

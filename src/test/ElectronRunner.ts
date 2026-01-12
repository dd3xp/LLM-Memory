/**
 * Electron 测试运行器
 * 使用 Electron 的 Node.js 运行测试，确保原生模块版本一致
 */

import { app } from 'electron'

// 禁用 GPU 加速（测试不需要）
app.disableHardwareAcceleration()

// 处理控制台输出管道错误（防止 EPIPE）
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') {
    process.exit(0)
  }
})
process.stderr.on('error', (err) => {
  if (err.code === 'EPIPE') {
    process.exit(0)
  }
})

// 全局覆盖 console.log 和 console.error，防止 EPIPE 错误崩溃
const originalLog = console.log.bind(console)
const originalError = console.error.bind(console)

console.log = (...args: unknown[]) => {
  try {
    originalLog(...args)
  } catch {
    // 忽略输出错误
  }
}

console.error = (...args: unknown[]) => {
  try {
    originalError(...args)
  } catch {
    // 忽略输出错误
  }
}

// 安全的日志函数（保留兼容性）
const safeLog = console.log
const safeError = console.error

// 当 Electron 准备好时运行测试
app.whenReady().then(async () => {
  // 动态导入测试模块
  const { ComparisonTest } = await import('./comparison/ComparisonTest')
  const { AblationTest } = await import('./ablation/AblationTest')

  const args = process.argv.slice(2)
  const testType = args[0] || 'comparison'

  try {
    switch (testType) {
      case 'comparison':
        safeLog('[Test] 运行对比测试...\n')
        await ComparisonTest.run()
        break

      case 'ablation':
        safeLog('[Test] 运行消融实验...\n')
        await AblationTest.run()
        break

      case 'all':
        safeLog('[Test] 运行所有测试...\n')
        safeLog('='.repeat(60))
        safeLog('[Test] 测试计划:')
        safeLog('  1. 对比测试（Baseline vs Full Memory）')
        safeLog('  2. 消融实验（验证各模块作用）')
        safeLog('='.repeat(60))
        safeLog()

        // 运行对比测试
        safeLog('[1/2] 开始对比测试...\n')
        await ComparisonTest.run()
        safeLog('\n[OK] 对比测试完成！\n')

        // 短暂延迟
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 运行消融实验
        safeLog('[2/2] 开始消融实验...\n')
        await AblationTest.run()
        safeLog('\n[OK] 消融实验完成！\n')
        break

      default:
        safeLog('未知的测试类型:', testType)
        safeLog('可用的测试类型:')
        safeLog('  - comparison: 对比测试（Baseline vs Full Memory）')
        safeLog('  - ablation: 消融实验（验证各模块作用）')
        safeLog('  - all: 运行所有测试')
        app.exit(1)
        return
    }

    safeLog('\n[OK] 所有测试完成！')
    app.exit(0)
  } catch (error) {
    safeError('\n[ERROR] 测试失败:', error)
    app.exit(1)
  }
})

// 当所有窗口关闭时退出（虽然测试不会创建窗口）
app.on('window-all-closed', () => {
  app.quit()
})

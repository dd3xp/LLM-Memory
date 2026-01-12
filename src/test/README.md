# 测试系统使用指南

## 测试系统概述

测试系统位于 `src/test/` 文件夹，用于评估基础记忆功能的性能。

### 测试内容
1. **对比测试** - Baseline（无记忆）vs Full Memory（完整记忆系统）
2. **消融实验** - 验证各模块（Insights、摘要、去重等）的作用

### 集成工具
- **wandb** - 实时指标可视化和对比分析
- **JSON导出** - 本地保存测试结果

---

## 目录结构

```
src/test/
├── comparison/               # 对比测试
│   ├── ComparisonTest.ts     # 对比测试（Baseline vs Full Memory）
│   └── BaselineTest.ts       # Baseline测试（无记忆对照组）
├── ablation/                 # 消融实验
│   └── AblationTest.ts       # 消融实验（验证各模块作用）
├── TestConfig.ts             # 测试配置（共享）
├── MetricsCollector.ts       # 指标收集器（wandb集成）
├── ElectronRunner.ts         # Electron环境测试运行器
├── index.ts                  # 测试入口
└── README.md                 # 本文件

test-results/                 # 测试结果输出目录
├── comparison/               # 对比测试报告
└── ablation/                 # 消融实验报告
```

---

## 快速开始

### 1. 配置wandb（可选但推荐）

```bash
# 方法1：全局安装wandb CLI
npm install -g wandb
wandb login

# 方法2：直接在浏览器登录
# 访问 https://wandb.ai 注册账号
```

如果不想使用wandb，可以在代码中禁用：
```typescript
// src/test/ComparisonTest.ts
await metrics.init({
  project: 'llm-memory-comparison',
  enabled: false  // <- 设置为false禁用wandb
})
```

---

### 2. 运行测试

#### 选项1：运行所有测试（推荐）

```bash
# 一次性运行对比测试 + 消融实验
npm run test:all
```

**预计耗时：** 约5-10分钟

#### 选项2：单独运行对比测试

```bash
# 只运行对比测试（Baseline vs Full Memory）
npm run test:comparison
```

**测试流程：**
1. 初始化wandb（如果启用）
2. 运行Baseline测试（20轮测试用例）
3. 运行Full Memory测试（20轮测试用例）
4. 对比分析结果
5. 保存JSON到 `test-results/`

**预计耗时：** 约 10-15 分钟（20 轮对话 x 2 系统）

#### 选项3：单独运行消融实验

```bash
# 只运行消融实验（自动运行3个实验配置）
npm run test:ablation
```

**实验配置：**
1. `Full-System` - 完整系统（Insights + Summary，作为基准）
2. `No-Insights` - 禁用 Insights（只保留 Summary）
3. `No-Summary` - 禁用 Summary（只保留 Insights）

**配置说明：**
- 所有配置使用相同的 `maxContextTokens = 4000`
- 使用相同的 20 轮三阶段测试用例

**预计耗时：** 约 30-40 分钟（3个配置 x 20轮 x ~30秒/轮）

---

### 3. 查看结果

#### 方式1：终端输出
测试完成后会在终端显示对比结果：

#### 方式1：人类可读的测试报告（推荐）

测试完成后会在 `test-results/` 文件夹生成三个 Markdown 文件：

```bash
# 查看对比报告（最重要！）
cat test-results/comparison-{timestamp}.md

# 查看 Baseline 测试报告
cat test-results/baseline-{timestamp}.md

# 查看 Full Memory 测试报告
cat test-results/fullmemory-{timestamp}.md
```

**对比报告内容包括**：
- 性能对比（响应时间、提升百分比）
- 对话质量对比（回复长度、上下文使用）
- 记忆能力对比（Insights 数量、类型分布）
- 记忆召回测试结果
- 总结与优势分析

> 报告使用 Markdown 格式，可以直接在 GitHub、VS Code 等工具中预览，表格和格式更清晰

#### 方式2：JSON文件（用于程序分析）
```bash
# 查看保存的JSON文件（包含所有原始数据）
cat test-results/baseline-{timestamp}.json
cat test-results/fullmemory-{timestamp}.json
```

每个文件包含：
- 所有指标的原始数据
- 统计摘要
- 测试配置

#### 方式3：Wandb面板（可视化）
访问 https://wandb.ai 查看：
- 实时指标曲线
- 性能对比图表
- 详细数据分析
- 记忆增长趋势

---

## 消融实验

消融实验用于验证各模块的作用。

```bash
npm run test:ablation
```

### 实验1：禁用Insights提取
```typescript
// DialogueManager.ts
private async extractInsightsAfterQuery(...) {
  return  // <- 直接返回，不提取
}
```
**观察**：对话质量是否下降，记忆召回是否变差

### 实验2：禁用Insights检索
```typescript
// DialogueManager.ts
private async buildContextWithSummary() {
  // 注释掉insights检索部分
  // const insights = await this.curator.getRelevantInsights(...)
}
```
**观察**：无法利用历史知识，重复解决同样的问题

### 实验3：禁用对话摘要
```typescript
// DialogueManager.ts
private async checkAndSummarizeIfNeeded() {
  return  // <- 直接返回，不生成摘要
}
```
**观察**：上下文是否很快耗尽，长对话性能

### 实验4：禁用相似度检测
```typescript
// CuratorService.ts
checkSimilarityAndConflict() {
  return 'add'  // 总是返回"add"
}
```
**观察**：Insights重复率，数据库膨胀速度

### 实验5：禁用冲突检测
```typescript
// CuratorService.ts
// 跳过冲突检测部分
```
**观察**：是否出现矛盾的Insights，对话一致性

### 实验6：调整参数
```typescript
// config.ts
memory: {
  maxInsightsTokens: 1000,   // 测试不同值：1000 / 2000 / 3000 / 5000
  maxInsightsTokens: 1000,   // 测试不同值：1000 / 2000 / 3000
}
```
**观察**：找到最优参数平衡

---

## 收集的指标

### 1. 性能指标 (Performance)
- 响应时间（chat, extraction, retrieval, summary, embedding）
- Token使用量
- 成功率
- 按操作类型统计

### 2. 记忆指标 (Memory)
- Insights总数
- 按类型分类（strategy, code, decision, concept, method）
- 按时间分类（recent, medium, old, ancient）
- 平均重要性
- 平均复用次数
- 废弃数量

### 3. 质量指标 (Quality)
- 回复长度
- 使用的Insights数量
- Insights相关性（每条的相关性分数）
- 上下文大小（token数）
- 是否使用摘要

### 4. 检索指标 (Retrieval)
- 检索到的Insights数量
- 平均语义相似度
- 检索耗时

---

## 测试用例说明

**三阶段测试设计**（20轮）：

### 阶段1：建立核心信息（5轮）

目的：建立用户的核心信息，这些信息应该被 Insights 提取和保存

1. "你好，我叫张三，是一名Python后端开发工程师，在北京工作"
2. "我最近在做一个电商项目，使用的是FastAPI框架"
3. "我特别喜欢用async/await处理异步"
4. "我们团队用的是PostgreSQL数据库，配合SQLAlchemy ORM"
5. "我个人比较喜欢函数式编程风格"

### 阶段2：填充对话（10轮）

目的：大量普通技术问答，将阶段1的信息挤出滑动窗口

- 快速排序、闭包、GIL、单例模式、依赖注入...
- 这些对话会把早期信息挤出 token 限制

### 阶段3：记忆测试（5轮）

目的：测试能否回忆阶段1的信息（此时已被挤出 Baseline 的窗口）

1. "你还记得我叫什么名字吗？我在哪个城市工作？"
   - 期望关键词：张三、北京
2. "我之前说我在做什么项目？用的什么框架？"
   - 期望关键词：电商、FastAPI
3. "我说过我喜欢用什么方式处理异步操作？"
   - 期望关键词：async、await
4. "我们团队用的是什么数据库和ORM？"
   - 期望关键词：PostgreSQL、SQLAlchemy
5. "总结一下你对我的了解"
   - 期望关键词：张三、北京、Python、电商、FastAPI、PostgreSQL

### 预期结果

| 系统 | 阶段3 记忆测试 |
|------|---------------|
| Baseline | 失败（早期信息已被挤出窗口） |
| Full Memory | 成功（通过 Insights/Summary 记住） |

---

## 自定义测试

### 添加新测试用例

编辑 `ComparisonTest.ts`:

```typescript
const TEST_CASES: TestCase[] = [
  // 现有测试用例...
  {
    query: "你的问题",
    expectedKeywords: ["关键词1", "关键词2"],
    description: "测试描述"
  }
]
```

### 记录自定义指标

```typescript
import { metrics } from './MetricsCollector'

metrics.recordPerformance({
  timestamp: Date.now(),
  operation: 'custom',
  duration: 123,
  success: true
})
```

---

## 常见问题

### Q: wandb登录失败怎么办？
A: 可以禁用wandb，设置 `enabled: false`，测试仍然正常运行，只是不会上传到wandb。

### Q: 测试结果在哪里？
A: 保存在 `test-results/` 文件夹，JSON格式。

### Q: 如何对比多次测试结果？
A: 每次测试都会生成带时间戳的JSON文件，可以手动对比或写脚本分析。

### Q: LLM调用失败怎么办？
A: 检查 `config.ts` 中的API密钥是否正确，网络是否正常。

### Q: 如何自定义测试用例？
A: 编辑 `src/test/ComparisonTest.ts` 中的 `TEST_CASES` 数组。

---

## 评估目标

根据 `docs/requirements.md`，需要评估：

1. **记忆准确性** - Insights质量、检索相关性、关键词命中率
2. **检索速度** - 各操作耗时（chat, extraction, retrieval, summary）
3. **对话质量** - 回复相关性、上下文利用、Insights使用情况
4. **长期记忆保持能力** - 记忆衰减、复用率、按时间分布

---

## 提交报告前Checklist

- [ ] 运行对比测试（`npm run test:comparison`）
- [ ] 运行消融实验（`npm run test:ablation`）
- [ ] 收集性能数据（自动保存 Markdown 报告）
- [ ] 分析结果差异（查看 `comparison-*.md`）
- [ ] 查看消融实验对比（查看 `ablation-comparison-*.md`）
- [ ] 保存所有测试结果（自动保存 JSON + Markdown）
- [ ] 截图wandb图表（如果使用）
- [ ] 分析失败案例（如果有）
- [ ] 总结Insights质量

---

## 开始测试吧！

```bash
# 方式1：一次性运行所有测试（推荐）
npm run test:all

# 方式2：单独运行对比测试
npm run test:comparison

# 方式3：单独运行消融实验
npm run test:ablation

# 查看结果
ls test-results/

# （可选）访问wandb面板
# https://wandb.ai
```

---

## 参考文档

- **Requirements**: `docs/requirements.md` - 项目需求文档
- **设计文档**: `docs/design_pattern.md` - 设计模式说明
- **Wandb教程**: https://docs.wandb.ai/ - Wandb使用指南

---

祝测试顺利！

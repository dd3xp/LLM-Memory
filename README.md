# J0K3R KH3VV 助手

## 实验环境

- 语言：ts（node.js）
- 使用模型：qwen3-8B

## 使用方法

1. 下载 node.js，并将 node.js 添加至环境变量

2. 克隆到指定目录

    ```
    git clone https://github.com/dd3xp/LLM-Memory.git
    ```

3. 安装依赖

    ```
    npm run install
    ```

4. 填写配置文件

    打开 [config.ts](./config.ts)，配置以下内容：

    ```typescript
    // 模型上下文窗口大小
    const MODEL_CONTEXT_WINDOW = 128000  // 根据你的模型设置，如 128000

    // LLM 配置（chat、summary、curator 三个模型都需要配置）
    chat: {
    apiKey: 'YOUR_SILICONFLOW_API_KEY',       // 替换为你的 API Key
    baseURL: 'https://api.siliconflow.cn/v1', // API 地址
    model: 'Qwen/Qwen3-8B',                   // 模型名称
    // ...其他参数可保持默认
    }

    // Wandb 配置（可选，用于实验追踪）
    wandb: {
    apiKey: 'YOUR_WANDB_API_KEY',  // 替换为你的 Wandb API Key
    enabled: true                   // 设为 false 可禁用
    }
    ```

5. 运行自动测试：用于验证实验结论

    ```
    npm run test:all # 一键运行所有时间，无法暂停，3个小时左右
    npm run test:comparison # 对比实验，用于对比普通的上下文记忆和本助手的记忆指标好坏
    npm run test:ablation # 用于禁用本助手的各个模块对比指标好坏
    ```

    自动测试结果位于 [test-result](./test-results/)，测试配置位于 [TestConfig.ts](./src/test/TestConfig.ts)

6. 运行人工测试：用于验证回复质量

    ```
    npm run dev
    ```

    如果测试运行时间太久可以看一下我的实机演示 [实机演示视频](./test-results/media/video.webm)

# **如果有任何问题请和我联系**
# 系统架构设计

## 整体架构

```mermaid
graph TB
    subgraph Electron["Electron 应用"]
        subgraph Main["主进程 (Node.js/TypeScript)"]
            A[对话管理器]
            B[角色系统]
            C[记忆管理]
            D[IPC处理器]
            E[AI服务层]
        end
        subgraph Renderer["渲染进程 (React)"]
            F[聊天界面]
            G[角色配置界面]
            H[记忆可视化]
        end
    end
    
    subgraph AI["AI 能力 (Node.js 库)"]
        I[向量搜索<br/>vectra]
        J[Embeddings生成<br/>@xenova/transformers]
        K[情感分析<br/>@xenova/transformers]
        L[LLM调用<br/>openai/anthropic]
    end
    
    subgraph Data["数据层"]
        M[(SQLite<br/>better-sqlite3)]
        N[本地文件存储]
    end
    
    F --> D
    G --> D
    H --> D
    D --> A
    A --> B
    A --> C
    A --> E
    E --> I
    E --> J
    E --> K
    E --> L
    C --> M
    C --> N
    
    style Main fill:#f9d5d3
    style Renderer fill:#fdebd0
    style AI fill:#d6eaf8
    style Data fill:#d5f4e6
```

## 技术栈职责划分

### Electron 主进程 (TypeScript/Node.js) 负责
- **对话流程控制**：管理对话状态和上下文
- **角色系统**：人格参数、知识边界、情绪状态管理
- **记忆管理策略**：决定什么存储、什么检索、什么遗忘
- **AI服务调用**：调用 Node.js AI 库（Embeddings、向量搜索、LLM）
- **数据持久化**：SQLite 数据库操作
- **业务逻辑**：整合各个模块

### Electron 渲染进程 (React + TypeScript) 负责
- **用户界面**：现代化的 GUI 聊天界面
- **角色配置**：可视化的角色参数设置
- **记忆展示**：记忆内容的可视化展示
- **状态管理**：前端状态管理（React 状态/上下文）
- **与主进程通信**：通过 IPC 通信

### Node.js AI 库 负责
- **向量搜索**：使用 `vectra` 进行语义相似度搜索
- **Embeddings 生成**：使用 `@xenova/transformers` 生成文本向量
- **情感分析**：使用 `@xenova/transformers` 分析对话情绪
- **LLM API 调用**：使用 `openai` / `@anthropic-ai/sdk` 与 LLM 通信

### 数据层
- **SQLite**：使用 `better-sqlite3` 存储结构化记忆（对话历史、角色设定）
- **本地文件存储**：角色配置文件、向量索引文件

## 通信方式

- **渲染进程 <-> 主进程**：Electron IPC (ipcRenderer/ipcMain)
- **主进程 <-> AI 库**：直接函数调用（同进程）
- **主进程 <-> 数据层**：better-sqlite3（同步 API）

/**
 * 数据库服务 - 使用 SQLite 持久化数据
 */

import * as Database from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface Conversation {
  id: string
  title: string
  type: 'qa' | 'chat'
  character_id?: string
  pinned: number
  summary: string // 对话摘要（历史压缩）
  summary_tokens: number // 摘要的token数量
  created_at: number
  updated_at: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface Insight {
  id: string
  conversation_id: string
  type: 'strategy' | 'code' | 'decision' | 'concept' | 'method'
  content: string
  context: string // 原始上下文
  importance: number // 重要性评分 0-1
  reuse_count: number // 被复用次数
  is_deprecated: number // 是否已废弃 (0=false, 1=true)
  embedding?: Buffer // 语义向量（用于相似度搜索）
  created_at: number
  last_used: number
}

// ==================== 角色扮演相关类型 ====================

export interface Character {
  id: string
  name: string
  avatar?: string // 头像URL或base64
  description: string // 角色简介
  base_prompt: string // 基础人设prompt
  created_at: number
  updated_at: number
}

export type CharacterMemoryCategory = 'self' | 'user' | 'relationship' | 'event'
export type CharacterMemoryType = 
  | 'self_identity' | 'self_personality' | 'self_background' | 'self_habit' 
  | 'self_catchphrase' | 'self_secret' | 'speaking_style'
  | 'user_preference' | 'user_fact' | 'user_secret'
  | 'shared_memory' | 'emotional_event' | 'relationship_milestone'
  | 'current_topic' | 'current_mood'

export interface CharacterMemory {
  id: string
  character_id: string
  user_id: string
  category: CharacterMemoryCategory
  type: CharacterMemoryType
  content: string
  context?: string
  importance: number
  emotional_intensity: number // 情感强度 0-1
  embedding?: Buffer
  is_deprecated: number
  created_at: number
  updated_at: number
  last_recalled?: number
}

export type EmotionType = 'calm' | 'happy' | 'angry' | 'sad' | 'anxious' | 'excited'
export type RelationshipType = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'conflict'
export type TrustType = 'distrust' | 'neutral' | 'trust' | 'deep_trust'

export interface CharacterState {
  id?: number
  character_id: string
  user_id: string
  // 情绪状态
  emotion: EmotionType
  emotion_intensity: number
  // 关系状态
  relationship: RelationshipType
  relationship_score: number
  // 信任状态
  trust: TrustType
  trust_score: number
  // 能量状态
  energy: number
  // 时间戳
  last_updated: number
  last_interaction: number
}

export class DatabaseService {
  private db: Database.Database

  constructor(customDbPath?: string) {
    // 数据库文件路径：项目根目录/data/memory.db
    let dbPath: string
    
    if (customDbPath) {
      // 使用自定义路径（测试环境）
      dbPath = customDbPath
    } else {
      // 检测是否在 Electron 环境
      const projectRoot = app?.getAppPath() || process.cwd()
      const dataDir = path.join(projectRoot, 'data')
      
      // 确保 data 目录存在
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      
      dbPath = path.join(dataDir, 'memory.db')
    }
    
    console.log('[DatabaseService] 数据库路径:', dbPath)
    
    // 打开数据库（如果不存在会自动创建）
    // 兼容 Electron 和 ts-node 环境的导入方式
    const DatabaseConstructor = (Database as any).default || Database
    this.db = new DatabaseConstructor(dbPath)
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON')
    
    // 初始化数据库结构
    this.initSchema()
    
    // 执行数据库迁移
    this.migrateSchema()
    
    console.log('[DatabaseService] 数据库初始化完成')
  }

  /**
   * 初始化数据库结构
   */
  private initSchema(): void {
    // 直接使用 SQL 语句，避免文件路径问题
    const schema = `
      -- 对话表
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT CHECK(type IN ('qa', 'chat')) NOT NULL,
        character_id TEXT,
        pinned INTEGER DEFAULT 0,
        summary TEXT DEFAULT '',
        summary_tokens INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- 消息表
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      -- Insights表（Dynamic Cheatsheet核心）
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('strategy', 'code', 'decision', 'concept', 'method')) NOT NULL,
        content TEXT NOT NULL,
        context TEXT NOT NULL,
        importance REAL NOT NULL,
        reuse_count INTEGER DEFAULT 0,
        is_deprecated INTEGER DEFAULT 0,
        embedding BLOB,
        created_at INTEGER NOT NULL,
        last_used INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);
      CREATE INDEX IF NOT EXISTS idx_insights_conversation ON insights(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_insights_importance ON insights(importance DESC);
      CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);

      -- 数据库版本表
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );

      -- 插入版本信息
      INSERT OR IGNORE INTO schema_version VALUES (1, strftime('%s', 'now') * 1000);

      -- ==================== 角色扮演相关表 ====================
      
      -- 角色表
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        description TEXT NOT NULL,
        base_prompt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- 角色记忆表
      CREATE TABLE IF NOT EXISTS character_memories (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        category TEXT CHECK(category IN ('self', 'user', 'relationship', 'event')) NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        importance REAL DEFAULT 0.5,
        emotional_intensity REAL DEFAULT 0.5,
        embedding BLOB,
        is_deprecated INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_recalled INTEGER,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      -- 角色状态表
      CREATE TABLE IF NOT EXISTS character_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emotion TEXT DEFAULT 'calm',
        emotion_intensity REAL DEFAULT 0.5,
        relationship TEXT DEFAULT 'stranger',
        relationship_score REAL DEFAULT 0,
        trust TEXT DEFAULT 'neutral',
        trust_score REAL DEFAULT 0,
        energy REAL DEFAULT 1.0,
        last_updated INTEGER NOT NULL,
        last_interaction INTEGER,
        UNIQUE(character_id, user_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      -- 角色扮演对话表（复用conversations，但type='roleplay'）
      -- 不需要新建表，只需扩展type检查

      -- 角色相关索引
      CREATE INDEX IF NOT EXISTS idx_char_mem_character ON character_memories(character_id);
      CREATE INDEX IF NOT EXISTS idx_char_mem_category ON character_memories(character_id, category);
      CREATE INDEX IF NOT EXISTS idx_char_mem_type ON character_memories(character_id, type);
      CREATE INDEX IF NOT EXISTS idx_char_states_character ON character_states(character_id, user_id);
    `
    
    this.db.exec(schema)
    console.log('[DatabaseService] 数据库结构已初始化')
  }

  /**
   * 数据库迁移：添加新字段、重命名字段
   */
  private migrateSchema(): void {
    try {
      const convColumns = this.db.pragma('table_info(conversations)')
      const insightColumns = this.db.pragma('table_info(insights)')
      
      // 迁移1: 添加旧的cheatsheet字段（向后兼容）
      const hasCheatsheet = convColumns.some((col: any) => col.name === 'cheatsheet')
      if (!hasCheatsheet) {
        console.log('[DatabaseService] 执行迁移1：添加cheatsheet字段...')
        this.db.exec(`
          ALTER TABLE conversations ADD COLUMN cheatsheet TEXT DEFAULT '';
          ALTER TABLE conversations ADD COLUMN cheatsheet_tokens INTEGER DEFAULT 0;
        `)
        console.log('[DatabaseService] 迁移1完成：cheatsheet字段已添加')
      }

      // 迁移2: 检查insights表是否有is_deprecated字段
      const hasDeprecated = insightColumns.some((col: any) => col.name === 'is_deprecated')
      if (!hasDeprecated) {
        console.log('[DatabaseService] 执行迁移2：添加is_deprecated字段...')
        this.db.exec(`ALTER TABLE insights ADD COLUMN is_deprecated INTEGER DEFAULT 0;`)
        console.log('[DatabaseService] 迁移2完成：is_deprecated字段已添加')
      }

      // 迁移3: 检查insights表是否有embedding字段
      const hasEmbedding = insightColumns.some((col: any) => col.name === 'embedding')
      if (!hasEmbedding) {
        console.log('[DatabaseService] 执行迁移3：添加embedding字段...')
        this.db.exec(`ALTER TABLE insights ADD COLUMN embedding BLOB;`)
        console.log('[DatabaseService] 迁移3完成：embedding字段已添加')
      }

      // 迁移4: 重命名 cheatsheet → summary（概念纠正）
      const hasSummary = convColumns.some((col: any) => col.name === 'summary')
      if (!hasSummary && hasCheatsheet) {
        console.log('[DatabaseService] 执行迁移4：重命名cheatsheet→summary...')
        this.db.exec(`
          ALTER TABLE conversations ADD COLUMN summary TEXT DEFAULT '';
          ALTER TABLE conversations ADD COLUMN summary_tokens INTEGER DEFAULT 0;
          UPDATE conversations SET summary = cheatsheet, summary_tokens = cheatsheet_tokens;
        `)
        console.log('[DatabaseService] 迁移4完成：字段已重命名（cheatsheet数据已迁移到summary）')
      }
    } catch (error) {
      console.error('[DatabaseService] 迁移失败:', error)
    }
  }

  // ==================== 对话管理 ====================

  /**
   * 创建新对话
   */
  createConversation(conversation: Omit<Conversation, 'created_at' | 'updated_at' | 'pinned' | 'summary' | 'summary_tokens'>): Conversation {
    const now = Date.now()
    const fullConversation: Conversation = {
      ...conversation,
      pinned: 0,
      summary: '',
      summary_tokens: 0,
      created_at: now,
      updated_at: now
    }

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, type, character_id, pinned, summary, summary_tokens, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      fullConversation.id,
      fullConversation.title,
      fullConversation.type,
      fullConversation.character_id || null,
      fullConversation.pinned,
      fullConversation.summary,
      fullConversation.summary_tokens,
      fullConversation.created_at,
      fullConversation.updated_at
    )

    console.log('[DatabaseService] 创建对话:', fullConversation.id)
    return fullConversation
  }

  /**
   * 获取对话列表（置顶优先，然后按更新时间倒序）
   */
  getConversations(type?: 'qa' | 'chat'): Conversation[] {
    let query = 'SELECT * FROM conversations'
    const params: string[] = []

    if (type) {
      query += ' WHERE type = ?'
      params.push(type)
    }

    query += ' ORDER BY pinned DESC, updated_at DESC'

    const stmt = this.db.prepare(query)
    const conversations = stmt.all(...params) as Conversation[]
    
    return conversations
  }

  /**
   * 获取单个对话
   */
  getConversation(id: string): Conversation | null {
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?')
    const conversation = stmt.get(id) as Conversation | undefined
    return conversation || null
  }

  /**
   * 更新对话（标题、更新时间）
   */
  updateConversation(id: string, updates: { title?: string }): void {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET title = COALESCE(?, title),
          updated_at = ?
      WHERE id = ?
    `)
    
    stmt.run(updates.title || null, now, id)
    console.log('[DatabaseService] 更新对话:', id)
  }

  /**
   * 置顶/取消置顶对话
   */
  togglePinConversation(id: string, pinned: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET pinned = ?, updated_at = ?
      WHERE id = ?
    `)
    
    stmt.run(pinned ? 1 : 0, Date.now(), id)
    console.log('[DatabaseService] 切换置顶状态:', id, pinned)
  }

  /**
   * 删除对话（会级联删除相关消息）
   */
  deleteConversation(id: string): void {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?')
    stmt.run(id)
    console.log('[DatabaseService] 删除对话:', id)
  }

  /**
   * 更新对话摘要（持久化历史压缩）
   */
  updateSummary(conversationId: string, summary: string, tokens: number): void {
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET summary = ?, summary_tokens = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(summary, tokens, Date.now(), conversationId)
    console.log(`[DatabaseService] 保存对话摘要: ${conversationId}, ${tokens} tokens`)
  }

  /**
   * 获取对话摘要
   */
  getSummary(conversationId: string): { summary: string; tokens: number } {
    const stmt = this.db.prepare(`
      SELECT summary, summary_tokens FROM conversations WHERE id = ?
    `)
    const result = stmt.get(conversationId) as { summary: string; summary_tokens: number } | undefined
    
    return {
      summary: result?.summary || '',
      tokens: result?.summary_tokens || 0
    }
  }

  // ==================== 消息管理 ====================

  /**
   * 添加消息
   */
  addMessage(message: Message): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      message.id,
      message.conversation_id,
      message.role,
      message.content,
      message.timestamp
    )

    // 更新对话的 updated_at
    this.updateConversation(message.conversation_id, {})
  }

  /**
   * 获取对话的所有消息
   */
  getMessages(conversationId: string, limit?: number): Message[] {
    let query = 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
    
    if (limit) {
      query += ` LIMIT ${limit}`
    }

    const stmt = this.db.prepare(query)
    const messages = stmt.all(conversationId) as Message[]
    
    return messages
  }

  /**
   * 获取对话的最后一条消息
   */
  getLastMessage(conversationId: string): Message | null {
    const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `)
    
    const message = stmt.get(conversationId) as Message | undefined
    return message || null
  }

  /**
   * 删除对话的所有消息
   */
  deleteMessages(conversationId: string): void {
    const stmt = this.db.prepare('DELETE FROM messages WHERE conversation_id = ?')
    stmt.run(conversationId)
    console.log('[DatabaseService] 删除对话消息:', conversationId)
  }

  /**
   * 添加Insight
   */
  addInsight(insight: Omit<Insight, 'reuse_count' | 'is_deprecated'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO insights (id, conversation_id, type, content, context, importance, reuse_count, is_deprecated, embedding, created_at, last_used)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `)
    stmt.run(
      insight.id,
      insight.conversation_id,
      insight.type,
      insight.content,
      insight.context,
      insight.importance,
      insight.embedding || null,
      insight.created_at,
      insight.last_used
    )
    console.log('[DatabaseService] 添加Insight:', insight.type, '重要性:', insight.importance)
  }

  /**
   * 获取对话的所有Insights（按重要性排序，过滤已废弃）
   */
  getInsights(conversationId: string, limit?: number): Insight[] {
    let query = `
      SELECT * FROM insights 
      WHERE conversation_id = ? 
      AND is_deprecated = 0
      ORDER BY importance DESC, last_used DESC
    `
    
    if (limit) {
      query += ` LIMIT ${limit}`
    }

    const stmt = this.db.prepare(query)
    return stmt.all(conversationId) as Insight[]
  }

  /**
   * 更新Insight使用次数
   */
  updateInsightUsage(insightId: string): void {
    const stmt = this.db.prepare(`
      UPDATE insights 
      SET reuse_count = reuse_count + 1, last_used = ?
      WHERE id = ?
    `)
    stmt.run(Date.now(), insightId)
  }

  /**
   * 删除低质量Insights（重要性低且未被复用）
   */
  pruneInsights(conversationId: string, minImportance: number = 0.3): void {
    const stmt = this.db.prepare(`
      DELETE FROM insights 
      WHERE conversation_id = ? 
      AND importance < ? 
      AND reuse_count = 0
      AND is_deprecated = 0
      AND (? - created_at) > 86400000
    `)
    const result = stmt.run(conversationId, minImportance, Date.now())
    console.log(`[DatabaseService] 清理低质量Insights: ${result.changes}条`)
  }

  /**
   * 标记Insight为已废弃
   */
  deprecateInsight(insightId: string): void {
    const stmt = this.db.prepare(`
      UPDATE insights 
      SET is_deprecated = 1
      WHERE id = ?
    `)
    stmt.run(insightId)
    console.log('[DatabaseService] 标记Insight为已废弃:', insightId)
  }

  /**
   * 删除已废弃的旧Insights（超过指定天数）
   */
  pruneDeprecatedInsights(conversationId: string, daysOld: number = 30): void {
    const cutoffTime = Date.now() - (daysOld * 86400000)
    const stmt = this.db.prepare(`
      DELETE FROM insights 
      WHERE conversation_id = ? 
      AND is_deprecated = 1
      AND created_at < ?
    `)
    const result = stmt.run(conversationId, cutoffTime)
    console.log(`[DatabaseService] 清理已废弃Insights: ${result.changes}条`)
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close()
    console.log('[DatabaseService] 数据库连接已关闭')
  }

  // ==================== 角色管理 ====================

  /**
   * 创建角色
   */
  createCharacter(character: Omit<Character, 'created_at' | 'updated_at'>): Character {
    const now = Date.now()
    const fullCharacter: Character = {
      ...character,
      created_at: now,
      updated_at: now
    }

    const stmt = this.db.prepare(`
      INSERT INTO characters (id, name, avatar, description, base_prompt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      fullCharacter.id,
      fullCharacter.name,
      fullCharacter.avatar || null,
      fullCharacter.description,
      fullCharacter.base_prompt,
      fullCharacter.created_at,
      fullCharacter.updated_at
    )

    console.log('[DatabaseService] 创建角色:', fullCharacter.name)
    return fullCharacter
  }

  /**
   * 获取所有角色
   */
  getCharacters(): Character[] {
    const stmt = this.db.prepare('SELECT * FROM characters ORDER BY updated_at DESC')
    return stmt.all() as Character[]
  }

  /**
   * 获取单个角色
   */
  getCharacter(id: string): Character | null {
    const stmt = this.db.prepare('SELECT * FROM characters WHERE id = ?')
    const character = stmt.get(id) as Character | undefined
    return character || null
  }

  /**
   * 更新角色
   */
  updateCharacter(id: string, updates: Partial<Omit<Character, 'id' | 'created_at'>>): void {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.avatar !== undefined) {
      fields.push('avatar = ?')
      values.push(updates.avatar)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.base_prompt !== undefined) {
      fields.push('base_prompt = ?')
      values.push(updates.base_prompt)
    }

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = this.db.prepare(`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    console.log('[DatabaseService] 更新角色:', id)
  }

  /**
   * 删除角色
   */
  deleteCharacter(id: string): void {
    const stmt = this.db.prepare('DELETE FROM characters WHERE id = ?')
    stmt.run(id)
    console.log('[DatabaseService] 删除角色:', id)
  }

  // ==================== 角色记忆管理 ====================

  /**
   * 添加角色记忆
   */
  addCharacterMemory(memory: Omit<CharacterMemory, 'is_deprecated' | 'last_recalled'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO character_memories (
        id, character_id, user_id, category, type, content, context,
        importance, emotional_intensity, embedding, is_deprecated,
        created_at, updated_at, last_recalled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `)

    stmt.run(
      memory.id,
      memory.character_id,
      memory.user_id,
      memory.category,
      memory.type,
      memory.content,
      memory.context || null,
      memory.importance,
      memory.emotional_intensity,
      memory.embedding || null,
      memory.created_at,
      memory.updated_at,
      null
    )
    console.log('[DatabaseService] 添加角色记忆:', memory.type)
  }

  /**
   * 获取角色记忆（按类别和类型筛选）
   */
  getCharacterMemories(
    characterId: string,
    userId: string,
    options?: {
      category?: CharacterMemoryCategory
      type?: CharacterMemoryType
      limit?: number
    }
  ): CharacterMemory[] {
    let query = `
      SELECT * FROM character_memories 
      WHERE character_id = ? AND user_id = ? AND is_deprecated = 0
    `
    const params: any[] = [characterId, userId]

    if (options?.category) {
      query += ' AND category = ?'
      params.push(options.category)
    }

    if (options?.type) {
      query += ' AND type = ?'
      params.push(options.type)
    }

    query += ' ORDER BY importance DESC, updated_at DESC'

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`
    }

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as CharacterMemory[]
  }

  /**
   * 获取所有角色记忆（用于向量检索）
   */
  getAllCharacterMemories(characterId: string, userId: string): CharacterMemory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM character_memories 
      WHERE character_id = ? AND user_id = ? AND is_deprecated = 0
      ORDER BY importance DESC
    `)
    return stmt.all(characterId, userId) as CharacterMemory[]
  }

  /**
   * 更新角色记忆
   */
  updateCharacterMemory(id: string, updates: Partial<CharacterMemory>): void {
    const fields: string[] = []
    const values: any[] = []

    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
    }
    if (updates.context !== undefined) {
      fields.push('context = ?')
      values.push(updates.context)
    }
    if (updates.importance !== undefined) {
      fields.push('importance = ?')
      values.push(updates.importance)
    }
    if (updates.emotional_intensity !== undefined) {
      fields.push('emotional_intensity = ?')
      values.push(updates.emotional_intensity)
    }
    if (updates.embedding !== undefined) {
      fields.push('embedding = ?')
      values.push(updates.embedding)
    }
    if (updates.is_deprecated !== undefined) {
      fields.push('is_deprecated = ?')
      values.push(updates.is_deprecated)
    }

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = this.db.prepare(`UPDATE character_memories SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  }

  /**
   * 更新记忆召回时间
   */
  updateMemoryRecall(memoryId: string): void {
    const stmt = this.db.prepare(`
      UPDATE character_memories 
      SET last_recalled = ?, updated_at = ?
      WHERE id = ?
    `)
    const now = Date.now()
    stmt.run(now, now, memoryId)
  }

  /**
   * 标记角色记忆为废弃
   */
  deprecateCharacterMemory(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE character_memories 
      SET is_deprecated = 1, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(Date.now(), id)
    console.log('[DatabaseService] 废弃角色记忆:', id)
  }

  // ==================== 角色状态管理 ====================

  /**
   * 获取角色状态
   */
  getCharacterState(characterId: string, userId: string): CharacterState | null {
    const stmt = this.db.prepare(`
      SELECT * FROM character_states 
      WHERE character_id = ? AND user_id = ?
    `)
    const state = stmt.get(characterId, userId) as CharacterState | undefined
    return state || null
  }

  /**
   * 保存角色状态（插入或更新）
   */
  saveCharacterState(state: Omit<CharacterState, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO character_states (
        character_id, user_id, emotion, emotion_intensity,
        relationship, relationship_score, trust, trust_score,
        energy, last_updated, last_interaction
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_id, user_id) DO UPDATE SET
        emotion = excluded.emotion,
        emotion_intensity = excluded.emotion_intensity,
        relationship = excluded.relationship,
        relationship_score = excluded.relationship_score,
        trust = excluded.trust,
        trust_score = excluded.trust_score,
        energy = excluded.energy,
        last_updated = excluded.last_updated,
        last_interaction = excluded.last_interaction
    `)

    stmt.run(
      state.character_id,
      state.user_id,
      state.emotion,
      state.emotion_intensity,
      state.relationship,
      state.relationship_score,
      state.trust,
      state.trust_score,
      state.energy,
      state.last_updated,
      state.last_interaction
    )
    console.log('[DatabaseService] 保存角色状态:', state.character_id)
  }

  /**
   * 删除角色状态
   */
  deleteCharacterState(characterId: string, userId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM character_states 
      WHERE character_id = ? AND user_id = ?
    `)
    stmt.run(characterId, userId)
  }
}

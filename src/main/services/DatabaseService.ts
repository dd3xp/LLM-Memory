/**
 * 数据库服务 - 使用 SQLite 持久化数据
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface Conversation {
  id: string
  title: string
  type: 'qa' | 'chat'
  character_id?: string
  pinned: number
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

export class DatabaseService {
  private db: Database.Database

  constructor() {
    // 数据库文件路径：项目根目录/data/memory.db
    const projectRoot = app.getAppPath()
    const dataDir = path.join(projectRoot, 'data')
    
    // 确保 data 目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    const dbPath = path.join(dataDir, 'memory.db')
    console.log('[DatabaseService] 数据库路径:', dbPath)
    
    // 打开数据库（如果不存在会自动创建）
    this.db = new Database(dbPath)
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON')
    
    // 初始化数据库结构
    this.initSchema()
    
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

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

      -- 数据库版本表
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );

      -- 插入版本信息
      INSERT OR IGNORE INTO schema_version VALUES (1, strftime('%s', 'now') * 1000);
    `
    
    this.db.exec(schema)
    console.log('[DatabaseService] 数据库结构已初始化')
  }

  // ==================== 对话管理 ====================

  /**
   * 创建新对话
   */
  createConversation(conversation: Omit<Conversation, 'created_at' | 'updated_at' | 'pinned'>): Conversation {
    const now = Date.now()
    const fullConversation: Conversation = {
      ...conversation,
      pinned: 0,
      created_at: now,
      updated_at: now
    }

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, type, character_id, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      fullConversation.id,
      fullConversation.title,
      fullConversation.type,
      fullConversation.character_id || null,
      fullConversation.pinned,
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
   * 关闭数据库连接
   */
  close(): void {
    this.db.close()
    console.log('[DatabaseService] 数据库连接已关闭')
  }
}

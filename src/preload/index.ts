import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // ==================== 对话管理 ====================
  
  // 创建新对话
  createConversation: (type: 'qa' | 'chat' = 'qa'): Promise<unknown> => {
    return ipcRenderer.invoke('conversation:create', type)
  },

  // 获取对话列表
  getConversationList: (type: 'qa' | 'chat' = 'qa'): Promise<unknown[]> => {
    return ipcRenderer.invoke('conversation:list', type)
  },

  // 切换对话
  switchConversation: (conversationId: string): Promise<unknown[]> => {
    return ipcRenderer.invoke('conversation:switch', conversationId)
  },

  // 切换置顶状态
  togglePinConversation: (conversationId: string): Promise<void> => {
    return ipcRenderer.invoke('conversation:toggle-pin', conversationId)
  },

  // 删除对话
  deleteConversation: (conversationId: string): Promise<void> => {
    return ipcRenderer.invoke('conversation:delete', conversationId)
  },

  // ==================== 消息管理 ====================

  // 发送消息到AI
  sendMessage: (message: string): Promise<string> => {
    return ipcRenderer.invoke('chat:send-message', message)
  },

  // 获取当前对话的消息
  getMessages: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('chat:get-messages')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ConversationManager } from './managers/ConversationManager'

// 创建对话管理器实例
let conversationManager: ConversationManager | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 设置 IPC 处理器
function setupIPC(): void {
  // 初始化对话管理器
  conversationManager = new ConversationManager()

  // ==================== 对话管理 ====================

  // 创建新对话
  ipcMain.handle('conversation:create', async (_event, type: 'qa' | 'chat' = 'qa') => {
    try {
      if (!conversationManager) {
        throw new Error('对话管理器未初始化')
      }
      const conversation = conversationManager.createConversation(type)
      console.log('[IPC] 创建新对话:', conversation.id)
      return conversation
    } catch (error) {
      console.error('[IPC] 创建对话失败:', error)
      throw error
    }
  })

  // 获取对话列表
  ipcMain.handle('conversation:list', async (_event, type: 'qa' | 'chat' = 'qa') => {
    try {
      if (!conversationManager) {
        return []
      }
      const list = conversationManager.getConversationList(type)
      console.log('[IPC] 获取对话列表:', list.length)
      return list
    } catch (error) {
      console.error('[IPC] 获取对话列表失败:', error)
      return []
    }
  })

  // 切换对话
  ipcMain.handle('conversation:switch', async (_event, conversationId: string) => {
    try {
      if (!conversationManager) {
        throw new Error('对话管理器未初始化')
      }
      const messages = await conversationManager.switchConversation(conversationId)
      console.log('[IPC] 切换对话:', conversationId, '消息数:', messages.length)
      return messages
    } catch (error) {
      console.error('[IPC] 切换对话失败:', error)
      throw error
    }
  })

  // 切换置顶状态
  ipcMain.handle('conversation:toggle-pin', async (_event, conversationId: string) => {
    try {
      if (!conversationManager) {
        throw new Error('对话管理器未初始化')
      }
      conversationManager.togglePinConversation(conversationId)
      console.log('[IPC] 切换置顶状态:', conversationId)
    } catch (error) {
      console.error('[IPC] 切换置顶状态失败:', error)
      throw error
    }
  })

  // 删除对话
  ipcMain.handle('conversation:delete', async (_event, conversationId: string) => {
    try {
      if (!conversationManager) {
        throw new Error('对话管理器未初始化')
      }
      conversationManager.deleteConversation(conversationId)
      console.log('[IPC] 删除对话:', conversationId)
    } catch (error) {
      console.error('[IPC] 删除对话失败:', error)
      throw error
    }
  })

  // ==================== 消息管理 ====================

  // 发送消息
  ipcMain.handle('chat:send-message', async (_event, content: string) => {
    try {
      if (!conversationManager) {
        throw new Error('对话管理器未初始化')
      }
      console.log('[IPC] 收到消息:', content.substring(0, 50))
      const response = await conversationManager.sendMessage(content)
      console.log('[IPC] 返回回复:', response.substring(0, 50) + '...')
      return response
    } catch (error) {
      console.error('[IPC] 处理消息失败:', error)
      return '抱歉，发生了错误：' + (error as Error).message
    }
  })

  // 获取当前对话的消息历史
  ipcMain.handle('chat:get-messages', async () => {
    try {
      if (!conversationManager) {
        return []
      }
      return conversationManager.getCurrentMessages()
    } catch (error) {
      console.error('[IPC] 获取消息失败:', error)
      return []
    }
  })

  console.log('[IPC] IPC 处理器已设置')
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 设置 IPC
  setupIPC()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

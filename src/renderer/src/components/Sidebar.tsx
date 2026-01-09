/**
 * 侧边栏 - 精致列表设计
 */

import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

interface SidebarItem {
  id: string
  name: string
  lastMessage?: string
  time?: string
  pinned?: boolean
}

interface SidebarProps {
  mode: 'qa' | 'chat'
  items: SidebarItem[]
  activeItemId?: string
  onItemClick: (id: string) => void
  onNewItem: () => void
  onTogglePin?: (id: string) => void
  onDelete?: (id: string) => void
}

interface ContextMenuState {
  show: boolean
  x: number
  y: number
  itemId: string
}

function Sidebar({
  mode,
  items,
  activeItemId,
  onItemClick,
  onNewItem,
  onTogglePin,
  onDelete
}: SidebarProps): React.JSX.Element {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    itemId: ''
  })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState('')

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, itemId: string): void => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      itemId
    })
  }

  // 关闭右键菜单
  const closeContextMenu = (): void => {
    setContextMenu({ show: false, x: 0, y: 0, itemId: '' })
  }

  // 处理置顶
  const handleTogglePin = (): void => {
    if (onTogglePin && contextMenu.itemId) {
      onTogglePin(contextMenu.itemId)
    }
    closeContextMenu()
  }

  // 处理删除（显示确认对话框）
  const handleDelete = (): void => {
    setDeleteItemId(contextMenu.itemId)
    setShowDeleteConfirm(true)
    closeContextMenu()
  }

  // 确认删除
  const confirmDelete = (): void => {
    if (onDelete && deleteItemId) {
      onDelete(deleteItemId)
    }
    setShowDeleteConfirm(false)
    setDeleteItemId('')
  }

  // 取消删除
  const cancelDelete = (): void => {
    setShowDeleteConfirm(false)
    setDeleteItemId('')
  }

  const currentItem = items.find((item) => item.id === contextMenu.itemId)
  return (
    <aside
      style={{
        width: '260px',
        height: '100%',
        borderRight: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      onClick={closeContextMenu}
    >
      {/* Header */}
      <div style={{ padding: '16px' }}>
        <button
          onClick={onNewItem}
          className="transition-all hover-lift"
          style={{
            width: '100%',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-text)',
            color: 'white',
            borderRadius: '18px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14m7-7H5" />
          </svg>
          <span>{mode === 'qa' ? '新建对话' : '新建角色'}</span>
        </button>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px 16px 8px'
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            onContextMenu={(e) => handleContextMenu(e, item.id)}
            className="transition-colors"
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor:
                activeItemId === item.id ? 'var(--color-bg-tertiary)' : 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {/* 置顶标记 */}
            {item.pinned && (
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-text)'
                }}
              />
            )}
            {/* Icon */}
            <div
              style={{
                width: '18px',
                height: '18px',
                marginTop: '1px',
                flexShrink: 0,
                color:
                  activeItemId === item.id
                    ? 'var(--color-text)'
                    : 'var(--color-text-tertiary)'
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {mode === 'qa' ? (
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                ) : (
                  <>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </>
                )}
              </svg>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '2px'
                }}
              >
                <span
                  className="text-ellipsis"
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color:
                      activeItemId === item.id ? 'var(--color-text)' : 'var(--color-text)',
                    flex: 1
                  }}
                >
                  {item.name}
                </span>
                {item.time && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-tertiary)',
                      flexShrink: 0
                    }}
                  >
                    {item.time}
                  </span>
                )}
              </div>
              {item.lastMessage && (
                <p
                  className="text-ellipsis"
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.4'
                  }}
                >
                  {item.lastMessage}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px',
            minWidth: '140px',
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleTogglePin}
            className="transition-colors"
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              fontSize: '13px',
              color: 'var(--color-text)',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 17v5m-7-5 7-7 7 7M12 2v10" />
            </svg>
            <span>{currentItem?.pinned ? '取消置顶' : '置顶对话'}</span>
          </button>

          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--color-border)',
              margin: '4px 0'
            }}
          />

          <button
            onClick={handleDelete}
            className="transition-colors"
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              fontSize: '13px',
              color: '#ef4444',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>删除对话</span>
          </button>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        show={showDeleteConfirm}
        title="删除对话"
        message="确定要删除这个对话吗？此操作无法撤销，所有消息将被永久删除。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDangerous={true}
      />
    </aside>
  )
}

export default Sidebar

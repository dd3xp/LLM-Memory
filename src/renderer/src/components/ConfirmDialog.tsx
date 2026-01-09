/**
 * 确认对话框 - 现代简约设计
 */

interface ConfirmDialogProps {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDangerous?: boolean
}

function ConfirmDialog({
  show,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  isDangerous = false
}: ConfirmDialogProps): React.JSX.Element | null {
  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onCancel}
    >
      <div
        className="animate-fadeIn"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--color-text)',
            marginBottom: '12px'
          }}
        >
          {title}
        </h3>

        {/* 消息 */}
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}
        >
          {message}
        </p>

        {/* 按钮组 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onCancel}
            className="transition-colors"
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: 'var(--color-text)',
              color: 'white',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-text)'
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="transition-colors"
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: isDangerous ? '#ef4444' : 'var(--color-text)',
              color: 'white',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDangerous ? '#dc2626' : '#333'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDangerous ? '#ef4444' : 'var(--color-text)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

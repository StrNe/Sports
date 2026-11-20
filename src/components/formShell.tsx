import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import { useUi } from '../store/useStore'
import { Button, Modal } from './ui'

// ── Coquille commune ───────────────────────────────────────
export function FormShell({ title, children, onSave, onDelete, canSave = true, wide, saveLabel = 'Enregistrer' }: { title: string; children: ReactNode; onSave: () => void; onDelete?: () => void; canSave?: boolean; wide?: boolean; saveLabel?: string }) {
  const close = useUi((s) => s.closeForm)
  const ask = useUi((s) => s.ask)
  return (
    <Modal
      open
      wide={wide}
      onClose={close}
      title={title}
      footer={
        <>
          {onDelete && (
            <Button
              variant="danger"
              className="mr-auto"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (await ask({ title: 'Supprimer cet élément ?', text: 'Cette action est définitive.', confirmLabel: 'Supprimer', danger: true })) {
                  onDelete()
                  close()
                }
              }}
            >
              Supprimer
            </Button>
          )}
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!canSave} onClick={onSave}>
            {saveLabel}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) onSave()
        }}
      >
        {children}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export function Row({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={clsx('grid gap-3', cols === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>{children}</div>
}


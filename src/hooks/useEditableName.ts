import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

export function useEditableName(initialName: string, onSave: (name: string) => void) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmitName = () => {
    const trimmed = editName.trim()
    if (trimmed) onSave(trimmed)
    else setEditName(initialName)
    setIsEditing(false)
  }

  const startEditing = () => {
    setEditName(initialName)
    setIsEditing(true)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmitName()
    if (e.key === 'Escape') {
      setEditName(initialName)
      setIsEditing(false)
    }
  }

  return {
    isEditing,
    editName,
    inputRef,
    setEditName,
    startEditing,
    handleSubmitName,
    handleKeyDown,
  }
}

import { useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  height?: string
  theme?: string
  readOnly?: boolean
}

export function MonacoEditor({ value, onChange, language = 'json', height = '400px', theme = 'vs-dark', readOnly = false }: MonacoEditorProps) {
  const editorRef = useRef<ReturnType<OnMount> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  return (
    <div className="border border-border rounded-lg overflow-hidden h-full w-full monaco-editor-container">
      <Editor
        height={height}
        defaultLanguage={language}
        theme={theme}
        value={value}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly: readOnly,
        }}
        onMount={(editor) => {
          editorRef.current = editor
          editor.onDidChangeModelContent(() => {
            const currentValue = editor.getValue()
            if (onChangeRef.current) {
              onChangeRef.current(currentValue)
            }
          })
        }}
      />
    </div>
  )
}

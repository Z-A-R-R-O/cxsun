import { useEffect, useRef } from 'react'

interface TerminalOutputProps {
  lines: string[]
  isLoading?: boolean
}

export function TerminalOutput({ lines, isLoading }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines])

  return (
    <div className="terminal-container" ref={containerRef}>
      {lines.map((line, idx) => (
        <div key={idx} className="terminal-line">
          {line}
        </div>
      ))}
      {isLoading && (
        <div className="terminal-line">
          <span className="terminal-cursor"></span>
        </div>
      )}
    </div>
  )
}

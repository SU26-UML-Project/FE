import { useEffect, useRef, useState } from 'react'
import LoadingOverlay from '../ui/LoadingOverlay'

const DRAWIO_ORIGIN = 'https://embed.diagrams.net'
const DRAWIO_URL = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&ui=min&libs=general;uml`

interface CanvasFrameProps {
  onXmlChange: (xml: string) => void
  onSave: (xml: string) => void
}

export default function CanvasFrame({ onXmlChange, onSave }: CanvasFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const readyRef = useRef(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== DRAWIO_ORIGIN) return

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

        if (data.event === 'init') {
          const iframeWindow = iframeRef.current?.contentWindow
          if (iframeWindow) {
            iframeWindow.postMessage(
              JSON.stringify({ action: 'load', xml: '' }),
              '*'
            )
          }
          readyRef.current = true
          setState('ready')
        }

        if (data.event === 'save') {
          onSave(data.xml)
          onXmlChange(data.xml)
        }

        if (data.event === 'export') {
          onXmlChange(data.data)
        }
      } catch (error) {
        console.error('draw.io message error:', error)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSave, onXmlChange])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readyRef.current) {
        setState('error')
      }
    }, 15000)
    return () => clearTimeout(timer)
  }, [])

  const handleRetry = () => {
    readyRef.current = false
    setState('loading')
    if (iframeRef.current) {
      iframeRef.current.src = DRAWIO_URL
    }
  }

  return (
    <div className="absolute inset-0 bg-gray-50">
      {state === 'loading' && <LoadingOverlay message="Loading diagram editor..." />}

      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-black mb-1">Unable to load diagram editor</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              The diagram editor could not be loaded. Check your connection or try opening it directly.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-uml-blue text-white font-bold rounded-md hover:bg-blue-700 transition text-sm uppercase tracking-wide"
              >
                Try Again
              </button>
              <a
                href="https://app.diagrams.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-uml-blue hover:underline font-medium"
              >
                Open draw.io in a new tab
              </a>
            </div>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        id="drawio-iframe"
        src={DRAWIO_URL}
        className={`w-full h-full border-0 transition-opacity duration-300 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        title="Diagram Editor"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}

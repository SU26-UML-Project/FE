interface LoadingOverlayProps {
  message?: string
  className?: string
  absolute?: boolean
}

const LoadingOverlay = ({
  message = 'Loading...',
  className = '',
  absolute = true,
}: LoadingOverlayProps) => {
  return (
    <div
      className={`${absolute ? 'absolute inset-0' : ''} flex items-center justify-center bg-white z-10 ${className}`}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">{message}</p>
      </div>
    </div>
  )
}

export default LoadingOverlay

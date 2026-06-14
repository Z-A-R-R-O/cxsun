interface TokenMeterProps {
  used: number
  budget: number
}

export function TokenMeter({ used, budget }: TokenMeterProps) {
  const percentage = Math.min(100, Math.round((used / budget) * 100))
  return (
    <div className="token-meter-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>Token Usage</span>
        <span>{used} / {budget} ({percentage}%)</span>
      </div>
      <div className="token-meter-bar-bg">
        <div className="token-meter-bar-fill" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  )
}

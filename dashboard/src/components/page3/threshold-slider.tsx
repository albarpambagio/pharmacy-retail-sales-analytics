"use client"

import { Slider } from "@/components/ui/slider"

interface ThresholdSliderProps {
  value: number
  onChange: (v: number) => void
}

export function ThresholdSlider({ value, onChange }: ThresholdSliderProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex-shrink-0">
        <label className="text-sm font-medium">Margin Threshold</label>
        <p className="text-xs text-muted-foreground">
          SKUs below this margin are flagged as at-risk
        </p>
      </div>
      <div className="flex flex-1 items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={0}
          max={30}
          step={1}
          className="flex-1"
        />
        <div className="flex-shrink-0 rounded-md bg-destructive/10 px-3 py-1.5 text-center">
          <span className="text-lg font-bold text-destructive">{value}%</span>
        </div>
      </div>
    </div>
  )
}

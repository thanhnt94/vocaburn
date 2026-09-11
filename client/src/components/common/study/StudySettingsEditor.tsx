import React from 'react'
import {
  Move,
  Layers,
  Headphones,
  Brain,
  Volume2,
  Zap,
  Shuffle,
  Eye,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedControl } from './SegmentedControl'
import { ToggleRow } from './ToggleRow'
import { type StudySettings, getFrontFontSizeStyle } from './StudyConstants'

interface StudySettingsEditorProps {
  settings: Partial<StudySettings>
  onChange: (key: string, value: any) => void
  compact?: boolean
  /** Hide the Queue & Algorithm section (e.g. in PlaySettingsModal where mode is already shown) */
  hideQueue?: boolean
}

export function StudySettingsEditor({
  settings,
  onChange,
  compact = false,
  hideQueue = false,
}: StudySettingsEditorProps) {
  const gap = compact ? "gap-3" : "gap-5"
  const sectionPadding = compact ? "p-3" : "p-4 sm:p-5"

  const rawFontSize = settings.front_font_size || '100%'
  const numMatch = String(rawFontSize).match(/\d+/)
  const currentFontPercent = numMatch ? parseInt(numMatch[0], 10) : 100

  const getFontLabel = (pct: number) => {
    if (pct <= 85) return 'Compact'
    if (pct <= 105) return 'Normal'
    if (pct <= 135) return 'Large'
    if (pct <= 165) return 'Extra Large'
    return 'Huge'
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 ${gap}`}>
      {/* GROUP 1: Gestures & Controls */}
      <div className={`space-y-3 ${sectionPadding} rounded-2xl bg-slate-50/70 border border-slate-200/70`}>
        <div className="flex items-center gap-2 text-indigo-600">
          <Move className="w-4 h-4" />
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Gestures & Controls
          </h4>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Card Flip Trigger
          </label>
          <SegmentedControl
            value={settings.card_flip_trigger || 'both'}
            onChange={(val) => onChange('card_flip_trigger', val)}
            options={[
              { id: 'both', label: 'Tap & Swipe' },
              { id: 'tap', label: 'Tap Card Body' },
              { id: 'button_only', label: 'Button Only' },
            ]}
            compact={compact}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            FSRS Rating Mode
          </label>
          <SegmentedControl
            value={settings.card_rating_mode || 'both'}
            onChange={(val) => onChange('card_rating_mode', val)}
            options={[
              { id: 'both', label: 'Hybrid' },
              { id: 'swipe_4way', label: '4-Way Swipe' },
              { id: 'swipe_2way', label: '2-Way Swipe' },
              { id: 'buttons', label: 'Buttons Only' },
            ]}
            compact={compact}
          />
        </div>

        <ToggleRow
          icon={Volume2}
          label="Sound Effects (SFX)"
          desc="Play audio feedback on card flips and answer ratings"
          checked={settings.sfx_enabled ?? true}
          onChange={(val) => onChange('sfx_enabled', val)}
          compact={compact}
        />

        <ToggleRow
          icon={Zap}
          label="Haptic Feedback"
          desc="Vibrate on mobile devices when swiping cards"
          checked={settings.haptic_enabled ?? true}
          onChange={(val) => onChange('haptic_enabled', val)}
          compact={compact}
        />
      </div>

      {/* GROUP 2: Display & Alignment */}
      <div className={`space-y-3 ${sectionPadding} rounded-2xl bg-slate-50/70 border border-slate-200/70`}>
        <div className="flex items-center gap-2 text-indigo-600">
          <Layers className="w-4 h-4" />
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Display & Card Alignment
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              Front Card V-Align
            </label>
            <SegmentedControl
              value={settings.front_valign || 'center'}
              onChange={(val) => onChange('front_valign', val)}
              options={[
                { id: 'center', label: 'Center' },
                { id: 'top', label: 'Top' },
              ]}
              compact={compact}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              Back Card V-Align
            </label>
            <SegmentedControl
              value={settings.back_valign || 'center'}
              onChange={(val) => onChange('back_valign', val)}
              options={[
                { id: 'center', label: 'Center' },
                { id: 'top', label: 'Top' },
              ]}
              compact={compact}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Illustration Images
          </label>
          <SegmentedControl
            value={settings.show_images || 'both'}
            onChange={(val) => onChange('show_images', val)}
            options={[
              { id: 'both', label: 'Both Sides' },
              { id: 'back_only', label: 'Back Only' },
              { id: 'none', label: 'Hidden' },
            ]}
            compact={compact}
          />
        </div>

        {/* Front Font Size Scale */}
        <div className="space-y-2 pt-2 border-t border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-indigo-600" />
              <label className="text-xs font-bold text-slate-800">
                Front Font Size
              </label>
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {currentFontPercent}% • {getFontLabel(currentFontPercent)}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-5 gap-1">
            {[
              { id: '85%', label: '85%', sub: 'Compact' },
              { id: '100%', label: '100%', sub: 'Normal' },
              { id: '125%', label: '125%', sub: 'Large' },
              { id: '150%', label: '150%', sub: 'XL' },
              { id: '175%', label: '175%', sub: 'Huge' },
            ].map((p) => {
              const active = currentFontPercent === parseInt(p.id, 10)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange('front_font_size', p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer border text-center",
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black"
                      : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span className="text-xs font-black leading-tight">{p.label}</span>
                  <span className={cn("text-[9px] tracking-tight leading-none mt-0.5", active ? "text-indigo-100" : "text-slate-400")}>
                    {p.sub}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Fine-Tuning Slider */}
          <div className="flex items-center gap-2.5 px-1 pt-0.5">
            <span className="text-[10px] font-bold text-slate-400">75%</span>
            <input
              type="range"
              min={75}
              max={200}
              step={5}
              value={currentFontPercent}
              onChange={(e) => onChange('front_font_size', `${e.target.value}%`)}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] font-bold text-slate-400">200%</span>
          </div>

          {/* Live Preview Box */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center overflow-hidden min-h-[50px]">
            <span
              className="font-black text-slate-800 tracking-tight transition-all duration-150 truncate max-w-full text-center"
              style={{ fontSize: getFrontFontSizeStyle(`${currentFontPercent}%`) }}
            >
              Aa Vocabulary
            </span>
          </div>
        </div>

        <ToggleRow
          icon={Eye}
          label="FSRS Algorithm Metrics"
          desc="Show memory stability, retrievability, and interval on card"
          checked={settings.show_fsrs ?? true}
          onChange={(val) => onChange('show_fsrs', val)}
          compact={compact}
        />
      </div>

      {/* GROUP 3: Audio & Pronunciation */}
      <div className={`space-y-3 ${sectionPadding} rounded-2xl bg-slate-50/70 border border-slate-200/70`}>
        <div className="flex items-center gap-2 text-indigo-600">
          <Headphones className="w-4 h-4" />
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Audio & Pronunciation
          </h4>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Autoplay Pronunciation
          </label>
          <SegmentedControl
            value={settings.autoplay_audio || 'always'}
            onChange={(val) => onChange('autoplay_audio', val)}
            options={[
              { id: 'always', label: 'Always' },
              { id: 'back', label: 'Back Only' },
              { id: 'front', label: 'Front Only' },
              { id: 'none', label: 'Off' },
            ]}
            compact={compact}
          />
        </div>
      </div>

      {/* GROUP 4: Queue & Algorithm */}
      {!hideQueue && (
        <div className={`space-y-3 ${sectionPadding} rounded-2xl bg-slate-50/70 border border-slate-200/70`}>
          <div className="flex items-center gap-2 text-indigo-600">
            <Brain className="w-4 h-4" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Queue & Review Order
            </h4>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Default Flashcard Mode
            </label>
            <SegmentedControl
              value={(() => {
                const cur = (settings.quiz_learning_mode || settings.learning_mode || 'fsrs') as string
                return cur === 'speed_skim' ? 'skim' : cur
              })()}
              onChange={(val) => onChange('quiz_learning_mode', val)}
              options={[
                { id: 'fsrs', label: '🧠 FSRS' },
                { id: 'skim', label: '⚡ Skim' },
                { id: 'review', label: '📚 Review' },
              ]}
              compact={compact}
            />
          </div>

          <ToggleRow
            icon={Shuffle}
            label="Randomize Card Order"
            desc="Shuffle cards within the review queue"
            checked={settings.random_enabled ?? false}
            onChange={(val) => onChange('random_enabled', val)}
            compact={compact}
          />
        </div>
      )}
    </div>
  )
}

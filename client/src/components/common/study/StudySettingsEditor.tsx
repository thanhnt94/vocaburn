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
} from 'lucide-react'
import { SegmentedControl } from './SegmentedControl'
import { ToggleRow } from './ToggleRow'
import type { StudySettings } from './StudyConstants'

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
              Card Order Mode
            </label>
            <SegmentedControl
              value={(settings.quiz_learning_mode || settings.learning_mode || 'fsrs') as string}
              onChange={(val) => onChange('quiz_learning_mode', val)}
              options={[
                { id: 'fsrs', label: 'FSRS v6' },
                { id: 'sequential', label: 'Sequential' },
                { id: 'unseen', label: 'New First' },
                { id: 'random', label: 'Shuffle' },
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

'use client'

import { Play, Pause, Loader2, Snail, AlertTriangle, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioPlayer, failureMessage, formatTime } from '@/lib/hooks/use-audio-player'

interface AudioPlayButtonProps {
  audioUrl?: string
  className?: string
}

export function AudioPlayButton({ audioUrl, className }: AudioPlayButtonProps) {
  const {
    audioState, speed, failure, currentTime, duration, volume, muted, showControls,
    handlePlay, handleSeek, toggleMute, handleVolumeChange, toggleSpeed,
    hasFailed, canRetry, isPermanentlyFailed, isPlaying,
  } = useAudioPlayer(audioUrl)

  if (!audioUrl) return null

  const playLabel = hasFailed
    ? failureMessage(failure!)
    : audioState === 'idle' ? 'Play audio'
    : audioState === 'loading' ? 'Loading audio...'
    : 'Stop audio'

  return (
    <div className={cn('inline-flex flex-col', className)}>
      <div className="inline-flex items-center gap-0.5">
        {/* Play / retry button */}
        <button
          type="button"
          onClick={handlePlay}
          aria-label={playLabel}
          title={playLabel}
          disabled={audioState === 'loading' || isPermanentlyFailed}
          className={cn(
            'inline-flex items-center justify-center size-7 rounded-full border border-border bg-card text-muted-foreground',
            'transition-all duration-150 hover:scale-105',
            'hover:border-primary/60 hover:text-primary hover:bg-primary/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            audioState === 'playing' &&
              'border-primary text-primary bg-primary/10 hover:border-primary hover:text-primary hover:bg-primary/20',
            audioState === 'loading' && 'opacity-60 cursor-wait hover:scale-100',
            hasFailed && 'border-destructive/40 text-destructive hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5',
            isPermanentlyFailed && 'opacity-50 cursor-not-allowed hover:scale-100',
          )}
        >
          {audioState === 'loading' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : hasFailed ? (
            canRetry ? <RefreshCw className="size-3.5" aria-hidden="true" />
            : <AlertTriangle className="size-3.5" aria-hidden="true" />
          ) : audioState === 'playing' ? (
            <Pause className="size-3.5" aria-hidden="true" />
          ) : (
            <Play className="size-3.5 fill-current translate-x-px" aria-hidden="true" />
          )}
        </button>

        {/* Speed toggle */}
        <button
          type="button"
          onClick={toggleSpeed}
          aria-label={speed === 'normal' ? 'Switch to slow playback' : 'Switch to normal speed'}
          title={speed === 'normal' ? 'Slow speed' : 'Normal speed'}
          className={cn(
            'inline-flex items-center justify-center size-5 rounded-full transition-all duration-150 hover:bg-accent',
            speed === 'slow' ? 'text-primary bg-primary/10' : 'text-muted-foreground/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Snail className={cn('size-3 transition-transform', speed === 'slow' && 'scale-90')} aria-hidden="true" />
        </button>
      </div>

      {/* Seek bar + time + volume */}
      {showControls && (
        <div className="flex items-center gap-1.5 mt-1.5 min-w-35 max-w-50">
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0 select-none">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio position"
            className="flex-1 h-1 appearance-none bg-muted rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-0
              [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-left shrink-0 select-none">
            {formatTime(duration)}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="inline-flex items-center justify-center size-4 rounded hover:bg-accent text-muted-foreground"
            >
              {muted || volume === 0 ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="w-12 h-1 appearance-none bg-muted rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-2 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-0
                [&::-moz-range-thumb]:size-2 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}
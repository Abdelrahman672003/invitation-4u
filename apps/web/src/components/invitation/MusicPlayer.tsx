import { useEffect, useRef, useState } from 'react';
import { Music2, VolumeX } from 'lucide-react';
import type { TemplateDesign } from '@invite/shared';

/**
 * A small floating button that plays the host's background track. Browsers only allow sound after a
 * tap, so playback starts from the envelope's tap (`startSignal`) or from this button.
 */
export function MusicPlayer({
  src,
  palette,
  startSignal,
  label,
}: {
  src: string;
  palette: TemplateDesign['palette'];
  startSignal: number;
  label: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (startSignal === 0) return;
    void audio.current?.play().catch(() => undefined);
  }, [startSignal]);

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => undefined);
    else element.pause();
  }

  return (
    <>
      <audio
        ref={audio}
        src={src}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={playing}
        className="fixed bottom-5 end-5 z-50 grid size-12 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ background: palette.accent }}
      >
        {playing ? (
          <Music2 className="size-5 animate-pulse" aria-hidden />
        ) : (
          <VolumeX className="size-5" aria-hidden />
        )}
      </button>
    </>
  );
}

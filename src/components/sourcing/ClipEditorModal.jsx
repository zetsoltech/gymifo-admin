import { useEffect, useRef, useState } from 'react';
import { vidIdFromUrl } from '../../lib/sourcing.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Load the YouTube IFrame API once, shared across opens ────────────────────
let ytApiPromise = null;
function loadYouTubeIframeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

function fmtT(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, '0')}`;
}

/**
 * Mark the start/end of the rep segment for a picked YouTube video. The yt-dlp
 * export trims to this clip at download time (--download-sections). Rendered
 * only while open (parent conditionally mounts it).
 */
export function ClipEditorModal({ exerciseName, videoUrl, initialClip, onSave, onClose }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const tickRef = useRef(null);
  const loopRef = useRef(null);

  const [start, setStart] = useState(initialClip?.start ?? null);
  const [end, setEnd] = useState(initialClip?.end ?? null);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);

  // refs mirror state so the loop interval reads fresh values without re-binding
  const startRef = useRef(start);
  const endRef = useRef(end);
  useEffect(() => {
    startRef.current = start;
  }, [start]);
  useEffect(() => {
    endRef.current = end;
  }, [end]);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      const host = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(host);
      playerRef.current = new YT.Player(host, {
        videoId: vidIdFromUrl(videoUrl),
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            setReady(true);
            if (startRef.current != null) playerRef.current.seekTo(startRef.current, true);
          },
        },
      });
      tickRef.current = setInterval(() => {
        const p = playerRef.current;
        if (p && p.getCurrentTime) setNow(p.getCurrentTime());
      }, 100);
    });

    return () => {
      cancelled = true;
      clearInterval(tickRef.current);
      clearInterval(loopRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = (t) => playerRef.current?.seekTo?.(t, true);

  function setStartHere() {
    const t = +playerRef.current.getCurrentTime().toFixed(1);
    setStart(t);
    if (end != null && end <= t) setEnd(null);
  }
  function setEndHere() {
    const t = +playerRef.current.getCurrentTime().toFixed(1);
    setEnd(t);
    if (start != null && start >= t) setStart(null);
  }
  function nudgeStart(delta) {
    if (start == null) return;
    const t = Math.max(0, +(start + delta).toFixed(1));
    setStart(t);
    seek(t);
  }
  function nudgeEnd(delta) {
    if (end == null) return;
    setEnd(+(end + delta).toFixed(1));
  }
  function previewLoop() {
    if (start == null || end == null || end <= start) return;
    clearInterval(loopRef.current);
    seek(start);
    playerRef.current.playVideo();
    loopRef.current = setInterval(() => {
      if (playerRef.current.getCurrentTime() >= endRef.current) seek(startRef.current);
    }, 100);
  }
  function save() {
    if (start == null || end == null || end <= start) return;
    onSave({ start, end });
  }

  const len = start != null && end != null && end > start ? end - start : null;
  const validClip = len != null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Set clip — {exerciseName}</DialogTitle>
          <DialogDescription className="sr-only">
            Mark the start and end of the rep segment to trim on download.
          </DialogDescription>
        </DialogHeader>

        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black" ref={containerRef} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm tabular-nums">
            ▶ {fmtT(now)}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={setStartHere} disabled={!ready}>
            ⟦ Set start
          </Button>
          <span className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm tabular-nums">
            Start: {fmtT(start)}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={setEndHere} disabled={!ready}>
            Set end ⟧
          </Button>
          <span className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm tabular-nums">
            End: {fmtT(end)}
          </span>
          {len != null && (
            <span className={`text-sm ${len > 12 ? 'text-chart-4' : 'text-muted-foreground'}`}>
              Length: {len.toFixed(1)}s{len > 12 ? ' (long — aim ≤10s)' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={previewLoop} disabled={!validClip}>
            ↺ Preview clip (loop)
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudgeStart(-0.5)} disabled={start == null}>
            start −0.5s
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudgeStart(0.5)} disabled={start == null}>
            start +0.5s
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudgeEnd(-0.5)} disabled={end == null}>
            end −0.5s
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudgeEnd(0.5)} disabled={end == null}>
            end +0.5s
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!validClip}>
            Save clip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

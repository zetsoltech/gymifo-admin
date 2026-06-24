// ─────────────────────────────────────────────────────────────────────────────
// Sourcing helpers — ported from the standalone catalog tools (animations.html /
// catalog.html) and adapted for the admin SPA. Pure logic only: ExerciseDB match
// scoring, YouTube search, and the download-script generators. State/persistence
// lives in hooks/useSourcing.js; React UI lives in pages/SourcingPage.jsx.
// ─────────────────────────────────────────────────────────────────────────────

// ── ExerciseDB animation dataset (jsDelivr CDN, no API key needed) ───────────
export const EXERCISEDB_CDN = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/';
export const EXERCISEDB_DATA_URL = EXERCISEDB_CDN + 'data/exercises.json';
export const MAX_ANIM_CANDIDATES = 8; // matches shown per exercise

// localStorage namespaces — keyed by DB exercise id (not the old hardcoded name).
export const ANIM_STORE_KEY = 'gymifo_sourcing_anim';
export const YT_STORE_KEY = 'gymifo_sourcing_yt';
export const YT_API_KEY_STORE = 'gymifo_yt_key';

// YouTube Data API
export const YT_PER_EXERCISE = 6; // results per exercise

export async function fetchExerciseDbDataset() {
  const res = await fetch(EXERCISEDB_DATA_URL);
  if (!res.ok) throw new Error(`Failed to load ExerciseDB dataset (HTTP ${res.status})`);
  return res.json();
}

// ── Matching: score dataset entries against an exercise name ─────────────────
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return norm(s).split(' ').filter(Boolean);
}

/** Top-N ExerciseDB candidates for an exercise name, scored by token overlap. */
export function candidatesFor(exerciseName, dataset, max = MAX_ANIM_CANDIDATES) {
  if (!Array.isArray(dataset) || !dataset.length) return [];
  const qt = tokens(exerciseName);
  if (!qt.length) return [];
  const nq = norm(exerciseName);
  const scored = dataset
    .map((d) => {
      const nt = tokens(d.name);
      const ns = norm(d.name);
      let score = 0;
      if (ns === nq) score += 100;
      const matched = qt.filter((t) => nt.includes(t)).length;
      score += (matched / qt.length) * 60; // token coverage
      if (ns.startsWith(nq) || nq.startsWith(ns)) score += 15;
      if (ns.includes(nq)) score += 10;
      score -= Math.abs(nt.length - qt.length) * 1.5; // prefer similar length
      return { d, score };
    })
    .filter((x) => x.score > 25)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, max).map((x) => ({
    id: x.d.id,
    name: x.d.name,
    target: x.d.target,
    equipment: x.d.equipment,
    gif: EXERCISEDB_CDN + x.d.gif_url,
  }));
}

// ── YouTube search (client-side key, prototype-style) ────────────────────────
// Note: a SPA key is visible in client traffic. Restrict it in Google Cloud to
// the YouTube Data API v3 + an HTTP-referrer allowlist for your admin origin.
export function buildYouTubeQuery(ex) {
  return (
    `"${ex}" exercise demonstration proper form full body trainer technique ` +
    `-shorts -short -reel -reels -mistakes -podcast -compilation -"top 10"`
  );
}

/** Returns { items, nextPageToken }. pageToken pages forward for "Search others". */
export async function searchYouTube(key, ex, pageToken) {
  if (!key) throw new Error('NO_KEY');
  const q = buildYouTubeQuery(ex);
  let url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
    `&videoEmbeddable=true&videoDuration=medium&order=relevance` + // medium = 4–20 min → excludes Shorts
    `&maxResults=${YT_PER_EXERCISE}&q=${encodeURIComponent(q)}&key=${key}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const res = await fetch(url);
  if (res.status === 403) throw new Error('QUOTA_OR_KEY');
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error('HTTP ' + res.status);

  const j = await res.json();
  const items = (j.items || []).map((it) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channel: it.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
  }));
  return { items, nextPageToken: j.nextPageToken || null };
}

export function ytErrorMessage(err) {
  const m = err?.message;
  if (m === 'NO_KEY') return 'Paste your YouTube Data API key first.';
  if (m === 'QUOTA_OR_KEY' || m === 'RATE_LIMIT')
    return 'Daily quota likely hit (or key issue) — try again tomorrow. Cached results are saved.';
  return 'Error: ' + (m || 'request failed');
}

// ── Export scripts ───────────────────────────────────────────────────────────
function safeName(name) {
  return String(name || 'exercise').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}

export function vidIdFromUrl(u) {
  const m = String(u || '').match(/[?&]v=([^&]+)/);
  return m ? m[1] : '';
}

/**
 * Animations export: download each gif, then loop it into a longer MP4.
 * `picks` = [{ exercise, gif, name, id }]. Returns { json, sh }.
 */
export function buildAnimationExport(picks, reps = 3) {
  const json = JSON.stringify(picks, null, 2);
  const r = Math.max(1, Math.min(10, parseInt(reps, 10) || 3));
  const loops = r - 1; // -stream_loop N repeats the gif N extra times → r total
  let sh =
    '#!/bin/bash\n# Requires: brew install ffmpeg\n' +
    `# Each clip is looped to ${r} reps.\nmkdir -p downloads\n`;
  picks.forEach((p) => {
    const safe = safeName(p.exercise);
    sh += `curl -L "${p.gif}" -o "downloads/${safe}.gif"\n`;
    sh +=
      `ffmpeg -y -stream_loop ${loops} -i "downloads/${safe}.gif" ` +
      `-movflags +faststart -pix_fmt yuv420p ` +
      `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "downloads/${safe}.mp4"\n`;
  });
  return { json, sh, count: picks.length, reps: r };
}

/**
 * YouTube export: yt-dlp script that trims to the clip when set and outputs a
 * Mac-friendly MP4. `picks` = [{ exercise, url, title, channel, clip }].
 */
export function buildYoutubeExport(picks) {
  const json = JSON.stringify(picks, null, 2);
  let sh = '#!/bin/bash\n# Requires: brew install yt-dlp ffmpeg\nmkdir -p downloads\n';
  const FMT =
    `-f "bestvideo[ext=mp4][vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
    `--merge-output-format mp4 --recode-video mp4`;
  picks.forEach((p) => {
    const safe = safeName(p.exercise);
    let section = '';
    if (p.clip && p.clip.end > p.clip.start) {
      section = `--download-sections "*${p.clip.start}-${p.clip.end}" --force-keyframes-at-cuts `;
    }
    sh += `yt-dlp ${section}${FMT} "${p.url}" -o "downloads/${safe}.%(ext)s"\n`;
  });
  const clipped = picks.filter((p) => p.clip).length;
  return { json, sh, count: picks.length, clipped };
}

/** Trigger a client-side text-file download. */
export function downloadTextFile(name, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

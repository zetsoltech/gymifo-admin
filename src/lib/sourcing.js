// ─────────────────────────────────────────────────────────────────────────────
// Sourcing helpers — ported from standalone catalog tools and adapted for the
// admin SPA. Pure logic only. State/persistence: hooks/useSourcing.js.
// UI: pages/SourcingPage.jsx + components/sourcing/.
// ─────────────────────────────────────────────────────────────────────────────

// ── ExerciseDB animation dataset (jsDelivr CDN, no API key needed) ───────────
export const EXERCISEDB_CDN = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/';
export const EXERCISEDB_DATA_URL = EXERCISEDB_CDN + 'data/exercises.json';
export const MAX_ANIM_CANDIDATES = 8;

// localStorage namespaces — keyed by DB exercise id.
export const ANIM_STORE_KEY = 'gymifo_sourcing_anim';
export const YT_STORE_KEY = 'gymifo_sourcing_yt';
export const MIXAMO_STORE_KEY = 'gymifo_sourcing_mixamo';
export const STOCK_STORE_KEY = 'gymifo_sourcing_stock';
export const YT_API_KEY_STORE = 'gymifo_yt_key';
export const PEXELS_KEY_STORE = 'gymifo_pexels_key';
export const ANIMATIC_STORE_KEY = 'gymifo_sourcing_animatic';
export const ANIMATIC_BASE_URL = 'https://www.exerciseanimatic.com/product-page/';

export const YT_PER_EXERCISE = 6;

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
      score += (matched / qt.length) * 60;
      if (ns.startsWith(nq) || nq.startsWith(ns)) score += 15;
      if (ns.includes(nq)) score += 10;
      score -= Math.abs(nt.length - qt.length) * 1.5;
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

// ── YouTube search ────────────────────────────────────────────────────────────
// mode='demo'     short (<4 min) clips targeting clean silent form demos.
// mode='tutorial' medium (4-20 min) full tutorial videos (original behavior).
// Note: the key is visible in client traffic — restrict it in Google Cloud to
// the YouTube Data API v3 + an HTTP-referrer allowlist for your admin origin.
export function buildYouTubeQuery(ex, mode = 'demo') {
  if (mode === 'demo') {
    return (
      `"${ex}" exercise form reps technique demonstration ` +
      `-tutorial -"how to" -tips -mistakes -podcast -compilation -"top 10" -review -program -week -series`
    );
  }
  return (
    `"${ex}" exercise demonstration proper form full body trainer technique ` +
    `-shorts -short -reel -reels -mistakes -podcast -compilation -"top 10"`
  );
}

/** Returns { items, nextPageToken }. pageToken pages forward for "Search others". */
export async function searchYouTube(key, ex, pageToken, mode = 'demo') {
  if (!key) throw new Error('NO_KEY');
  const q = buildYouTubeQuery(ex, mode);
  const duration = mode === 'demo' ? 'short' : 'medium';
  let url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
    `&videoEmbeddable=true&videoDuration=${duration}&order=relevance` +
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

// ── Pexels stock footage search ───────────────────────────────────────────────
// Free API key: https://www.pexels.com/api/ — 25k requests/month included.
export async function searchPexels(key, query, page = 1) {
  if (!key) throw new Error('NO_PEXELS_KEY');
  const q = encodeURIComponent(`${query} exercise`);
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${q}&per_page=6&page=${page}&orientation=landscape&size=medium`,
    { headers: { Authorization: key } },
  );
  if (res.status === 401 || res.status === 403) throw new Error('PEXELS_KEY_INVALID');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const items = (j.videos || [])
    .map((v) => {
      const hdFile =
        v.video_files?.find((f) => f.quality === 'hd' && f.file_type === 'video/mp4') ||
        v.video_files?.find((f) => f.file_type === 'video/mp4') ||
        v.video_files?.[0];
      return {
        id: v.id,
        url: v.url,
        thumbnail: v.image,
        duration: v.duration,
        user: v.user?.name || '',
        downloadUrl: hdFile?.link || '',
        width: hdFile?.width,
        height: hdFile?.height,
      };
    })
    .filter((v) => v.downloadUrl);
  return { items, totalResults: j.total_results || 0, page };
}

export function pexelsErrorMessage(err) {
  const m = err?.message;
  if (m === 'NO_PEXELS_KEY') return 'Paste your Pexels API key to search stock footage.';
  if (m === 'PEXELS_KEY_INVALID') return 'Invalid Pexels API key — check your credentials.';
  return 'Error: ' + (m || 'request failed');
}

// ── ExerciseAnimatic.com sourcing ─────────────────────────────────────────────
// Wix site with 2,595 exercise animation products. Slugs bundled as
// /animatic_slugs.json in public/. Product pages can be iframed (no X-Frame-Options).
export async function fetchAnimaticSlugs() {
  const res = await fetch('/animatic_slugs.json');
  if (!res.ok) throw new Error(`Failed to load ExerciseAnimatic catalogue (HTTP ${res.status})`);
  return res.json();
}

export function slugToName(slug) {
  return String(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Top-N ExerciseAnimatic slug candidates for an exercise name, scored by token overlap. */
export function candidatesFromAnimatic(exerciseName, slugs, max = 6) {
  if (!Array.isArray(slugs) || !slugs.length) return [];
  const qt = tokens(exerciseName);
  if (!qt.length) return [];
  const nq = norm(exerciseName);
  const scored = slugs.map((slug) => {
    const nt = tokens(slug.replace(/-/g, ' '));
    const ns = norm(slug.replace(/-/g, ' '));
    let score = 0;
    if (ns === nq) score += 100;
    const matched = qt.filter((t) => nt.includes(t)).length;
    score += (matched / qt.length) * 60;
    if (ns.startsWith(nq) || nq.startsWith(ns)) score += 15;
    if (ns.includes(nq)) score += 10;
    score -= Math.abs(nt.length - qt.length) * 1.5;
    return { slug, score };
  });
  return scored
    .filter((x) => x.score > 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => ({ slug: x.slug, name: slugToName(x.slug), url: ANIMATIC_BASE_URL + x.slug }));
}

// ── Mixamo animation map ──────────────────────────────────────────────────────
// Maps DB exercise names → Mixamo search terms.
// null = no known Mixamo equivalent (weighted/machine exercises).
export const MIXAMO_MAP = {
  'Push-Up': 'Push Up',
  'Knee Push-Up': 'Push Up',
  'Diamond Push-Up': 'Push Up',
  'Decline Push-Up': 'Push Up',
  'Wall Push-Up': 'Push Up',
  'Pike Push-Up': 'Push Up',
  'Archer Push-Up': 'Push Up',
  'Plank': 'Plank',
  'Side Plank': 'Plank',
  'Hollow Hold': 'Plank',
  'Mountain Climbers': 'Mountain Climbers',
  'Jumping Jacks': 'Jumping Jacks',
  'Bodyweight Squat': 'Squat',
  'Jump Squat': 'Jump Squat',
  'Goblet Squat': 'Squat',
  'Goblet Squat (Tempo)': 'Squat',
  'Split Squat': 'Split Squat',
  'Bulgarian Split Squat': 'Split Squat',
  'Squat': 'Squat',
  'Reverse Lunge': 'Lunge',
  'Reverse Lunge (Dumbbells)': 'Lunge',
  'Walking Lunge': 'Walking Lunge',
  'Lateral Lunge': 'Lunge',
  'Curtsy Lunge': 'Lunge',
  'Jump Lunges': 'Jumping Lunge',
  'Lunge': 'Lunge',
  'Sit-Up': 'Sit Up',
  'Crunch': 'Crunch',
  'Reverse Crunch': 'Crunch',
  'Bicycle Crunch': 'Bicycle Crunch',
  'Russian Twist': 'Russian Twist',
  'V-Up': 'Sit Up',
  'Leg Raise (Lying)': 'Sit Up',
  'Dead Bug': 'Dead Bug',
  'Superman': 'Superman',
  'Box Jump': 'Box Jump',
  'Step-Up': 'Step Up',
  'Jump Rope': 'Jump Rope',
  'High Knees': 'High Knees',
  'Burpee': 'Burpee',
  'Bear Crawl': 'Crawling',
  'Skater Hops': 'Skater',
  'Glute Bridge': 'Hip Thrust',
  'Hip Thrust (Barbell)': 'Hip Thrust',
  'Pull-Up': 'Pull Up',
  'Chin-Up': 'Chin Up',
  'Assisted Pull-Up': 'Pull Up',
  'Inverted Row': 'Pull Up',
  'Treadmill Run': 'Running',
  // Weighted / machine exercises — no props-based Mixamo equivalents
  'Barbell Bench Press': null,
  'Incline Dumbbell Press': null,
  'Dumbbell Bench Press': null,
  'Cable Fly': null,
  'Dumbbell Fly': null,
  'Pec Deck': null,
  'Chest Press Machine': null,
  'Lateral Raise': null,
  'Front Raise': null,
  'Rear Delt Raise': null,
  'Face Pull (Rope)': null,
  'Reverse Fly': null,
  'Cable Lateral Raise': null,
  'Barbell Overhead Press': null,
  'Dumbbell Shoulder Press': null,
  'Seated Dumbbell Shoulder Press': null,
  'Machine Shoulder Press': null,
  'Lat Pulldown': null,
  'Seated Cable Row': null,
  'Dumbbell Row': null,
  'Single-Arm Dumbbell Row': null,
  'Barbell Row': null,
  'T-Bar Row': null,
  'Meadows Row': null,
  'Back Extension': null,
  'Dumbbell Curl': null,
  'Hammer Curl': null,
  'Cable Curl': null,
  'EZ-Bar Curl': null,
  'Incline Dumbbell Curl': null,
  'Preacher Curl': null,
  'Concentration Curl': null,
  'Tricep Pushdown': null,
  'Rope Pushdown': null,
  'Dumbbell Kickback': null,
  'Skull Crushers (EZ-Bar)': null,
  'Close-Grip Bench Press': null,
  'Leg Press': null,
  'Leg Extension': null,
  'Lying Leg Curl': null,
  'Seated Calf Raise': null,
  'Standing Calf Raise': null,
  'Calf Raise': null,
  'Hack Squat': null,
  'Smith Machine Squat': null,
  'Back Squat': null,
  'Front Squat': null,
  'Deadlift (Conventional)': null,
  'Romanian Deadlift (Barbell)': null,
  'Dumbbell Deadlift': null,
  'Single-Leg RDL': null,
  'Kettlebell Swing': null,
  'Landmine Press': null,
  'Cable Woodchop': null,
  'Shrug (Dumbbells)': null,
  'Shrug (Barbell)': null,
  'Bench Dips': null,
  'Battle Ropes': null,
  'Farmer Carry': null,
  'Sled Push': null,
  'Medicine Ball Slam': null,
  'Rowing Machine': null,
  'Stationary Bike': null,
  'Stair Climber': null,
  'Hanging Leg Raise': null,
  'Hanging Knee Raise': null,
  'Wall Sit': null,
  'Flutter Kicks': null,
  'Bird Dog': null,
};

/** Returns the best Mixamo search term for an exercise, or null if unknown. */
export function suggestMixamoName(exerciseName) {
  if (!exerciseName) return null;
  if (exerciseName in MIXAMO_MAP) return MIXAMO_MAP[exerciseName];
  const lower = exerciseName.toLowerCase().replace(/[()]/g, '');
  for (const [key, val] of Object.entries(MIXAMO_MAP)) {
    if (val && lower.includes(key.toLowerCase().replace(/[()]/g, ''))) return val;
  }
  return null;
}

// ── Export scripts ────────────────────────────────────────────────────────────
function safeName(name) {
  return String(name || 'exercise').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}

export function vidIdFromUrl(u) {
  const m = String(u || '').match(/[?&]v=([^&]+)/);
  return m ? m[1] : '';
}

/**
 * Improved GIF → MP4:
 * 1. hue=s=0        desaturate (removes colored muscle highlights)
 * 2. pad            40% whitespace border so the figure isn't edge-to-edge
 * 3. scale          normalize to 512×512 preserving aspect ratio
 * 4. pad            center in square canvas
 * 5. minterpolate   smooth 2-3 keyframes to 24 fps for AI motion reference
 */
export function buildAnimationExport(picks, reps = 3) {
  const json = JSON.stringify(picks, null, 2);
  const r = Math.max(1, Math.min(10, parseInt(reps, 10) || 3));
  const loops = r - 1;
  let sh =
    '#!/bin/bash\n# Requires: brew install ffmpeg\n' +
    `# Each clip is looped ${r}x then smoothed to 24 fps.\n` +
    'mkdir -p downloads/exercisedb\n';
  picks.forEach((p) => {
    const s = safeName(p.exercise);
    sh += `curl -L "${p.gif}" -o "downloads/exercisedb/${s}.gif"\n`;
    sh +=
      `ffmpeg -y -stream_loop ${loops} -i "downloads/exercisedb/${s}.gif" ` +
      `-vf "hue=s=0,` +
      `pad=ceil(iw*1.4)/2*2:ceil(ih*1.4)/2*2:(ow-iw)/2:(oh-ih)/2:white,` +
      `scale=512:512:force_original_aspect_ratio=decrease,` +
      `pad=512:512:(ow-iw)/2:(oh-ih)/2:white,` +
      `minterpolate=fps=24:mi_mode=blend" ` +
      `-movflags +faststart -pix_fmt yuv420p "downloads/exercisedb/${s}.mp4"\n`;
  });
  return { json, sh, count: picks.length, reps: r };
}

/** YouTube export: yt-dlp script, trims to clip when set. */
export function buildYoutubeExport(picks) {
  const json = JSON.stringify(picks, null, 2);
  let sh = '#!/bin/bash\n# Requires: brew install yt-dlp ffmpeg\nmkdir -p downloads/youtube\n';
  const FMT =
    `-f "bestvideo[ext=mp4][vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
    `--merge-output-format mp4 --recode-video mp4`;
  picks.forEach((p) => {
    const s = safeName(p.exercise);
    let section = '';
    if (p.clip && p.clip.end > p.clip.start) {
      section = `--download-sections "*${p.clip.start}-${p.clip.end}" --force-keyframes-at-cuts `;
    }
    sh += `yt-dlp ${section}${FMT} "${p.url}" -o "downloads/youtube/${s}.%(ext)s"\n`;
  });
  const clipped = picks.filter((p) => p.clip).length;
  return { json, sh, count: picks.length, clipped };
}

/**
 * Unified export across all four sourcing modes.
 * Generates download_all.sh + picks_manifest.json.
 * If Mixamo items exist, also call buildBlenderScript() for render.py.
 */
export function buildUnifiedExport({ exercises, animStore, ytStore, mixamoStore, stockStore, animaticStore, reps }) {
  const r = Math.max(1, Math.min(10, parseInt(reps, 10) || 3));
  const manifest = [];

  for (const ex of exercises) {
    const id = ex.id;
    const animPick = animStore[id];
    const ytEntry = ytStore[id];
    const mixamoPick = mixamoStore[id];
    const stockEntry = stockStore[id];
    const animaticPick = (animaticStore || {})[id];

    if (animPick && animPick !== 'none') {
      manifest.push({ exercise: ex.name, exerciseId: id, source: 'exercisedb', gif: animPick.gif, animName: animPick.name });
    }
    if (ytEntry?.pick && ytEntry.pick !== 'none') {
      const c = (ytEntry.candidates || []).find((x) => x.url === ytEntry.pick);
      manifest.push({ exercise: ex.name, exerciseId: id, source: 'youtube', url: ytEntry.pick, title: c?.title || '', channel: c?.channel || '', clip: ytEntry.clip || null });
    }
    if (mixamoPick && mixamoPick !== 'none') {
      manifest.push({ exercise: ex.name, exerciseId: id, source: 'mixamo', animationName: mixamoPick.animName });
    }
    if (stockEntry?.pick && stockEntry.pick !== 'none') {
      const sp = stockEntry.pick;
      manifest.push({ exercise: ex.name, exerciseId: id, source: 'pexels', downloadUrl: sp.downloadUrl, videoId: sp.id, duration: sp.duration });
    }
    if (animaticPick && animaticPick !== 'none') {
      manifest.push({ exercise: ex.name, exerciseId: id, source: 'exerciseanimatic', url: animaticPick.url, slug: animaticPick.slug, videoUrl: animaticPick.videoUrl || null });
    }
  }

  if (!manifest.length) return null;

  const gifItems = manifest.filter((m) => m.source === 'exercisedb');
  const ytItems = manifest.filter((m) => m.source === 'youtube');
  const mixamoItems = manifest.filter((m) => m.source === 'mixamo');
  const stockItems = manifest.filter((m) => m.source === 'pexels');
  const animaticItems = manifest.filter((m) => m.source === 'exerciseanimatic');
  const sources = [
    gifItems.length && 'ExerciseDB',
    ytItems.length && 'YouTube',
    mixamoItems.length && 'Mixamo',
    stockItems.length && 'Pexels',
    animaticItems.length && 'ExerciseAnimatic',
  ].filter(Boolean);

  let sh = `#!/bin/bash
# Gymifo — unified exercise reference download
# Sources: ${sources.join(', ')} · Total picks: ${manifest.length}
# Requires: brew install ffmpeg yt-dlp curl
set -e
mkdir -p downloads/exercisedb downloads/youtube downloads/mixamo/fbx downloads/stock downloads/animatic\n\n`;

  if (gifItems.length) {
    const loops = r - 1;
    sh += `# ── ExerciseDB GIFs → cleaned MP4 (grayscale · padded · smoothed) ────────\n`;
    for (const p of gifItems) {
      const s = safeName(p.exercise);
      sh +=
        `curl -L "${p.gif}" -o "downloads/exercisedb/${s}.gif"\n` +
        `ffmpeg -y -stream_loop ${loops} -i "downloads/exercisedb/${s}.gif" \\\n` +
        `  -vf "hue=s=0,` +
        `pad=ceil(iw*1.4)/2*2:ceil(ih*1.4)/2*2:(ow-iw)/2:(oh-ih)/2:white,` +
        `scale=512:512:force_original_aspect_ratio=decrease,` +
        `pad=512:512:(ow-iw)/2:(oh-ih)/2:white,` +
        `minterpolate=fps=24:mi_mode=blend" \\\n` +
        `  -movflags +faststart -pix_fmt yuv420p "downloads/exercisedb/${s}.mp4"\n\n`;
    }
  }

  if (ytItems.length) {
    const FMT = `-f "bestvideo[ext=mp4][vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 --recode-video mp4`;
    sh += `# ── YouTube clips ─────────────────────────────────────────────────────────\n`;
    for (const p of ytItems) {
      const s = safeName(p.exercise);
      let section = '';
      if (p.clip && p.clip.end > p.clip.start) {
        section = `--download-sections "*${p.clip.start}-${p.clip.end}" --force-keyframes-at-cuts `;
      }
      sh += `yt-dlp ${section}${FMT} "${p.url}" -o "downloads/youtube/${s}.%(ext)s"\n`;
    }
    sh += '\n';
  }

  if (stockItems.length) {
    sh += `# ── Pexels stock footage ──────────────────────────────────────────────────\n`;
    for (const p of stockItems) {
      sh += `curl -L "${p.downloadUrl}" -o "downloads/stock/${safeName(p.exercise)}.mp4"\n`;
    }
    sh += '\n';
  }

  if (mixamoItems.length) {
    sh += `# ── Mixamo FBX → Blender render (manual download required) ───────────────\n`;
    sh += `# 1. Download each FBX from mixamo.com into downloads/mixamo/fbx/:\n`;
    for (const p of mixamoItems) {
      sh += `#    "${p.animationName}"  →  downloads/mixamo/fbx/${safeName(p.exercise)}.fbx\n`;
    }
    sh += `# 2. Then render:\n`;
    sh += `#    blender --background --python downloads/mixamo/render.py\n\n`;
  }

  if (animaticItems.length) {
    sh += `# ── ExerciseAnimatic.com ──────────────────────────────────────────────────\n`;
    sh += `# Video URLs are captured via Preview → right-click video → Copy Video Address.\n`;
    sh += `#\n`;
    sh += `# Watermark removal (for private AI/pose reference use):\n`;
    sh += `#   Step 1 — calibrate: run with SHOW=1 to see a coloured box over the mask area,\n`;
    sh += `#             adjust X/Y/W/H until it covers the watermark, then set SHOW=0.\n`;
    sh += `#   Step 2 — run with SHOW=0 to inpaint and write the clean file.\n`;
    sh += `# WM_X/Y/W/H defaults target a typical bottom-centre text watermark — adjust as needed.\n`;
    sh += `WM_X=200 WM_Y=850 WM_W=880 WM_H=60 SHOW=0   # tweak to match watermark position\n\n`;
    for (const p of animaticItems) {
      const s = safeName(p.exercise);
      if (p.videoUrl) {
        sh +=
          `curl -fL -A "Mozilla/5.0" -H "Referer: https://www.exerciseanimatic.com/" \\\n` +
          `  "${p.videoUrl}" -o "downloads/animatic/${s}_wm.mp4" \\\n` +
          `  && echo "OK download: ${p.exercise}" || echo "WARN: URL expired — re-preview and re-export"\n` +
          `ffmpeg -y -i "downloads/animatic/${s}_wm.mp4" \\\n` +
          `  -vf "delogo=x=$WM_X:y=$WM_Y:w=$WM_W:h=$WM_H:show=$SHOW" \\\n` +
          `  -c:v libx264 -preset fast -crf 18 -movflags +faststart \\\n` +
          `  "downloads/animatic/${s}.mp4" && rm "downloads/animatic/${s}_wm.mp4"\n\n`;
      } else {
        sh += `# ${p.exercise}: no video URL — open ${p.url} , right-click video → Copy Video Address, paste in admin\n\n`;
      }
    }
  }

  return { sh, json: JSON.stringify(manifest, null, 2), manifest, gifItems, ytItems, mixamoItems, stockItems, animaticItems };
}

/** Blender Python script to render Mixamo FBX files to MP4s. */
export function buildBlenderScript(mixamoItems) {
  const pairs = mixamoItems
    .map((p) => `  "${safeName(p.exercise)}.fbx": "${p.exercise}",`)
    .join('\n');
  return `#!/usr/bin/env python3
"""
Blender render script — Gymifo Mixamo exercise animations.
Usage:  blender --background --python downloads/mixamo/render.py
Place downloaded FBX files in downloads/mixamo/fbx/ first.
Requires Blender 3.x+.
"""
import bpy, os, math

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FBX_DIR    = os.path.join(SCRIPT_DIR, "fbx")
OUT_DIR    = os.path.join(SCRIPT_DIR, "..", "mixamo_rendered")
os.makedirs(OUT_DIR, exist_ok=True)

# fbx filename -> exercise display name
EXERCISES = {
${pairs}
}

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = 64
    bpy.context.scene.render.resolution_x = 512
    bpy.context.scene.render.resolution_y = 512
    bpy.context.scene.render.fps = 24
    bpy.context.scene.render.image_settings.file_format = "FFMPEG"
    bpy.context.scene.render.ffmpeg.format = "MPEG4"
    bpy.context.scene.render.ffmpeg.codec = "H264"
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
    bpy.ops.object.camera_add(location=(0, -3.5, 1.2))
    cam = bpy.context.active_object
    cam.rotation_euler = (math.radians(78), 0, 0)
    bpy.context.scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(2, -2, 4))
    bpy.context.active_object.data.energy = 3.0
    bpy.ops.object.light_add(type="SUN", location=(-2, -1, 3))
    bpy.context.active_object.data.energy = 1.0

for fbx_file, exercise_name in EXERCISES.items():
    fbx_path = os.path.join(FBX_DIR, fbx_file)
    if not os.path.exists(fbx_path):
        print(f"SKIP (not found): {fbx_path}")
        continue
    print(f"Rendering: {exercise_name}")
    reset_scene()
    bpy.ops.import_scene.fbx(filepath=fbx_path)
    out_name = exercise_name.replace(" ", "_").lower()
    bpy.context.scene.render.filepath = os.path.join(OUT_DIR, out_name)
    bpy.ops.render.render(animation=True)
    print(f"  Saved: {OUT_DIR}/{out_name}*.mp4")

print("\\nAll done! Videos in:", OUT_DIR)
`;
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

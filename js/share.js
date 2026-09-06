// Sharing: Wordle-style emoji grid, Web Share API with clipboard fallback, and a PNG planet card.

export function emojiGrid(results, { cols = 10, maxRows = 5 } = {}) {
  const map = { P: '🟩', C: '🟨', F: '🟥' };
  const rows = [];
  for (let i = 0; i < results.length; i += cols) {
    rows.push(results.slice(i, i + cols).map((r) => map[r] || '⬜').join(''));
  }
  let truncated = false;
  while (rows.length > maxRows) { rows.shift(); truncated = true; }
  if (truncated && rows.length) rows[0] = '…' + rows[0];
  return rows.join('\n');
}

export function baseUrl() {
  return location.origin + location.pathname;
}

export async function shareText(text, url) {
  if (navigator.share) {
    try { await navigator.share({ text, url }); return 'shared'; } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  return copyToClipboard(`${text}\n${url}`) ? 'copied' : 'failed';
}

export async function shareFile(file, text, url) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text, url }); return 'shared'; } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  return null;
}

export function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

// Renders a 1080x1350 share card with a stylised planet. Returns a PNG Blob.
export async function renderCard({ title, score, label, subline, grid, footer, colors, rockColors, coreColor, atmoColor, stage }) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
    const s = Math.random() * 2.5 + 0.5;
    ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
  }

  // Planet
  const cx = W / 2, cy = 980;
  const R = 170 + Math.min(120, score * 1.4);
  if (stage >= 1) {
    const halo = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.45);
    halo.addColorStop(0, atmoColor + 'aa'); halo.addColorStop(1, atmoColor + '00');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();
  }
  if (stage >= 2) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.32);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = R * 0.35;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.85, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = coreColor; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  const n = Math.min(160, score * 2 + 12);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.97;
    const rr = 10 + Math.random() * 22;
    ctx.fillStyle = rockColors[i % rockColors.length];
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, Math.PI * 2); ctx.fill();
  }
  const shade = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.2, cx, cy, R);
  shade.addColorStop(0, 'rgba(255,255,255,0.15)'); shade.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  if (stage >= 2) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.32);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = R * 0.35;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.85, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.restore();
  }
  if (stage >= 3) {
    ctx.fillStyle = '#d8d8e0'; ctx.beginPath(); ctx.arc(cx + R * 1.7, cy - R * 0.9, R * 0.18, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '900 88px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(title, cx, 150);
  ctx.font = '700 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(label, cx, 215);
  ctx.font = '900 250px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(String(score), cx, 470);
  ctx.font = '700 46px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(subline, cx, 545);
  ctx.font = '700 38px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(footer, cx, 605);

  ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const lines = grid.split('\n');
  lines.forEach((line, i) => ctx.fillText(line, cx, 680 + i * 50));

  ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(baseUrl().replace(/^https?:\/\//, ''), cx, H - 50);

  return new Promise((res) => c.toBlob(res, 'image/png'));
}

export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

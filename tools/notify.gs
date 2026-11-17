/**
 * Thông báo qua email cho trang thiệp mời (custom-invitation).
 * Hướng dẫn cài đặt: docs/notifications.md
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me            (mail gửi từ chính tài khoản Google của bạn)
 *   Who has access: Anyone    (trang thiệp gọi được mà không cần đăng nhập)
 * Dán link ".../exec" vào admin → Hồi đáp → Thông báo qua email.
 */

// Email nhận thông báo. Mặc định: tài khoản đang deploy script. Muốn gửi tới địa chỉ khác thì ghi thẳng vào đây.
const TO = Session.getEffectiveUser().getEmail();
const MAX_PER_HOUR = 30; // chặn spam nếu link webhook bị lộ

function doPost(e) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('count') || 0);
  if (n >= MAX_PER_HOUR) return out('rate-limited');
  cache.put('count', String(n + 1), 3600);

  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (_) { return out('bad-request'); }

  const who = clip(d.to) || 'Người ấy';
  const what = { accept: `đã bấm "${clip(d.accept) || 'Đồng ý'}"`, open: 'vừa mở thiệp', test: 'gửi thử thông báo' }[d.event];
  if (!what) return out('unknown-event');

  const subject = d.event === 'test' ? 'Thử thông báo thiệp mời' : `${who} ${what}`;
  const rows = [
    ['Sự kiện', what],
    ['Lúc', clip(d.at)],
    ['Ngày hẹn', clip(d.date).replace('T', ' ')],
    ['Thiết bị', clip(d.ua, 160)],
  ];
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;border:1px solid #DDD5C8;background:#F7F4EE;color:#1C1917">
    <p style="letter-spacing:.2em;text-transform:uppercase;font:12px sans-serif;color:#6B635A;margin:0 0 12px">Thiệp mời</p>
    <h1 style="font-weight:400;font-size:28px;margin:0 0 20px">${esc(subject)}</h1>
    <table style="font:14px sans-serif;border-collapse:collapse">${rows.map(([k, v]) =>
      `<tr><td style="padding:4px 16px 4px 0;color:#6B635A">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('')}</table></div>`;

  MailApp.sendEmail({ to: TO, subject, htmlBody: html, name: 'Thiệp mời' });
  return out('ok');
}

// Data comes from a public endpoint: cut length and escape before putting it into the email.
function clip(s, n) { return String(s == null ? '' : s).slice(0, n || 80); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function out(s) { return ContentService.createTextOutput(s); }

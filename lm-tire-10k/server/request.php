<?php
// L&M Tire: website request receiver (PREPARED, NOT ACTIVE until the site is on the web host).
// Receives appointment requests, tire quote requests and general messages, and emails them to the
// customer service inbox. Nothing is stored on the server.
//
// Setup on Hostinger (one time):
//   1. Upload this file as public_html/api/request.php
//   2. Copy server/lm-config.sample.php to lm-config.php ONE FOLDER ABOVE public_html (not reachable from the web)
//      and fill it in. Passwords never go in the website files.
//   3. In tools/business.py set DELIVERY['endpoint'] = '/api/request.php', rebuild and upload site/.
//   4. Send a test request and confirm it arrives in the inbox (check Spam the first time).
// The page shows "received" ONLY when this file answers {"ok":true}, which happens only after the mail server accepted the message.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function done($ok, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }

$cfgFile = dirname($_SERVER['DOCUMENT_ROOT']) . '/lm-config.php';
if (!is_file($cfgFile)) done(false, 503);
$CFG = require $cfgFile;               // returns ['enabled'=>bool,'to'=>..., 'from'=>..., 'origin'=>...]
if (empty($CFG['enabled']) || empty($CFG['to']) || empty($CFG['from'])) done(false, 503);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(false, 405);
if (!empty($CFG['origin']) && isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== $CFG['origin']) done(false, 403);

// spam protection 1: rate limit, 5 requests per 10 minutes per visitor (IP is only kept as a hash in a temp file)
$key = sys_get_temp_dir() . '/lm_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H') . intdiv((int)date('i'), 10));
$n = (int)@file_get_contents($key);
if ($n >= 5) done(false, 429);
@file_put_contents($key, $n + 1);

$raw = file_get_contents('php://input', false, null, 0, 8000);
$d = json_decode($raw, true);
if (!is_array($d)) done(false, 400);
// spam protection 2: hidden field that people never fill in; 3: form must be open at least 3 seconds
if (!empty($d['website'])) done(true);
if (isset($d['elapsed']) && (int)$d['elapsed'] < 3000) done(true);

function clean($v, $max) { $v = is_string($v) ? $v : ''; $v = preg_replace('/[\r\n\t]+/', ' ', $v); return mb_substr(trim(strip_tags($v)), 0, $max); }
$kind = in_array($d['kind'] ?? '', ['appointment', 'quote', 'message'], true) ? $d['kind'] : 'message';
$name = clean($d['name'] ?? '', 60);
$phone = preg_replace('/[^0-9+]/', '', clean($d['phone'] ?? '', 20));
$digits = ltrim(preg_replace('/\D/', '', $phone), '1');
if ($name === '' || strlen($digits) !== 10) done(false, 422);
$langs = ['en' => 'English', 'pt' => 'Portuguese', 'es' => 'Spanish'];
$reply = $langs[$d['reply_lang'] ?? ''] ?? 'English';
$allowed = ['tires' => 'Tires', 'oil' => 'Oil change', 'brakes' => 'Brakes', 'align' => 'Wheel alignment', 'susp' => 'Suspension & steering', 'diag' => 'Diagnostics / warning light', 'other' => 'Other'];
$svcs = [];
foreach ((is_array($d['services'] ?? null) ? $d['services'] : []) as $s) if (isset($allowed[$s])) $svcs[] = $allowed[$s];
if ($kind === 'appointment' && !$svcs) done(false, 422);

$title = ['appointment' => 'APPOINTMENT REQUEST (not confirmed: call or text the customer to confirm)', 'quote' => 'TIRE QUOTE REQUEST', 'message' => 'CUSTOMER MESSAGE'][$kind];
$lines = [$title, '',
  'Name: ' . $name, 'Phone: ' . $phone, 'Reply in: ' . $reply,
  'Services: ' . ($svcs ? implode(', ', $svcs) : '-'),
  'Details: ' . clean($d['other'] ?? '', 400),
  'Vehicle: ' . (clean($d['vehicle'] ?? '', 80) ?: '-'),
  'Tire size: ' . (clean($d['size'] ?? '', 30) ?: '-'),
  'Preferred day/time: ' . trim(clean($d['day'] ?? '', 10) . ' ' . clean($d['time'] ?? '', 4)),
  'Notes: ' . clean($d['notes'] ?? '', 300),
  '', 'Sent from the website (' . clean($d['lang'] ?? '', 2) . ' page).'];
$subject = 'Website ' . $kind . ': ' . $name . ($svcs ? ' - ' . implode(', ', $svcs) : '');
$headers = 'From: L&M Tire website <' . $CFG['from'] . ">\r\nContent-Type: text/plain; charset=utf-8";
$ok = mail($CFG['to'], '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), $headers, '-f' . $CFG['from']);
done($ok ? true : false, $ok ? 200 : 502);

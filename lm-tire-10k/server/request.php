<?php
// L&M Tire: website request receiver (PREPARED, NOT ACTIVE).
// Turn on only after the owner picks a delivery method and confirms the business email.
// 1. Set $TO below. 2. Upload this file to /api/request.php on the host. 3. Set DELIVERY['endpoint'] = '/api/request.php' in tools/business.py and rebuild.
// The page shows "received" ONLY when this file answers {"ok":true}, which happens only after mail() accepted the message.
// Nothing is stored on the server.

$ENABLED = false;
$TO = '';                 // business email, e.g. 'service@example.com'
$FROM = '';               // an address on the website's own domain, e.g. 'website@example.com'
$ALLOWED_ORIGIN = '';     // e.g. 'https://www.example.com'

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function done($ok, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }

if (!$ENABLED || !$TO || !$FROM) done(false, 503);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(false, 405);
if ($ALLOWED_ORIGIN && isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== $ALLOWED_ORIGIN) done(false, 403);

// simple rate limit: 5 requests per 10 minutes per visitor (temporary file, IP is hashed)
$key = sys_get_temp_dir() . '/lm_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('Y-m-d-H') . intdiv((int)date('i'), 10));
$n = (int)@file_get_contents($key);
if ($n >= 5) done(false, 429);
@file_put_contents($key, $n + 1);

$raw = file_get_contents('php://input', false, null, 0, 8000);
$d = json_decode($raw, true);
if (!is_array($d)) done(false, 400);
if (!empty($d['website'])) done(true);   // hidden spam trap: pretend success, send nothing

function clean($v, $max) { $v = is_string($v) ? $v : ''; $v = preg_replace('/[\r\n\t]+/', ' ', $v); return mb_substr(trim(strip_tags($v)), 0, $max); }
$name = clean($d['name'] ?? '', 60);
$phone = preg_replace('/[^0-9+]/', '', clean($d['phone'] ?? '', 20));
$digits = preg_replace('/\D/', '', $phone);
if ($name === '' || strlen(ltrim($digits, '1')) !== 10) done(false, 422);
$allowed = ['tires', 'oil', 'brakes', 'align', 'susp', 'diag', 'other'];
$svcs = array_values(array_intersect($allowed, is_array($d['services'] ?? null) ? $d['services'] : []));
if (!$svcs) done(false, 422);

$lines = [
  'NEW APPOINTMENT REQUEST (not confirmed yet: call or text the customer to confirm)',
  'Name: ' . $name,
  'Phone: ' . $phone,
  'Reply in: ' . clean($d['reply_lang'] ?? '', 5),
  'Services: ' . implode(', ', $svcs),
  'Other: ' . clean($d['other'] ?? '', 400),
  'Vehicle: ' . clean($d['vehicle'] ?? '', 80),
  'Preferred day: ' . clean($d['day'] ?? '', 10) . ' ' . clean($d['time'] ?? '', 4),
  'Notes: ' . clean($d['notes'] ?? '', 200),
];
$subject = 'Website request: ' . $name . ' - ' . implode(', ', $svcs);
$headers = 'From: L&M Tire website <' . $FROM . ">\r\nContent-Type: text/plain; charset=utf-8";
$ok = mail($TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), $headers);
done($ok ? true : false, $ok ? 200 : 502);

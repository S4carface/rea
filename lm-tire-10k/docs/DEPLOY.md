# L&M Tire website: deploy and rollback guide (Hostinger or any Apache/LiteSpeed host)

Nothing in this guide has been done. Every step that puts the site online needs the shop's approval first.

## What gets uploaded
- The folder `lm-tire-10k/site/` and nothing else. It is the finished website (about 4 MB, 88 pages in English, Portuguese and Spanish).
- Optional, only when online request sending is switched on: `server/request.php` (goes to `public_html/api/request.php`).
- Never upload `tools/`, `src3/`, `preview3/`, `server/lm-config.sample.php`, or any `.md` file. The `.htaccess` also blocks `.md`, `.py` and similar files if one is uploaded by mistake.

## Before the first upload (one time)
1. **Domain.** Put the final address in `tools/business.py`: `SITE['domain'] = 'https://www.YOUR-DOMAIN'`. This fills the canonical links, sitemap, robots.txt, social cards, contact card web address and "Share" links. Until it is set, those show `YOUR-LIVE-DOMAIN`.
2. **Privacy page.** The privacy page still shows "Draft for review". The shop reads it and approves it. After that, remove the draft label (`privacy_draft` in `tools/text3.py`).
3. **Search Console (optional).** In Google Search Console, choose "HTML tag" verification. Copy only the code inside `content="..."` into `SITE['search_console']`. The tag goes on the home page only. After the site is live, submit `https://www.YOUR-DOMAIN/sitemap.xml`.
4. **Visit statistics (optional, off now).** Set `SITE['analytics']`, for example Umami: `{'provider': 'umami', 'id': '<website id>', 'src': 'https://cloud.umami.is/script.js'}`. The security headers then allow only that service. Events are counted without cookies or personal details: Call / Text / WhatsApp (per support line), Email, Directions, Review link, Tire quote (text or WhatsApp), Appointment request, Request delivered or failed, Save contact, Share shop, Share tool, My visit add and send, Calendar reminder, Music button, Video play.
5. **Online request sending (optional, off now).** Follow the steps at the top of `server/request.php`. The settings file with the sending address goes ONE FOLDER ABOVE `public_html`, so it can never be downloaded. Then set `DELIVERY['endpoint'] = '/api/request.php'`. This turns on "Send request online" for appointments AND tire quotes. The page says "received" only when the server confirms the email really went out.
6. **Music.** It stays off in production until the commercial rights are confirmed (`MUSIC['licensed']` in `business.py`, see `MEDIA-LICENSES.md`).

## Build
```
cd lm-tire-10k
python3 tools/build3.py          # writes site/
```
The build stops by itself if a public file names a person or an internal title (owner, partner and similar), or shows any email address other than the customer care inbox, or puts a call link or "call" wording on a messaging-only line.

## Test before uploading
```
cd lm-tire-10k/site && python3 -m http.server 8140 --bind 127.0.0.1    # in one terminal
node tools/regress3.js http://127.0.0.1:8140/                          # in another (copy to .cjs if Node complains about modules)
```
Expect `ALL CHECKS PASSED`.

## Upload (first time and every update)
1. **Back up the live site first:** in Hostinger File Manager, select everything in `public_html`, choose Compress, and name it `backup-YYYY-MM-DD.zip`. Download a copy too.
2. Upload the CONTENTS of `site/` into `public_html` (not the `site` folder itself). Replace existing files.
3. Check: the home page, one page in each language, Contact (Call, Text, WhatsApp, Save our contact), the tire quote, and an appointment request by text. Also check `https://www.YOUR-DOMAIN/robots.txt` and `/sitemap.xml`.
4. The cache: pages are `no-cache`, and images, CSS and JS are cached for 7 days. File names don't change between builds, so after an update a visitor may need to refresh once to get new CSS/JS. When CSS or JS changes, check the site in a private window.

## Rollback (if something is wrong after an upload)
1. In File Manager, delete the contents of `public_html` (keep the `api/` folder if online sending is on).
2. Extract the `backup-YYYY-MM-DD.zip` from step 1 into `public_html`.
3. Refresh in a private window to confirm.
Every version is also in git (branch `claude/project-thread-fntvvx`), so any earlier build can be rebuilt with `git checkout <commit> -- lm-tire-10k && python3 lm-tire-10k/tools/build3.py`.

## Handing a support line to someone else
Contact routing lives in `tools/business.py`, in `CONTACTS`, `TEAM` and `ROUTE`. Each line is a job (Shop & Customer Service, English & Spanish Customer Support, Portuguese Customer Support), not a person. To move a line, change its phone number and label and whether it has WhatsApp. Then rebuild and upload. Pages, forms, text messages, WhatsApp links, the contact card and the visit statistics all follow. The customer-facing names are in `tools/text3.py` under `team`.

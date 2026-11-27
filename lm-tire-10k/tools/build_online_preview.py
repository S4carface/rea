# Like build.py, but each asset URL is pinned to the last commit that changed that file
# (jsDelivr refuses some files at new commits because the whole repo is over its 50 MB limit).
import re,json,subprocess,os
def sha(p): return subprocess.run(['git','log','-1','--format=%H','--',p],capture_output=True,text=True).stdout.strip()
def url(p): return f"https://cdn.jsdelivr.net/gh/S4carface/rea@{sha(p)}/lm-tire-10k/{p}"
h=open('index.html').read()
for f in ['hours','track']:
    h=re.sub(r'<script src="assets/%s\.js"( defer)?></script>'%f, lambda m: '<script>\n'+open('assets/%s.js'%f).read()+'\n</script>', h)
css=open('assets/app.css').read(); js=open('assets/app.js').read()
sfx="{"+",".join(f"{k}:'{url('assets/sfx-'+k+'.mp3')}'" for k in ['squeal','grind','clunk'])+"}"
js=js.replace("'assets/sfx-' + kind + '.mp3'", sfx+"[kind]")
pat=re.compile(r"""(["'(`])(assets/[A-Za-z0-9_.\-]+|manifest\.webmanifest)""")
def fix(s):
    return pat.sub(lambda m: m.group(1)+(url(m.group(2)) if os.path.exists(m.group(2)) else m.group(2)), s)
js=fix(js); css=fix(css)
h=re.sub(r'href="#([\w-]+)"',r'href="#\1" data-hash="\1"',h)
HP='https://htmlpreview.github.io/?https://github.com/S4carface/rea/blob/claude/project-thread-fntvvx/lm-tire-10k/preview/'
h=re.sub(r'href="((?:pt/|es/)?[a-z][a-z-]+/)"',lambda m:'href="'+HP+m.group(1)+'index.html"',h)
h=re.sub(r'<link[^>]*href="assets/app\.css"[^>]*>',lambda m:'<style>\n'+css+'\n</style>',h,count=1)
h=h.replace('<script src="assets/app.js"','<script data-x="app"',1)
h=re.sub(r'<script data-x="app"([^>]*)></script>',lambda m:'<script>\n'+js.replace('</script','<\\/script')+'\n</script>',h,count=1)
h=fix(h)
fixs='<script>\ndocument.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-hash]");if(!a)return;var t=document.getElementById(a.getAttribute("data-hash"));if(!t)return;if(e.defaultPrevented)return;e.preventDefault();t.scrollIntoView({behavior:"smooth"});},false);\n</script>\n</body>'
h=h.replace('</body>',fixs,1)
h,n=re.subn(r'<script type="application/ld\+json">(.*?)</script>',lambda m:'<script>(function(){var s=document.createElement("script");s.type="application/ld+json";s.text='+json.dumps(m.group(1))+';document.head.appendChild(s)})()</script>',h,flags=re.S)
open('online.html','w').write(h); print("ldjson",n)

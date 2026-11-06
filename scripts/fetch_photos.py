#!/usr/bin/env python3
"""Download every remote location.photo.src into photos/<id>.jpg and point the data at the local copy.

Self-hosting matters for this trip: Wikimedia is blocked on mainland Chinese networks, and the
service worker caches same-origin files only, so local photos also work offline.
Run by .github/workflows/photos.yml; safe to re-run (already-local photos are skipped).
"""
import io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "east-china-trip-data.i18n.json"
OUT = ROOT / "photos"
MAX_W = 1000
UA = "east-china-trip-photo-fetcher/1.0 (https://github.com/chefml/east-china-trip)"

def locations(d):
    for day in d["days"]:
        yield from day["locations"]
    yield from d.get("dining", {}).get("places", [])

def main():
    d = json.loads(DATA.read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    report = {"ok": [], "failed": []}
    changed = False
    for loc in locations(d):
        p = loc.get("photo")
        if not p or not p.get("src", "").startswith("http"):
            continue
        url = p["src"]
        dest = OUT / f"{loc['id']}.jpg"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            if img.width > MAX_W:
                img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
            img.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
            p["remote"] = url
            p["src"] = f"photos/{dest.name}"
            changed = True
            report["ok"].append(loc["id"])
            print("ok    ", loc["id"], dest.stat().st_size // 1024, "KB")
        except Exception as e:  # keep the remote URL; the app hides a photo that fails to load
            report["failed"].append({"id": loc["id"], "url": url, "error": str(e)})
            print("FAILED", loc["id"], e, file=sys.stderr)
        time.sleep(1)  # be polite to Commons
    if changed:
        DATA.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(report['ok'])} downloaded, {len(report['failed'])} failed")

if __name__ == "__main__":
    main()

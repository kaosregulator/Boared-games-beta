"""Download the original room models listed in scripts/assets/sources.json.

    python scripts/assets/download_sources.py [--dest assets-src] [--only window.glb,toyshelf.glb]

Two ways in, tried in order:
  1. GDRIVE_SERVICE_ACCOUNT_JSON (the JSON key of a Google service account the
     Drive folder is shared with). Works for private files and shared drives.
  2. gdown, for files shared as "Anyone with the link".

Files already downloaded at the right size are kept.
"""
import argparse
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCES = json.loads((ROOT / "scripts/assets/sources.json").read_text())["models"]


def service_session():
    raw = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return None
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession

    creds = service_account.Credentials.from_service_account_info(
        json.loads(raw), scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    return AuthorizedSession(creds)


def via_api(session, file_id, out):
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&supportsAllDrives=true"
    with session.get(url, stream=True, timeout=600) as r:
        if r.status_code != 200:
            raise RuntimeError(f"Drive API {r.status_code}: {r.text[:200]}")
        tmp = out.with_suffix(".part")
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
        tmp.replace(out)


def via_gdown(file_id, out):
    import gdown

    got = gdown.download(id=file_id, output=str(out), quiet=True)
    if not got:
        raise RuntimeError("gdown could not fetch it (is the file shared as 'Anyone with the link'?)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dest", default="assets-src")
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    dest = (ROOT / args.dest).resolve()
    dest.mkdir(parents=True, exist_ok=True)
    only = set(filter(None, args.only.split(",")))
    session = service_session()
    failed = []
    for name, spec in SOURCES.items():
        if only and name not in only:
            continue
        out = dest / name
        if out.exists() and out.stat().st_size > 1_000_000:
            print(f"{name}: already here")
            continue
        try:
            if session is not None:
                via_api(session, spec["driveId"], out)
            else:
                via_gdown(spec["driveId"], out)
            print(f"{name}: {out.stat().st_size / 1e6:.1f} MB from '{spec['original']}'")
        except Exception as err:  # keep going; the build skips what is missing
            failed.append(name)
            print(f"{name}: FAILED {err}", file=sys.stderr)
    if failed:
        print(f"\n{len(failed)} original(s) not downloaded: {', '.join(failed)}", file=sys.stderr)
        sys.exit(1 if len(failed) == len(SOURCES) or (only and len(failed) == len(only)) else 0)


if __name__ == "__main__":
    main()

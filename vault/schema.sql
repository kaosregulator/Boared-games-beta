-- The vault's catalog. One row per episode file (Arthur airs two stories per file).
-- Video stays on disk; this is the index, the checksums and the job state.
create table if not exists episode (
  show         text not null,
  key          text not null,              -- s01e01-e02
  season       int  not null,              -- 0 = specials
  ep_from      int  not null,
  ep_to        int  not null,
  title        text not null,              -- Arthur's Eyes + Francine's Bad Hair Day
  label        text,                       -- Arthur · S01E01-E02 · …
  seconds      real,

  source_name  text,                       -- the archive.org file it came from
  source_bytes bigint,
  source_md5   text,                       -- archive.org's checksum, checked on download

  file         text,                       -- media/arthur/s01e01-e02.webm, relative to VAULT_DIR
  bytes        bigint,
  sha256       text,                       -- of the small file, rechecked by `vault verify`
  video        text,
  audio        text,
  width        int,
  height       int,
  subtitles    text,                       -- .vtt beside the video, when the source had them
  thumb        text,
  parity       text,                       -- .par2 repair data, when made

  status       text not null default 'listed', -- listed | fetched | ready | failed
  error        text,
  verified_at  timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (show, key)
);

create index if not exists episode_air_order on episode (show, season, ep_from);

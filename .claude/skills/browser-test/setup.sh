#!/usr/bin/env bash
# One-time (idempotent) local setup for browser tests. Local only — never touches the remote DB.
set -e
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"

# 1) playwright-core inside the skill folder (node_modules/ is gitignored)
cd "$SKILL_DIR"
[ -f package.json ] || echo '{"name":"browser-test","private":true,"type":"module"}' > package.json
[ -d node_modules/playwright-core ] || npm i playwright-core --no-audit --no-fund

# 2) dummy session secret for wrangler dev (.dev.vars is gitignored). Must match SECRET in lib.mjs.
cd "$ROOT"
grep -qs '^SESSION_SECRET=localtestsecret123' .dev.vars || printf 'SESSION_SECRET=localtestsecret123\n' > .dev.vars

# 3) local D1: schema + the migrations the schema does not already include.
#    When a new migrations/NNNN_*.sql is added, append it to this list.
for f in schema.sql migrations/0006_koala_coins.sql migrations/0007_koala_account_sync.sql \
         migrations/0014_koala_items.sql migrations/0015_item_fit.sql migrations/0016_item_fit2d.sql; do
  npx wrangler d1 execute englishwordspractice --local --file="./$f" >/dev/null 2>&1 || echo "note: $f had errors (usually 'already exists' — fine)"
done

# 4) test users: admin / paid / free (ids must match USERS in lib.mjs)
SQL="$(mktemp).sql"
cat > "$SQL" <<EOF
INSERT OR REPLACE INTO users (id, username, password_hash, password_salt, role, created_at, email, email_verified_at) VALUES
 ('adm1','admin@test.local','x','x','admin',1,'admin@test.local',1),
 ('paid1','paid@test.local','x','x','paid',1,'paid@test.local',1),
 ('free1','free@test.local','x','x','free',1,'free@test.local',1);
EOF
npx wrangler d1 execute englishwordspractice --local --file="$SQL" >/dev/null
rm -f "$SQL"
echo "browser-test setup done."

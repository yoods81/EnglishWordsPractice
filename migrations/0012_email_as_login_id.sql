-- Login ID = email address.
-- Existing accounts that have an email on file get that (lower-cased) email as
-- their new login ID. Passwords are untouched, so nobody has to reset anything.
-- Run once against the live database BEFORE deploying the matching code:
--   npm run db:migrate:email-id
--
-- Skipped on purpose (they keep their old username, and the SELECT at the end
-- lists them so you can sort them out by hand):
--   * the admin account (keeps logging in as "admin")
--   * accounts with no email on file
--   * accounts that share one email address with another account (two kids'
--     accounts under one parent email) — an email can only be one login ID
-- Safe to re-run: accounts already converted are left alone.

UPDATE users
SET username = lower(trim(email))
WHERE role != 'admin'
  AND email IS NOT NULL
  AND trim(email) != ''
  AND username != lower(trim(email))
  AND (SELECT COUNT(*) FROM users u2 WHERE lower(trim(u2.email)) = lower(trim(users.email))) = 1
  AND NOT EXISTS (
    SELECT 1 FROM users u3
    WHERE u3.username = lower(trim(users.email)) AND u3.id != users.id
  );

-- Accounts that still do NOT log in with an email (need attention).
SELECT username, role, email, created_at
FROM users
WHERE role != 'admin' AND username NOT LIKE '%@%'
ORDER BY created_at;

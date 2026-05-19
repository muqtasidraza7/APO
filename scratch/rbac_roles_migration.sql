-- RBAC Role Normalization Migration (fixed)
-- Drop any existing role constraint FIRST, then backfill, then re-add.

-- Step 1: Drop any pre-existing check constraint on role
ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

-- Step 2: Normalize all existing role values to lowercase
UPDATE workspace_members
SET role = CASE
  WHEN LOWER(role) IN ('pm', 'project manager', 'admin') THEN 'pm'
  ELSE 'member'
END
WHERE role IS DISTINCT FROM 'client';

-- Step 3: Backfill owners — ensure their row is 'pm'
UPDATE workspace_members wm
SET role = 'pm'
FROM workspaces w
WHERE w.id = wm.workspace_id
  AND w.owner_id = wm.user_id;

-- Step 4: Re-add the constraint now that all values are clean
ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('pm', 'member', 'client'));

-- Verify
SELECT role, COUNT(*) FROM workspace_members GROUP BY role ORDER BY role;

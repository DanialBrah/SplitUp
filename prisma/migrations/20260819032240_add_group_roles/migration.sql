-- AlterTable
ALTER TABLE `GroupMember` ADD COLUMN `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER';

-- No creator/owner column has ever existed on Group; batch-inserts share a
-- single joinedAt timestamp, so there's no reliable way to identify "the"
-- original creator for pre-existing rows. This is local/dev data, so the
-- honest backfill is: promote every existing membership to ADMIN so no
-- pre-existing group is locked out of its own admin-only actions. Every
-- group created AFTER this migration gets exactly one real admin (the
-- creator) via the updated createGroup().
UPDATE `GroupMember` SET `role` = 'ADMIN';

-- Drop obsolete indexes
DROP INDEX `IdemKey_route_key_userId_key` ON `IdemKey`;
DROP INDEX `IdemKey_route_userId_idx` ON `IdemKey`;

-- Extend schema for new idempotency tracking
-- NOTE: อย่าเพิ่มคอลัมน์ที่มิกเกรชัน 003 เพิ่มไปแล้ว (status/responseJson/responseHash/expiresAt)
ALTER TABLE `IdemKey`
  ADD COLUMN `method` VARCHAR(16) NULL,
  ADD COLUMN `path` VARCHAR(191) NULL,
  ADD COLUMN `requestBody` JSON NULL,
  ADD COLUMN `requestBodyHash` VARCHAR(191) NULL,
  ADD COLUMN `ipAddress` VARCHAR(191) NULL,
  ADD COLUMN `userAgent` VARCHAR(191) NULL,
  MODIFY `userId` VARCHAR(191) NULL;

-- Backfill new required fields (คอลัมน์ expiresAt มีแล้วจาก 003 ใช้ต่อได้)
UPDATE `IdemKey` SET `method` = COALESCE(`method`, 'POST');
UPDATE `IdemKey` SET `path` = COALESCE(`path`, `route`, '/');
UPDATE `IdemKey` SET `expiresAt` = COALESCE(`expiresAt`, DATE_ADD(`createdAt`, INTERVAL 1 DAY));

-- Enforce not-null constraints and drop deprecated columns
ALTER TABLE `IdemKey`
  MODIFY `method` VARCHAR(16) NOT NULL,
  MODIFY `path` VARCHAR(191) NOT NULL,
  DROP COLUMN `route`;

-- Create new indexes
CREATE UNIQUE INDEX `IdemKey_key_method_path_key` ON `IdemKey`(`key`, `method`, `path`);
CREATE INDEX `IdemKey_expiresAt_idx` ON `IdemKey`(`expiresAt`);

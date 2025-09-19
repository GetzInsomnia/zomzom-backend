-- Backend Hotfix v6.1 — Prisma & Types Alignment (MySQL)

-- User updates
ALTER TABLE `User`
  MODIFY `localePref` VARCHAR(191) NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Property updates
ALTER TABLE `Property`
  ADD COLUMN `furnished` BOOLEAN NULL DEFAULT false,
  ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false,
  MODIFY `workflowState` ENUM('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'HIDDEN', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  MODIFY `type` ENUM('HOUSE', 'TOWNHOME', 'COMMERCIAL', 'TWINHOUSE', 'AFFORDABLE', 'FLAT', 'CONDO', 'ROOM', 'LAND', 'COURSE', 'FORM', 'OTHER') NOT NULL;

CREATE INDEX `Property_status_type_price_updatedAt_idx` ON `Property`(`status`, `type`, `price`, `updatedAt`);

-- Ensure hidden flag reflects existing hidden records
UPDATE `Property`
SET `isHidden` = true
WHERE `workflowState` IN ('HIDDEN', 'ARCHIVED') OR `hiddenAt` IS NOT NULL;

-- Property image ordering index
CREATE INDEX `PropertyImage_propertyId_order_idx` ON `PropertyImage`(`propertyId`, `order`);

-- Property translations locale lookup index
CREATE INDEX `PropertyI18N_locale_propertyId_idx` ON `PropertyI18N`(`locale`, `propertyId`);

-- Location province/district index
CREATE INDEX `Location_province_district_idx` ON `Location`(`province`, `district`);

-- Property flag alignment
ALTER TABLE `PropertyFlagOnProperty`
  ADD COLUMN `id` VARCHAR(191) NULL;

UPDATE `PropertyFlagOnProperty`
SET `id` = REPLACE(UUID(), '-', '')
WHERE `id` IS NULL;

UPDATE `PropertyFlagOnProperty`
SET `flag` = 'NEGOTIABLE'
WHERE `flag` NOT IN ('NEGOTIABLE', 'SPECIAL_PRICE', 'NET_PRICE', 'MEET_IN_PERSON', 'NO_LIEN', 'LIENED');

ALTER TABLE `PropertyFlagOnProperty`
  DROP PRIMARY KEY,
  MODIFY `flag` ENUM('NEGOTIABLE', 'SPECIAL_PRICE', 'NET_PRICE', 'MEET_IN_PERSON', 'NO_LIEN', 'LIENED') NOT NULL,
  MODIFY `id` VARCHAR(191) NOT NULL;

ALTER TABLE `PropertyFlagOnProperty`
  ADD PRIMARY KEY (`id`);

CREATE UNIQUE INDEX `PropertyFlagOnProperty_propertyId_flag_key` ON `PropertyFlagOnProperty`(`propertyId`, `flag`);

-- Article state alignment
ALTER TABLE `Article`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  MODIFY `workflowState` ENUM('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'HIDDEN', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

UPDATE `Article`
SET `published` = true
WHERE `workflowState` = 'PUBLISHED';

-- Article content body text storage
ALTER TABLE `ArticleI18N`
  MODIFY `body` LONGTEXT NULL;

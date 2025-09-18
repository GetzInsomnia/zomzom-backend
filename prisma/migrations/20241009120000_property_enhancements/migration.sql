-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'EDITOR', 'AGENT', 'USER') NOT NULL DEFAULT 'ADMIN',
    `localePref` VARCHAR(191) NOT NULL DEFAULT 'en',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Property` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'RESERVED', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
    `type` ENUM('CONDO', 'HOUSE', 'LAND', 'COMMERCIAL') NOT NULL,
    `price` INTEGER NOT NULL,
    `area` DOUBLE NULL,
    `beds` INTEGER NULL,
    `baths` INTEGER NULL,
    `locationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reservedUntil` DATETIME(3) NULL,
    `deposit` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Property_slug_key`(`slug`),
    INDEX `Property_status_type_price_idx`(`status`, `type`, `price`),
    INDEX `Property_status_type_updatedAt_idx`(`status`, `type`, `updatedAt`),
    INDEX `Property_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyImage` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `PropertyImage_propertyId_order_key`(`propertyId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyI18N` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `amenities` JSON NULL,

    UNIQUE INDEX `PropertyI18N_propertyId_locale_key`(`propertyId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Article` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Article_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArticleI18N` (
    `id` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChangeSet` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `patch` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `scheduleAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublishJob` (
    `id` VARCHAR(191) NOT NULL,
    `changesetId` VARCHAR(191) NOT NULL,
    `runAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `log` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rate` (
    `code` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NULL,
    `subdistrict` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,

    INDEX `Location_province_idx`(`province`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyFlagOnProperty` (
    `propertyId` VARCHAR(191) NOT NULL,
    `flag` ENUM('FEATURED', 'HIGHLIGHTED', 'URGENT') NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`propertyId`, `flag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Favorite_userId_propertyId_key`(`userId`, `propertyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ViewStat` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `bucket` DATETIME(3) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ViewStat_propertyId_bucket_key`(`propertyId`, `bucket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransitStation` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,

    INDEX `TransitStation_type_name_idx`(`type`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyTransitStation` (
    `propertyId` VARCHAR(191) NOT NULL,
    `stationId` VARCHAR(191) NOT NULL,
    `distance` INTEGER NULL,

    PRIMARY KEY (`propertyId`, `stationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyImage` ADD CONSTRAINT `PropertyImage_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyI18N` ADD CONSTRAINT `PropertyI18N_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleI18N` ADD CONSTRAINT `ArticleI18N_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChangeSet` ADD CONSTRAINT `ChangeSet_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishJob` ADD CONSTRAINT `PublishJob_changesetId_fkey` FOREIGN KEY (`changesetId`) REFERENCES `ChangeSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyFlagOnProperty` ADD CONSTRAINT `PropertyFlagOnProperty_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViewStat` ADD CONSTRAINT `ViewStat_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyTransitStation` ADD CONSTRAINT `PropertyTransitStation_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyTransitStation` ADD CONSTRAINT `PropertyTransitStation_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `TransitStation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


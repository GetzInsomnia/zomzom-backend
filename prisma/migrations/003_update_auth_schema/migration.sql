-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

-- RenameTable
RENAME TABLE `EmailVerification` TO `VerificationToken`;

-- AlterTable (VerificationToken)
ALTER TABLE `VerificationToken`
    DROP FOREIGN KEY `EmailVerification_userId_fkey`;

ALTER TABLE `VerificationToken`
    MODIFY `userId` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL;

DROP INDEX `EmailVerification_tokenHash_key` ON `VerificationToken`;
CREATE UNIQUE INDEX `VerificationToken_tokenHash_key` ON `VerificationToken`(`tokenHash`);

DROP INDEX `EmailVerification_userId_idx` ON `VerificationToken`;
CREATE INDEX `VerificationToken_userId_idx` ON `VerificationToken`(`userId`);
CREATE INDEX `VerificationToken_email_idx` ON `VerificationToken`(`email`);

ALTER TABLE `VerificationToken`
    ADD CONSTRAINT `VerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (IdemKey)
ALTER TABLE `IdemKey`
    ADD COLUMN `bodyHash` VARCHAR(191) NULL,
    ADD COLUMN `status` INTEGER NULL,
    ADD COLUMN `responseJson` JSON NULL,
    ADD COLUMN `responseHash` VARCHAR(191) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `RefreshToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

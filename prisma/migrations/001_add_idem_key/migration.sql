-- CreateTable
CREATE TABLE `IdemKey` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL DEFAULT '__global__',
    `route` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `IdemKey_route_key_userId_key` ON `IdemKey`(`route`, `key`, `userId`);

-- CreateIndex
CREATE INDEX `IdemKey_route_userId_idx` ON `IdemKey`(`route`, `userId`);

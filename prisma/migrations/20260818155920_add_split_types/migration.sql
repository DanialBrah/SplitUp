-- AlterTable
ALTER TABLE `expense` ADD COLUMN `splitType` ENUM('EQUAL', 'EXACT', 'PERCENTAGE') NOT NULL DEFAULT 'EQUAL';

-- AlterTable
ALTER TABLE `expensesplit` ADD COLUMN `percentage` DECIMAL(5, 2) NULL;

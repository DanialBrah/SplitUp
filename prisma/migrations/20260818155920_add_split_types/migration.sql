-- AlterTable
ALTER TABLE `Expense` ADD COLUMN `splitType` ENUM('EQUAL', 'EXACT', 'PERCENTAGE') NOT NULL DEFAULT 'EQUAL';

-- AlterTable
ALTER TABLE `ExpenseSplit` ADD COLUMN `percentage` DECIMAL(5, 2) NULL;

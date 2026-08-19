-- CreateIndex
CREATE INDEX `Expense_groupId_category_idx` ON `Expense`(`groupId`, `category`);

-- CreateIndex
CREATE INDEX `Expense_groupId_payerId_idx` ON `Expense`(`groupId`, `payerId`);

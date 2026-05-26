-- CreateTable
CREATE TABLE "Push_Subscription" (
    "sub_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Push_Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Roommate_Group" (
    "group_id" TEXT NOT NULL PRIMARY KEY,
    "group_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Shared_Expense" (
    "expense_id" TEXT NOT NULL PRIMARY KEY,
    "group_id" TEXT NOT NULL,
    "paid_by_user_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shared_Expense_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Roommate_Group" ("group_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shared_Expense_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense_Split" (
    "split_id" TEXT NOT NULL PRIMARY KEY,
    "expense_id" TEXT NOT NULL,
    "owed_by_user_id" TEXT NOT NULL,
    "amount_owed" REAL NOT NULL,
    "is_settled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Expense_Split_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "Shared_Expense" ("expense_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_Split_owed_by_user_id_fkey" FOREIGN KEY ("owed_by_user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "subscription_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "date_found" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "budget_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount_limit" REAL NOT NULL,
    "start_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Budget_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Academic_Term" (
    "term_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "semester_name" TEXT NOT NULL,
    "tuition_total" REAL NOT NULL,
    "aid_applied" REAL NOT NULL,
    "dining_dollars_bal" REAL NOT NULL,
    "end_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Academic_Term_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Academic_Term" ("aid_applied", "dining_dollars_bal", "semester_name", "term_id", "tuition_total", "user_id") SELECT "aid_applied", "dining_dollars_bal", "semester_name", "term_id", "tuition_total", "user_id" FROM "Academic_Term";
DROP TABLE "Academic_Term";
ALTER TABLE "new_Academic_Term" RENAME TO "Academic_Term";
CREATE TABLE "new_User" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "mfa_secret" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round_up_balance" REAL NOT NULL DEFAULT 0,
    "venmo_handle" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
    "roommate_group_id" TEXT,
    CONSTRAINT "User_roommate_group_id_fkey" FOREIGN KEY ("roommate_group_id") REFERENCES "Roommate_Group" ("group_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("created_at", "email", "mfa_secret", "password_hash", "user_id") SELECT "created_at", "email", "mfa_secret", "password_hash", "user_id" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

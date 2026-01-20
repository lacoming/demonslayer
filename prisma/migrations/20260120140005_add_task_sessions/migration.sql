-- CreateTable
CREATE TABLE "TaskSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 1,
    "dailyTaskId" INTEGER NOT NULL,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskSession_dailyTaskId_fkey" FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskStepState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "userAnswerText" TEXT,
    "userSelectedOption" INTEGER,
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskStepState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TaskSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "cycleCode" INTEGER NOT NULL,
    "targetXp" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedXp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DailyPlan" ("createdAt", "cycleCode", "date", "id", "targetXp") SELECT "createdAt", "cycleCode", "date", "id", "targetXp" FROM "DailyPlan";
DROP TABLE "DailyPlan";
ALTER TABLE "new_DailyPlan" RENAME TO "DailyPlan";
CREATE UNIQUE INDEX "DailyPlan_date_key" ON "DailyPlan"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TaskSession_dailyTaskId_key" ON "TaskSession"("dailyTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStepState_sessionId_stepIndex_key" ON "TaskStepState"("sessionId", "stepIndex");

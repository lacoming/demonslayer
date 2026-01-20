-- CreateTable
CREATE TABLE "SparringProgress" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "unlockedRankIndex" INTEGER NOT NULL DEFAULT 1,
    "markPoints" INTEGER NOT NULL DEFAULT 0,
    "lastQuestionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SparringProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SparringAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 1,
    "date" TEXT NOT NULL,
    "rankIndex" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "aiScore" REAL NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "feedbackJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SparringAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SparringProgress_userId_key" ON "SparringProgress"("userId");

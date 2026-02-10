-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "GameMode" AS ENUM ('DAILY');
CREATE TYPE "GamePlayStatus" AS ENUM ('IN_PROGRESS', 'WIN', 'LOSS');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Word" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "length" INTEGER NOT NULL,
  "difficulty" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Word_text_key" ON "Word"("text");

CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "mode" "GameMode" NOT NULL,
  "length" INTEGER NOT NULL,
  "maxAttempts" INTEGER NOT NULL,
  "hardModeAllowed" BOOLEAN NOT NULL DEFAULT true,
  "dateKey" TEXT NOT NULL,
  "answerWordId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Game_mode_dateKey_length_key" ON "Game"("mode", "dateKey", "length");
CREATE INDEX "Game_dateKey_mode_idx" ON "Game"("dateKey", "mode");

CREATE TABLE "GamePlay" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" "GamePlayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
  "timeMs" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "hardMode" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "GamePlay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GamePlay_gameId_userId_key" ON "GamePlay"("gameId", "userId");

CREATE TABLE "Guess" (
  "id" TEXT NOT NULL,
  "gamePlayId" TEXT NOT NULL,
  "guessText" TEXT NOT NULL,
  "resultPattern" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Guess_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Guess_gamePlayId_createdAt_idx" ON "Guess"("gamePlayId", "createdAt");

CREATE TABLE "LeaderboardEntry" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "attemptsUsed" INTEGER NOT NULL,
  "timeMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeaderboardEntry_gameId_userId_key" ON "LeaderboardEntry"("gameId", "userId");
CREATE INDEX "LeaderboardEntry_dateKey_gameId_score_idx" ON "LeaderboardEntry"("dateKey", "gameId", "score" DESC);

ALTER TABLE "Game" ADD CONSTRAINT "Game_answerWordId_fkey" FOREIGN KEY ("answerWordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GamePlay" ADD CONSTRAINT "GamePlay_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GamePlay" ADD CONSTRAINT "GamePlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_gamePlayId_fkey" FOREIGN KEY ("gamePlayId") REFERENCES "GamePlay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

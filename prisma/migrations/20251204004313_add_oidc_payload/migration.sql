-- CreateTable
CREATE TABLE "OidcPayload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "grantId" TEXT,
    "userCode" TEXT,
    "uid" TEXT,
    "expiresAt" DATETIME,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OidcPayload_uid_key" ON "OidcPayload"("uid");

-- CreateIndex
CREATE INDEX "OidcPayload_grantId_idx" ON "OidcPayload"("grantId");

-- CreateIndex
CREATE INDEX "OidcPayload_userCode_idx" ON "OidcPayload"("userCode");

import { Router, type Request, type Response } from "express";
import { db, gameSavesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: Router = Router();

router.get("/saves", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.user!.id;

  const [save] = await db
    .select()
    .from(gameSavesTable)
    .where(eq(gameSavesTable.userId, userId));

  if (!save) {
    res.json({ save: null });
    return;
  }

  res.json({
    save: {
      gameState: save.gameState,
      version: save.version,
      savedAt: save.savedAt.toISOString(),
    },
  });
});

router.put("/saves", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.user!.id;
  const { gameState } = req.body;

  if (!gameState || typeof gameState !== "object") {
    res.status(400).json({ error: "gameState is required and must be an object" });
    return;
  }

  const now = new Date();

  const [existing] = await db
    .select({ id: gameSavesTable.id, version: gameSavesTable.version })
    .from(gameSavesTable)
    .where(eq(gameSavesTable.userId, userId));

  if (existing) {
    const newVersion = existing.version + 1;
    await db
      .update(gameSavesTable)
      .set({
        gameState: gameState as Record<string, unknown>,
        version: newVersion,
        savedAt: now,
      })
      .where(eq(gameSavesTable.id, existing.id));

    res.json({
      success: true as const,
      version: newVersion,
      savedAt: now.toISOString(),
    });
  } else {
    await db.insert(gameSavesTable).values({
      userId,
      gameState: gameState as Record<string, unknown>,
      version: 1,
      savedAt: now,
    });

    res.json({
      success: true as const,
      version: 1,
      savedAt: now.toISOString(),
    });
  }
});

export default router;

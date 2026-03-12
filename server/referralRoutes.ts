import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

const router = Router();

router.get("/referrals/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const db = await getDb();
    const users = db.collection<{
      _id: ObjectId;
      referralCode?: string;
    }>("users");
    const user = await users.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    }

    let referralCode = user.referralCode;
    if (!referralCode) {
      // Lazily generate a referral code for existing users.
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generate = () => {
        let out = "";
        for (let i = 0; i < 8; i += 1) {
          const idx = Math.floor(Math.random() * alphabet.length);
          out += alphabet[idx];
        }
        return out;
      };
      for (let i = 0; i < 5; i += 1) {
        const code = generate();
        const clash = await users.findOne({ referralCode: code });
        if (!clash) {
          referralCode = code;
          await users.updateOne({ _id: req.user._id }, { $set: { referralCode: code } });
          break;
        }
      }
    }

    const referralsCol = db.collection<{
      userId: ObjectId;
      referredUserId: ObjectId;
      rewardCredits: number;
      createdAt: Date;
    }>("referrals");

    const totalReferrals = await referralsCol.countDocuments({ userId: req.user._id });
    const agg = await referralsCol
      .aggregate<{ total: number }>([
        { $match: { userId: req.user._id } },
        { $group: { _id: null, total: { $sum: "$rewardCredits" } } },
        { $project: { _id: 0, total: 1 } },
      ])
      .toArray();
    const creditsEarned = agg[0]?.total ?? 0;

    return res.json({
      ok: true,
      referralCode: referralCode ?? null,
      totalReferrals,
      creditsEarned,
    });
  } catch (error) {
    return next(error);
  }
});

export { router as referralRouter };


"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const BRANCHES = ["All Branches", "Main", "Business Bay", "Dubai Silicon Oasis", "Sharjah"] as const;
export type Branch = (typeof BRANCHES)[number];

interface BranchState {
  activeBranch: Branch;
  setActiveBranch: (branch: Branch) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranch: "All Branches",
      setActiveBranch: (branch) => set({ activeBranch: branch }),
    }),
    { name: "branch-store" }
  )
);

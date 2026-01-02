"use client";

import { useState } from "react";
import { Plus, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GoalStatus = "pending" | "generating" | "completed" | "failed";

export interface Goal {
  id: string;
  title: string;
  isGenerating?: boolean;
  generatedImageUrl?: string;
  phrase?: string;
  status?: GoalStatus;
}

const PREFILLED_GOALS = [
  "Travel to...",
  "Go to the gym regularly",
  "Read more books",
  "Learn a new skill",
];

interface GoalInputProps {
  goals: Goal[];
  onGoalsChange: (goals: Goal[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  maxGoals?: number;
}

export function GoalInput({
  goals,
  onGoalsChange,
  onGenerate,
  isGenerating,
  maxGoals = 4,
}: GoalInputProps) {
  const [newGoal, setNewGoal] = useState("");

  const canAddMore = goals.length < maxGoals;

  const addGoal = (title: string) => {
    if (!title.trim() || !canAddMore) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: title.trim(),
    };
    onGoalsChange([...goals, goal]);
    setNewGoal("");
  };

  const removeGoal = (id: string) => {
    onGoalsChange(goals.filter((g) => g.id !== id));
  };

  const updateGoal = (id: string, title: string) => {
    onGoalsChange(goals.map((g) => (g.id === id ? { ...g, title } : g)));
  };

  const addPrefilled = () => {
    const goalsToAdd = PREFILLED_GOALS.slice(0, maxGoals - goals.length);
    const prefilledGoals: Goal[] = goalsToAdd.map((title) => ({
      id: crypto.randomUUID(),
      title,
    }));
    onGoalsChange([...goals, ...prefilledGoals]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 sm:space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Define Your 2026 Goals</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          What do you want to achieve? Add up to {maxGoals} goals.
        </p>
      </div>

      {goals.length === 0 && (
        <Button
          variant="outline"
          className="w-full h-12 sm:h-12 border-dashed text-sm"
          onClick={addPrefilled}
        >
          <Sparkles className="size-4 mr-2" />
          Start with suggested goals
        </Button>
      )}

      <div className="space-y-2 sm:space-y-3">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className={cn(
              "group flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border bg-card transition-all",
              goal.isGenerating && "opacity-70"
            )}
          >
            <span className="text-xs sm:text-sm font-mono text-muted-foreground w-5 sm:w-6 flex-shrink-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Input
              value={goal.title}
              onChange={(e) => updateGoal(goal.id, e.target.value)}
              disabled={goal.isGenerating}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0 shadow-none text-sm sm:text-base h-auto py-1"
              placeholder="Enter your goal..."
            />
            {goal.isGenerating ? (
              <Loader2 className="size-4 sm:size-4 animate-spin text-muted-foreground flex-shrink-0" />
            ) : (
              <button
                onClick={() => removeGoal(goal.id)}
                className="p-2 sm:p-1 hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canAddMore && (
        <div className="flex gap-2 sm:gap-3">
          <Input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGoal(newGoal)}
            placeholder="Add another goal..."
            className="flex-1 h-11 sm:h-10 text-sm sm:text-base"
          />
          <Button
            variant="outline"
            onClick={() => addGoal(newGoal)}
            disabled={!newGoal.trim()}
            className="h-11 sm:h-10 px-4 sm:px-3 gap-2"
          >
            <Plus className="size-4" />
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center">
          Maximum {maxGoals} goals reached
        </p>
      )}

      {goals.length > 0 && (
        <Button
          className="w-full h-12 sm:h-12 text-sm sm:text-base"
          onClick={onGenerate}
          disabled={isGenerating || goals.length === 0}
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Generating your vision board...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Generate Vision Board ({goals.length}/{maxGoals})
            </>
          )}
        </Button>
      )}
    </div>
  );
}

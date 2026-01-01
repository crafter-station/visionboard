import { nanoid } from "nanoid";

export function generateBoardId(): string {
  return nanoid(10);
}

export function generateGoalId(): string {
  return nanoid(12);
}


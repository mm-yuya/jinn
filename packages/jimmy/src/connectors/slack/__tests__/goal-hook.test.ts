import { describe, it, expect } from "vitest";
import { shouldCheckForGoal, parseGoalResponse } from "../goal-hook.js";

describe("shouldCheckForGoal", () => {
  it("returns false for empty / short / already-prefixed messages", () => {
    expect(shouldCheckForGoal("")).toBe(false);
    expect(shouldCheckForGoal("ok")).toBe(false);
    expect(shouldCheckForGoal("ありがとう")).toBe(false);
    expect(shouldCheckForGoal("/goal already set, do the thing")).toBe(false);
  });

  it("returns true for substantive Japanese / English messages", () => {
    expect(
      shouldCheckForGoal(
        "5社のSaaS料金/機能を比較した表をスレッドに投げて、完成するまで止まらないで",
      ),
    ).toBe(true);
    expect(
      shouldCheckForGoal(
        "Close every open task under project A in Linear, ping me when done",
      ),
    ).toBe(true);
  });

  it("trims whitespace before applying the length gate", () => {
    expect(shouldCheckForGoal("        \n   short \n  ")).toBe(false);
  });
});

describe("parseGoalResponse", () => {
  it("returns the trimmed sentence from a strict JSON response", () => {
    const sentence = "Posted a Markdown table to the Slack thread.";
    const raw = `{"goal":"${sentence}"}`;
    expect(parseGoalResponse(raw)).toBe(sentence);
  });

  it("accepts a ```json fenced block from chatty models", () => {
    const raw =
      "```json\n{ \"goal\": \"Wrote three follow-up replies in this thread.\" }\n```";
    expect(parseGoalResponse(raw)).toBe(
      "Wrote three follow-up replies in this thread.",
    );
  });

  it("returns null when the model says no goal", () => {
    expect(parseGoalResponse('{"goal": null}')).toBeNull();
    expect(parseGoalResponse('{"goal": "n/a"}')).toBeNull();
    expect(parseGoalResponse('{"goal": "TBD"}')).toBeNull();
    expect(parseGoalResponse('{"goal": "the user is happy"}')).toBeNull();
  });

  it("rejects responses that try to smuggle a slash command", () => {
    expect(parseGoalResponse('{"goal": "/do-something-evil"}')).toBeNull();
  });

  it("returns null for unparseable / non-JSON output", () => {
    expect(parseGoalResponse("")).toBeNull();
    expect(parseGoalResponse("not json at all")).toBeNull();
    expect(parseGoalResponse('{"unrelated": "value"}')).toBeNull();
    expect(parseGoalResponse('{"goal": 42}')).toBeNull();
  });

  it("collapses whitespace and caps long sentences", () => {
    const long = "a".repeat(600);
    const raw = `{"goal": "${long}"}`;
    const out = parseGoalResponse(raw);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(400);

    const messy = `{"goal": "first   line\\n\\nsecond   line"}`;
    expect(parseGoalResponse(messy)).toBe("first line second line");
  });
});

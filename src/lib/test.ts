import { ChatCompletion } from "openai/resources/index.mjs";
import { firstValueTokenLogprobByKey } from "./logprob";
import fs from "fs";
const data = fs.readFileSync("/Users/shrenikborad/Downloads/batch-results.jsonl", "utf-8");

const lines = data.split("\n").filter(Boolean)

lines.forEach((line, index) => {
  const obj = JSON.parse(line);
  const response = obj.response.body as ChatCompletion
  for (const choice of response.choices) {
    if (choice.message?.role === "assistant") {
      const content = choice.message?.content || "";
      const logprobs = choice.logprobs?.content;
      if (!logprobs) {
        console.log("No logprobs for line %d", index + 1);
        continue;
      }
      const analysis = firstValueTokenLogprobByKey(logprobs, "method");
      console.log("Line %d: %O", index + 1, analysis);
    }
  }
})
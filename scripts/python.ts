import { readFileSync } from "fs";
import { runCode } from "../lib/claude";

const DEFAULT_CODE = `
import numpy as np

data = np.random.randint(1, 100, size=10)
print(f"Random numbers: {data}")
print(f"Mean: {np.mean(data):.2f}")
print(f"Std:  {np.std(data):.2f}")
print(f"Max:  {np.max(data)}")
print(f"Min:  {np.min(data)}")
`.trim();

const arg = process.argv[2];

let code: string;
if (!arg) {
  code = DEFAULT_CODE;
} else {
  try {
    code = readFileSync(arg, "utf-8");
  } catch {
    code = process.argv.slice(2).join(" ");
  }
}

runCode(code).catch(console.error);

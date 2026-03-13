import { ask } from "../lib/claude";

const prompt = process.argv.slice(2).join(" ") || "Hello! What can you help me with?";
ask(prompt).catch(console.error);

export const TOOLS = [
  {
    name: "execute_python",
    description: `Run Python code in a persistent E2B sandbox. All DataFrames and libraries are pre-loaded — see the system prompt for full schema details. Stdout is returned. Files saved to /home/user/ persist across calls.`,
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Python code to execute",
        },
        reasoning: {
          type: "string",
          description: "Brief note on what this step is doing and why",
        },
      },
      required: ["code", "reasoning"],
    },
  },
  {
    name: "finish_analysis",
    description:
      "Call this as soon as you can answer the question. Provide a concise answer that addresses what was asked and concisely summarizes any findings related to the initial question. The answer should be in plain text, not markdown.",
    input_schema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description:
            "Plain text summarizing the answer to the user's question",
        },
      },
      required: ["answer"],
    },
  },
] as const;

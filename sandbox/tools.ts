export const TOOLS = [
  {
    name: "execute_python",
<<<<<<< HEAD
    description: `Run Python code in a persistent E2B sandbox. All DataFrames and libraries are pre-loaded — see the system prompt for full schema details. Stdout is returned. Files saved to /home/user/ persist across calls.`,
=======
    description: `Run Python code in a persistent E2B sandbox.
The sandbox has pre-loaded pandas DataFrames: resources, shifts, occurrences, tags, flags.
Common libraries are available: pandas, numpy, matplotlib, seaborn, scipy, geopy.
Use this to analyze the data and produce findings.
Stdout is returned. DataFrames printed with print(df) or df.to_string() are captured.
Files saved to /home/user/ persist across calls.`,
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
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
      "Call this as soon as you can answer the question. Provide a short plain-text answer that directly addresses what was asked — nothing extra.",
    input_schema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description:
            "A few sentences summarizing the answer to the user's question",
        },
      },
      required: ["answer"],
    },
  },
] as const;

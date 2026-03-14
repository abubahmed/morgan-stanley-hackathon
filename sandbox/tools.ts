export const TOOLS = [
  {
    name: "execute_python",
    description: `Run Python code in a persistent E2B sandbox.
The sandbox has pre-loaded pandas DataFrames: resources, shifts, occurrences, tags, flags.
Pre-loaded analysis functions: filter_resources(), filter_occurrences(), filter_reviews(), query_resources(), trend(), gap_analysis(), fetch_json(), load_public_dataset(), join_on_geo(), generate_pdf_report().
Common libraries are available: pandas, numpy, matplotlib, seaborn, scipy, geopy, dateutil, reportlab.
Use this to analyze the data and produce findings. Stdout is captured.
Files saved to /home/user/ persist across calls.`,
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

export const TOOLS = [
  {
    name: "execute_python",
    description: `Run Python code in a persistent E2B sandbox.
The sandbox has pre-loaded pandas DataFrames:
- Lemontree: resources, descriptions, shifts, occurrences, tags, flags
- Census: census_demographics, census_poverty, census_income, census_housing, census_education, census_geography
Common libraries are available: pandas, numpy, matplotlib, seaborn, scipy, geopy.
Use this to analyze the data and produce findings.
Stdout is returned. DataFrames printed with print(df) or df.to_string() are captured.
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

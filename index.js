const axios = require("axios");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const report_schema = {
  name: "report_schema",
  schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["bug", "feature-request", "documentation"],
        description: "The type of issue.",
      },
      subcategory: {
        type: "string",
        description: "The specific feature or area in question.",
      },
      date_opened: {
        type: "string",
        format: "date",
        description: "The date in YYYY-MM-DD format.",
      },
      status: {
        type: "string",
        enum: ["OPEN", "CLOSED"],
        description: "The status of the issue.",
      },
      author: {
        type: "object",
        properties: {
          "user-type": {
            type: "string",
            enum: ["CONTRIBUTOR", "MAINTAINER"],
            description: "The type of user reporting the issue.",
          },
          "user-maturity": {
            type: "string",
            enum: ["NOVICE", "POWER-USER"],
            description: "The experience level of the user.",
          },
          "user-maturity-confidence": {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "The confidence level of the user's experience.",
          },
        },
        required: ["user-type", "user-maturity", "user-maturity-confidence"],
      },
      github_issue_url: {
        type: "string",
        format: "uri",
        description: "The URL of the GitHub issue.",
      },
      title: {
        type: "string",
        description: "The title of the GitHub issue",
      },
      summary: {
        type: "string",
        description: "A one sentence summary of the issue",
      },
      date_closed: {
        type: ["string", "null"],
        format: "date",
        description:
          "The date when the issue was closed, or null if it is still open.",
      },
    },
    required: [
      "category",
      "subcategory",
      "date_opened",
      "status",
      "author",
      "github_issue_url",
      "title",
      "summary",
      "date_closed",
    ],
  },
};

async function fetchIssues(owner, repo) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=all`,
    {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    }
  );
  return response.data;
}

async function analyzeIssue(issue) {
  const systemPrompt = `extract information about a GitHub issue based on the response_format schema.
    the use prompt will be the issue tinfo from the GitHub API`;

  const report = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(issue) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: report_schema,
    },
  });

  return JSON.parse(report.choices[0].message.content);

  // return JSON.parse(report.data.choices[0].text);
}

async function generateReport(owner, repo) {
  console.log("fetching issues...");
  const issues = await fetchIssues(owner, repo);
  console.log(`fetched ${issues.length} issues`);

  console.log(`analyzing issues...`);
  const results = [];
  let i = 1;
  for (const issue of issues) {
    const analyzedIssue = await analyzeIssue(issue);
    console.log(`analyzed issue ${i}/${issues.length}`);
    results.push(analyzedIssue);
    i++;
  }

  console.log("Generated Report:", results);
}

(async () => {
  const owner = "clairefro";
  const repo = "obsidian-chat-cbt-plugin";
  await generateReport(owner, repo);
})();

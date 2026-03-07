/**
 * Developer Tutorials / Guides Content
 * Step-by-step guides for ALEXZA AI platform
 */

export interface GuideItem {
  slug: string;
  title: string;
  description: string;
  overview: string;
  steps: { title: string; content: string }[];
  exampleCode?: string;
  tips?: string[];
  troubleshooting?: { problem: string; solution: string }[];
  links?: { label: string; href: string }[];
}

export const GUIDES: GuideItem[] = [
  {
    slug: "build-first-ai-api",
    title: "Build Your First AI API",
    description: "Create a production-ready AI API in under 10 minutes.",
    overview: "This guide walks you through creating your first AI project, defining an action in Chat Builder, and calling it via the API. You'll learn the core concepts of project, action, and API key authentication.",
    steps: [
      {
        title: "Create a project",
        content: "Go to [Projects](/app/projects) and click **New Project**. Give it a name like \"My First API\" and optionally a description. Projects are containers for your AI actions.",
      },
      {
        title: "Create an action in Chat Builder",
        content: "Open your project and click **Open ChatBuilder**. In the chat, describe what you want your AI to do: e.g. \"Create an action that summarizes text. Input: { text: string }. Output: { summary: string }.\" Apply the action when the builder suggests it.",
      },
      {
        title: "Create an API key",
        content: "In your project, go to the **API Keys** tab. Click **Create Key**, give it a name, and copy the key. Store it securely—you won't see it again.",
      },
      {
        title: "Call your API",
        content: "Use the run endpoint with your project ID, action name, and API key. See the example below.",
      },
    ],
    exampleCode: `curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/your_action_name" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"input": {"text": "Long text to summarize..."}}'`,
    tips: [
      "Use the Chat Builder for rapid iteration—describe your action in natural language.",
      "Test actions in the [Playground](/playground) before integrating into your app.",
      "Check your input schema in the Actions tab to ensure your payload matches.",
    ],
    troubleshooting: [
      { problem: "401 Unauthorized", solution: "Verify your x-api-key header is correct and the key has not been revoked." },
      { problem: "404 Not Found", solution: "Ensure the project ID and action name in the URL are correct. Action names are case-sensitive." },
      { problem: "Validation error on input", solution: "Check the action's inputSchema. Your JSON must match the required properties and types." },
    ],
    links: [
      { label: "API Reference", href: "/docs#run-by-action" },
      { label: "Playground", href: "/playground" },
      { label: "Examples", href: "/docs#examples-overview" },
    ],
  },
  {
    slug: "create-first-agent",
    title: "Create Your First AI Agent",
    description: "Build an AI agent that uses actions and workflows as tools.",
    overview: "Agents combine multiple tools—actions, workflows, and webhooks—into a single conversational interface. This guide shows you how to create an agent, assign tools, and run it via the API.",
    steps: [
      {
        title: "Create a project",
        content: "Go to [Projects](/app/projects) and create a project. Add at least one action (e.g. via Chat Builder).",
      },
      {
        title: "Create an agent",
        content: "Go to [Agents](/app/agents) and click **Create Agent**. Give it a name and description. Select a workspace.",
      },
      {
        title: "Add tools",
        content: "In the agent configuration, add **Action** tools: select your project and action. You can add multiple actions, workflows, or webhooks.",
      },
      {
        title: "Run the agent",
        content: "Use the run endpoint with your agent ID. The agent will route requests to its tools based on context.",
      },
    ],
    exampleCode: `curl -X POST "https://api.alexza.ai/api/agents/YOUR_AGENT_ID/run" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=YOUR_SESSION" \\
  -d '{"input": {"message": "Summarize this: ..."}}'`,
    tips: [
      "Enable memory for multi-turn conversations.",
      "Use descriptive labels for tools so the agent can choose the right one.",
      "Combine actions from different projects for complex workflows.",
    ],
    troubleshooting: [
      { problem: "Agent not found", solution: "Ensure the agent ID is correct and you have access to the workspace." },
      { problem: "Tool execution failed", solution: "Check that the underlying action or workflow is correctly configured and enabled." },
    ],
    links: [
      { label: "Agents API", href: "/docs#agents-overview" },
      { label: "Playground", href: "/playground" },
      { label: "App Store", href: "/app/store" },
    ],
  },
  {
    slug: "build-automation-workflow",
    title: "Build an Automation Workflow",
    description: "Create a workflow that triggers on events and runs AI actions.",
    overview: "Workflows automate repetitive tasks by chaining triggers, actions, and outputs. You can trigger workflows via webhooks, API events, or schedules. This guide shows you how to build a simple workflow.",
    steps: [
      {
        title: "Create a workflow",
        content: "Go to [Workflows](/app/workflows) and click **Create Workflow**. Give it a name and select a workspace.",
      },
      {
        title: "Add a trigger",
        content: "Add a **Trigger** step. Choose Webhook (for HTTP calls), API Event (for project events), or Schedule (for cron).",
      },
      {
        title: "Add an action step",
        content: "Add an **Action** step. Select **Run AI Action** and choose your project and action. You can map trigger payload to action input.",
      },
      {
        title: "Add an output",
        content: "Add an **Output** step—e.g. Send Webhook to notify an external system, or Log Result for debugging.",
      },
      {
        title: "Enable and test",
        content: "Enable the workflow and trigger it via the webhook URL or your configured event.",
      },
    ],
    exampleCode: `# Trigger via webhook
curl -X POST "https://api.alexza.ai/api/trigger/YOUR_WORKFLOW_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"text": "Process this..."}}'`,
    tips: [
      "Use the workflow editor to inspect step order and data flow.",
      "Test with small payloads before enabling in production.",
      "Schedule workflows for batch processing (e.g. daily summaries).",
    ],
    troubleshooting: [
      { problem: "Workflow not triggering", solution: "Ensure the workflow is enabled. Check the trigger URL or schedule." },
      { problem: "Step failed", solution: "Inspect the step config. For run_ai_action, verify projectId and actionName." },
    ],
    links: [
      { label: "Workflows API", href: "/docs#agents-tools" },
      { label: "Webhooks", href: "/docs#webhooks" },
      { label: "Playground", href: "/playground" },
    ],
  },
  {
    slug: "use-templates-starter-packs",
    title: "Use Templates and Starter Packs",
    description: "Jumpstart development with pre-built templates and packs.",
    overview: "Templates are ready-to-use actions you can install into projects. Starter Packs bundle multiple actions and configurations for common use cases. This guide shows how to find and install them.",
    steps: [
      {
        title: "Browse templates",
        content: "Go to [Templates](/app/templates) or [Marketplace](/app/marketplace). Browse by category: summarization, extraction, classification, etc.",
      },
      {
        title: "Install a template",
        content: "Click **Install** on a template. Select a project. The action will be added to your project with the configured schema and prompt.",
      },
      {
        title: "Browse starter packs",
        content: "Go to [Starter Packs](/app/packs). Packs include multiple actions and sometimes project setup.",
      },
      {
        title: "Install a pack",
        content: "Click **Install** on a pack. Choose a workspace and optionally a project. The pack will create or update resources.",
      },
    ],
    exampleCode: `# After installing, call the action like any other
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/installed_action_name" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"input": {"text": "..."}}'`,
    tips: [
      "Customize installed templates by editing the action in Chat Builder.",
      "Packs may create new projects—check your project list after install.",
      "Rate templates and packs to help others discover quality content.",
    ],
    troubleshooting: [
      { problem: "Install failed", solution: "Ensure you have projects:manage or actions:manage permission in the target workspace." },
      { problem: "Action not found after install", solution: "Refresh the project or check the Actions tab for the new action name." },
    ],
    links: [
      { label: "Template Library", href: "/docs#template-library-overview" },
      { label: "Marketplace", href: "/app/marketplace" },
      { label: "App Store", href: "/app/store" },
    ],
  },
  {
    slug: "use-javascript-sdk",
    title: "Use the JavaScript SDK",
    description: "Integrate ALEXZA AI into your Node.js or browser app.",
    overview: "The official JavaScript SDK provides a simple interface for running actions. Install it, add your API key, and call actions with a few lines of code.",
    steps: [
      {
        title: "Install the SDK",
        content: "Run `npm install @alexza-ai/sdk` in your project.",
      },
      {
        title: "Initialize the client",
        content: "Create a client with your API key. Use environment variables in production.",
      },
      {
        title: "Run an action",
        content: "Call `client.run()` with project ID, action name, and input. The SDK handles authentication and returns the output.",
      },
    ],
    exampleCode: `import { Alexza } from "@alexza-ai/sdk";

const client = new Alexza(process.env.ALEXZA_API_KEY);

const result = await client.run({
  project: "507f1f77bcf86cd799439011",
  action: "summarize_text",
  input: { text: "Long text to summarize..." },
});

console.log(result.output);
console.log("Credits:", result.creditsCharged);`,
    tips: [
      "Use TypeScript for better type inference on input/output.",
      "Handle AlexzaError for structured error responses.",
      "Set baseUrl in options for self-hosted or custom deployments.",
    ],
    troubleshooting: [
      { problem: "Module not found", solution: "Ensure @alexza-ai/sdk is installed. Run npm install." },
      { problem: "Invalid API key", solution: "Verify the key starts with axza_live_ or axza_test_ and is not revoked." },
    ],
    links: [
      { label: "SDK Reference", href: "/docs/sdk" },
      { label: "API Reference", href: "/docs#run-by-action" },
      { label: "Playground", href: "/playground" },
    ],
  },
  {
    slug: "use-cli",
    title: "Use the CLI",
    description: "Manage projects and run actions from the command line.",
    overview: "The ALEXZA CLI lets you authenticate, run actions, and manage resources from your terminal. Perfect for scripts, CI/CD, and local testing.",
    steps: [
      {
        title: "Install the CLI",
        content: "Run `npm install -g @alexza-ai/cli` or use npx.",
      },
      {
        title: "Log in",
        content: "Run `alexza login` to authenticate. This opens a browser or prompts for credentials.",
      },
      {
        title: "Run an action",
        content: "Use `alexza run <project-id> <action-name> --input '{\"text\":\"...\"}'` to run an action.",
      },
      {
        title: "List projects",
        content: "Use `alexza projects list` to see your projects. Use `--project` for a specific project.",
      },
    ],
    exampleCode: `# Login
alexza login

# Run an action
alexza run 507f1f77bcf86cd799439011 summarize_text --input '{"text":"Hello world"}'

# List projects
alexza projects list`,
    tips: [
      "Use --api-key for non-interactive usage (CI/CD).",
      "Pipe input from a file: --input \"$(cat input.json)\".",
      "Use --help on any command for options.",
    ],
    troubleshooting: [
      { problem: "Not logged in", solution: "Run alexza login before running actions." },
      { problem: "Command not found", solution: "Ensure the CLI is in your PATH. Try npx @alexza-ai/cli run ..." },
    ],
    links: [
      { label: "CLI Reference", href: "/docs/cli" },
      { label: "SDK", href: "/docs/sdk" },
      { label: "API Reference", href: "/docs#run-by-action" },
    ],
  },
  {
    slug: "export-import-projects",
    title: "Export and Import Projects",
    description: "Backup, migrate, or share projects with export/import.",
    overview: "Export projects as JSON files containing project settings, actions, agents, and workflows. Import them into another workspace for backup, migration, or sharing.",
    steps: [
      {
        title: "Export a project",
        content: "Open your project and go to the **Overview** tab. Click **Export Project**. A JSON file will download.",
      },
      {
        title: "Inspect the export",
        content: "The export includes version, project metadata, actions, agents (that reference the project), and workflows. Use __PROJECT__ as a placeholder for the new project ID on import.",
      },
      {
        title: "Import a project",
        content: "Go to any project's Overview tab and click **Import Project**. Select a workspace and choose the export JSON file. A new project will be created.",
      },
      {
        title: "Verify after import",
        content: "Check the new project's actions, API keys, and workflows. Create new API keys if needed (keys are not exported).",
      },
    ],
    exampleCode: `# Export via API
curl -X GET "https://api.alexza.ai/api/projects/YOUR_PROJECT_ID/export" \\
  -H "Cookie: session=YOUR_SESSION" \\
  -o export.json

# Import via API
curl -X POST "https://api.alexza.ai/api/projects/import" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=YOUR_SESSION" \\
  -d '{"workspaceId": "WORKSPACE_ID", "data": { ... export JSON ... }}'`,
    tips: [
      "API keys are not exported—create new keys after import.",
      "Import requires projects:manage permission on the target workspace.",
      "Use descriptive export filenames for versioning.",
    ],
    troubleshooting: [
      { problem: "Invalid export payload", solution: "Ensure the JSON has version \"1\" and valid project/actions/agents/workflows structure." },
      { problem: "Import failed - workspace", solution: "Verify you have access and projects:manage permission on the target workspace." },
    ],
    links: [
      { label: "Project Export / Import", href: "/docs#project-export-import" },
      { label: "API Reference", href: "/docs#project-export-api" },
      { label: "Projects", href: "/app/projects" },
    ],
  },
];

export function getGuideBySlug(slug: string): GuideItem | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

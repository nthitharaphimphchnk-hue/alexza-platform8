#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { projectsCommand } from "./commands/projects.js";
import { actionsCommand } from "./commands/actions.js";
import { runCommand } from "./commands/run.js";
import { logsCommand } from "./commands/logs.js";
import { usageCommand } from "./commands/usage.js";

const program = new Command();

program
  .name("alexza")
  .description("Official ALEXZA AI CLI - interact with the platform from the command line")
  .version("1.0.0");

loginCommand(program);
projectsCommand(program);
actionsCommand(program);
runCommand(program);
logsCommand(program);
usageCommand(program);

program.parse();

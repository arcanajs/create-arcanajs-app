#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import fs from "fs-extra";
import inquirer from "inquirer";
import ora from "ora";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

const npmRegistryBaseUrl = "https://registry.npmjs.org/";
const versionCache = new Map();

const getLatestVersion = async (pkg) => {
  if (versionCache.has(pkg)) {
    return versionCache.get(pkg);
  }

  const response = await fetch(`${npmRegistryBaseUrl}${pkg}`);
  if (!response.ok) {
    throw new Error(`Unable to retrieve version info for ${pkg}`);
  }

  const data = await response.json();
  const latest = data?.["dist-tags"]?.latest;
  if (!latest) {
    throw new Error(`No latest tag found for ${pkg}`);
  }

  versionCache.set(pkg, latest);
  return latest;
};

const withLatestVersions = async (deps = {}) => {
  const entries = Object.entries(deps);
  if (!entries.length) {
    return deps;
  }

  const updated = await Promise.all(
    entries.map(async ([name, currentVersion]) => {
      try {
        const latest = await getLatestVersion(name);
        return [name, `^${latest}`];
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Unknown registry error";
        console.warn(
          chalk.yellow(
            `Unable to fetch latest version for ${name}. Using ${currentVersion}. Reason: ${reason}`
          )
        );
        return [name, currentVersion];
      }
    })
  );

  return Object.fromEntries(updated);
};

program
  .name("create-arcanajs-app")
  .description("Bootstrap a new ArcanaJS application")
  .argument("[project-directory]", "Directory to create the application in")
  .action(async (projectDirectory) => {
    let targetDir = projectDirectory;

    if (!targetDir) {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "What is the name of your project?",
          default: "my-arcanajs-app",
          validate: (input) => {
            if (/^([a-z0-9-_.]+)$/.test(input)) return true;
            return "Project name may only include letters, numbers, underscores and hashes.";
          },
        },
      ]);
      targetDir = answers.projectName;
    }

    const root = path.resolve(targetDir);
    const appName = path.basename(root);

    if (fs.existsSync(root)) {
      console.error(chalk.red(`Directory ${root} already exists.`));
      process.exit(1);
    }

    console.log(`\nCreating a new ArcanaJS app in ${chalk.green(root)}.\n`);

    const spinner = ora("Initializing project...").start();

    try {
      await fs.ensureDir(root);
      const templateDir = path.resolve(__dirname, "../template");

      // Copy template files
      spinner.text = "Copying template files...";
      await fs.copy(templateDir, root);

      // Update package.json name
      spinner.text = "Configuring package.json...";
      const packageJsonPath = path.join(root, "package.json");
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = appName;

      // spinner.text = "Fetching latest dependency versions...";
      // const [deps, devDeps] = await Promise.all([
      //   withLatestVersions(packageJson.dependencies),
      //   withLatestVersions(packageJson.devDependencies),
      // ]);
      // packageJson.dependencies = deps;
      // packageJson.devDependencies = devDeps;

      spinner.text = "Configuring package.json...";
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

      // Create .gitignore
      const gitignoreContent = `node_modules
dist
.arcanajs
.env
.DS_Store
coverage
`;
      await fs.writeFile(path.join(root, ".gitignore"), gitignoreContent);

      spinner.succeed("Project structure created.");

      // Ask for package manager
      const { packageManager } = await inquirer.prompt([
        {
          type: "list",
          name: "packageManager",
          message: "Which package manager do you want to use?",
          choices: ["npm", "yarn", "pnpm"],
          default: "npm",
        },
      ]);

      // Install dependencies
      console.log();
      const installSpinner = ora(
        `Installing dependencies using ${packageManager}...`
      ).start();

      try {
        await execa(packageManager, ["install"], { cwd: root });
        installSpinner.succeed("Dependencies installed.");
      } catch (err) {
        installSpinner.fail("Failed to install dependencies.");
        console.error(err);
        // Don't exit, just warn
      }

      // Git init
      const gitSpinner = ora("Initializing git repository...").start();
      try {
        await execa("git", ["init"], { cwd: root });
        gitSpinner.succeed("Git repository initialized.");
      } catch (err) {
        gitSpinner.warn(
          "Failed to initialize git repository (git might not be installed)."
        );
        console.warn(err);
      }

      console.log();
      console.log(chalk.green("Success!"), `Created ${appName} at ${root}`);
      console.log("Inside that directory, you can run several commands:");
      console.log();
      console.log(chalk.cyan(`  ${packageManager} run dev`));
      console.log("    Starts the development server.");
      console.log();
      console.log(chalk.cyan(`  ${packageManager} run build`));
      console.log("    Bundles the app for production.");
      console.log();
      console.log(chalk.cyan(`  ${packageManager} start`));
      console.log("    Starts the production server.");
      console.log();
      console.log("We suggest that you begin by typing:");
      console.log();
      console.log(chalk.cyan("  cd"), targetDir);
      console.log(chalk.cyan(`  ${packageManager} run dev`));
      console.log();
    } catch (error) {
      spinner.fail("An error occurred.");
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

program.parse(process.argv);

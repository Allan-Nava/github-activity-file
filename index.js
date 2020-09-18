/*
 *  index.js
 *  Allan Nava 2020-09-17
 *  Allan Nava 2020-09-18
 *
 *  Created by [ Allan Nava ].
 *  Updated by [ Allan Nava ]
 *  Copyright © 2020 [ Allan Nava ]. All rights reserved.
 */
const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Toolkit } = require("actions-toolkit");
//
const MAX_LINES = 5;
//
// Get config
const GH_USERNAME = core.getInput("GH_USERNAME");
const COMMIT_MSG = core.getInput("COMMIT_MSG");
const FILE = core.getInput("FILE");
//
/**
 * Returns the sentence case representation
 * @param {String} str - the string
 *
 * @returns {String}
 */

const capitalize = (str) => str.slice(0, 1).toUpperCase() + str.slice(1);
///
const urlPrefix = "https://github.com/";
///

/**
 * Returns a URL in markdown format for PR's and issues
 * @param {Object | String} item - holds information concerning the issue/PR
 *
 * @returns {String}
 */

const toUrlFormat = (item) => {
  if (typeof item === "object") {
    return Object.hasOwnProperty.call(item.payload, "issue")
      ? `[#${item.payload.issue.number}](${urlPrefix}/${item.repo.name}/issues/${item.payload.issue.number})`
      : `[#${item.payload.pull_request.number}](${urlPrefix}/${item.repo.name}/pull/${item.payload.pull_request.number})`;
  }
  return `[${item}](${urlPrefix}/${item})`;
};

/**
 * Execute shell command
 * @param {String} cmd - root command
 * @param {String[]} args - args to be passed along with
 *
 * @returns {Promise<void>}
 */

const exec = (cmd, args = []) =>
  new Promise((resolve, reject) => {
    const app = spawn(cmd, args, { stdio: "pipe" });
    let stdout = "";
    app.stdout.on("data", (data) => {
      stdout = data;
    });
    app.on("close", (code) => {
      if (code !== 0 && !stdout.includes("nothing to commit")) {
        err = new Error(`Invalid status code: ${code}`);
        err.code = code;
        return reject(err);
      }
      return resolve(code);
    });
    app.on("error", reject);
  });

/**
 * Make a commit
 *
 * @returns {Promise<void>}
 */

const commitFile = async () => {
  await exec("git", [
    "config",
    "--global",
    "user.email",
    "github-actions@github.com",
  ]);
  await exec("git", ["config", "--global", "user.name", "github-actions"]);
  await exec("git", ["add", "-A"]);
  await exec("git", ["commit", "-m", COMMIT_MSG]);
  await exec("git", ["push"]);
};
//

const serializers = {
  IssueCommentEvent: (item) => {
    return `🗣 Commented on ${toUrlFormat(item)} in ${toUrlFormat(
      item.repo.name
    )}`;
  },
  IssuesEvent: (item) => {
    return `❗️ ${capitalize(item.payload.action)} issue ${toUrlFormat(
      item
    )} in ${toUrlFormat(item.repo.name)}`;
  },
  PullRequestEvent: (item) => {
    const emoji = item.payload.action === "opened" ? "💪" : "❌";
    const line = item.payload.pull_request.merged
      ? "🎉 Merged"
      : `${emoji} ${capitalize(item.payload.action)}`;
    return `${line} PR ${toUrlFormat(item)} in ${toUrlFormat(item.repo.name)}`;
  },
  CommitCommentEvent: (item) => {
    return `📝 Commit on ${toUrlFormat(item)} in ${toUrlFormat(
      item.repo.name
    )}`;
  },
};

Toolkit.run(
  async (tools) => {
    // Get the user's public events
    tools.log.debug(`Getting activity for ${GH_USERNAME}`);
    const events = await tools.github.activity.listPublicEventsForUser({
      username: GH_USERNAME,
      per_page: 100,
    });
    tools.log.debug(
      `Activity for ${GH_USERNAME}, ${events.data.length} events found.`
    );
    const content = events.data
      // Filter out any boring activity
      .filter((event) => serializers.hasOwnProperty(event.type))
      // We only have five lines to work with
      .slice(0, MAX_LINES)
      // Call the serializer to construct a string
      .map((item) => serializers[item.type](item));
    //
    //tools.log.debug(`Events data: ${events.data} .`);
    const fileContent = fs.readFileSync(`${FILE}`, "utf-8").split("\n");
    tools.log.debug("fileContent " + fileContent);
    //console.log(fileContent);
    // Find the index corresponding to <!--START_SECTION:activity--> comment
    let startIdx = fileContent.findIndex(
      (content) => content.trim() === "<!--START_SECTION:activity-->"
    );
    //
    tools.log.debug(`startIdx ${startIdx} | content: ${content}`);
    // Early return in case the <!--START_SECTION:activity--> comment was not found
    if (startIdx === -1) {
      return tools.exit.failure(
        `Couldn't find the <!--START_SECTION:activity--> comment. Exiting!`
      );
    }
    //
    // Find the index corresponding to <!--END_SECTION:activity--> comment
    const endIdx = fileContent.findIndex(
      (content) => content.trim() === "<!--END_SECTION:activity-->"
    );

    tools.log.debug(`endIdx ${endIdx} | content: ${content}`);

    if (!content.length) {
      tools.exit.failure("No PullRequest/Issue/IssueComment events found");
    }

    if (content.length < 5) {
      tools.log.info("Found less than 5 activities");
    }

    if (startIdx !== -1 && endIdx === -1) {
      // Add one since the content needs to be inserted just after the initial comment
      startIdx++;
      content.forEach((line, idx) =>
        fileContent.splice(startIdx + idx, 0, `${idx + 1}. ${line}`)
      );

      // Append <!--END_SECTION:activity--> comment
      fileContent.splice(
        startIdx + content.length,
        0,
        "<!--END_SECTION:activity-->"
      );

      // Update FILE
      fs.writeFileSync(FILE, fileContent.join("\n"));

      // Commit to the remote repository
      try {
        tools.log.debug("await commitFile: " + fileContent);
        await commitFile();
      } catch (err) {
        tools.log.debug("Something went wrong " + err);
        return tools.exit.failure(err);
      }
      tools.exit.success("Wrote to FILE");
    }

    const oldContent = fileContent.slice(startIdx + 1, endIdx).join("\n");
    const newContent = content
      .map((line, idx) => `${idx + 1}. ${line}`)
      .join("\n");

    if (oldContent.trim() === newContent.trim())
      tools.exit.success("No changes detected");

    startIdx++;

    // Recent GitHub Activity content between the comments
    const fileActivitySection = fileContent.slice(startIdx, endIdx);
    if (!fileActivitySection.length) {
      content.some((line, idx) => {
        // User doesn't have 5 public events
        tools.log.success("User doesn't have 5 public events: " + FILE);
        if (!line) {
          return true;
        }
        fileContent.splice(startIdx + idx, 0, `${idx + 1}. ${line}`);
      });
      tools.log.success("Wrote to FILE: " + FILE);
    } else {
      // It is likely that a newline is inserted after the <!--START_SECTION:activity--> comment (code formatter)
      let count = 0;

      fileActivitySection.some((line, idx) => {
        // User doesn't have 5 public events
        if (!content[count]) {
          return true;
        }
        if (line !== "") {
          fileContent[startIdx + idx] = `${count + 1}. ${content[count]}`;
          count++;
        }
      });
      //tools.log.debug(`fileActivitySection= ${fileActivitySection} `);
      tools.log.success("Updated FILE with the recent activity. ");
    }

    // Update FILE
    fs.writeFileSync(FILE, fileContent.join("\n"));

    // Commit to the remote repository
    try {
      tools.log.success("Commit to the remote repository: " + FILE);
      await commitFile();
    } catch (err) {
      tools.log.debug("Something went wrong | updated file" + err);
      return tools.exit.failure(err);
    }
    tools.log.info(`fileContent ${fileContent} | ${FILE} `);
    tools.exit.success("Pushed to remote repository");
  },
  {
    event: ["schedule", "workflow_dispatch"],
    secrets: ["GITHUB_TOKEN"],
  }
);

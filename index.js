/*
 *  index.js
 *  Allan Nava 2020-09-17
 *  Allan Nava 2020-09-17
 *
 *  Created by [ Allan Nava ].
 *  Updated by [ Allan Nava ]
 *  Copyright © 2020 [ Allan Nava ]. All rights reserved.
 */
const core          = require("@actions/core");
const fs            = require("fs");
const path          = require("path");
const { spawn }     = require("child_process");
const { Toolkit }   = require("actions-toolkit");
//
const MAX_LINES = 5;
//
// Get config
const GH_USERNAME   = core.getInput("GH_USERNAME");
const COMMIT_MSG    = core.getInput("COMMIT_MSG");
const FILE          = core.getInput("FILE");
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
        "readme-bot@example.com",
    ]);
    await exec("git", ["config", "--global", "user.name", "readme-bot"]);
    await exec("git", ["add", "README.md"]);
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
};
  
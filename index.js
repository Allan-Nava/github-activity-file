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
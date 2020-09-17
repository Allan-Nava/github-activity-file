# github-activity-file

Updates FILE with the recent GitHub activity of a user.


## Instructions

- Add the comment `<!--START_SECTION:activity-->` (entry point) within `<PATH FILE>`. You can find an example


- It's the time to create a workflow file.

`.github/workflows/update-file.yml`

```yml
name: Update Activity FILE

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    name: Update this repo's FILE with recent activity

    steps:
      - uses: actions/checkout@v2
      - uses: Allan-Nava/github-activity-file@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          FILE: 'PATH FILE'
```

The above job runs every half an hour, you can change it as you wish based on the [cron syntax](https://jasonet.co/posts/scheduled-actions/#the-cron-syntax).

Please note that only those public events that belong to the following list show up:-


Inspired by <a href="https://github.com/jamesgeorge007/github-activity-readme" _target="blank">github-activity-readme</a>
const reminderCommand = require('./reminder');
const helpCommand = require('./help');
const weeklyReportCommand = require('./weeklyReport');
const pomodoroCommand = require('./pomodoro');
const anonymousCommand = require('./anonymous');
const lunchVoteCommand = require('./lunchVote');
const pickCommand = require('./pick');
const calculatorCommand = require('./calculator');
const splitCommand = require('./split');

module.exports = {
  reminder: reminderCommand,
  help: helpCommand,
  weeklyReport: weeklyReportCommand,
  pomodoro: pomodoroCommand,
  anonymous: anonymousCommand,
  lunchVote: lunchVoteCommand,
  pick: pickCommand,
  ladder: require('./ladder'),
  calculator: calculatorCommand,
  split: splitCommand,
};

const reminderCommand = require('./reminder');
const helpCommand = require('./help');
const weeklyReportCommand = require('./weeklyReport');
const pomodoroCommand = require('./pomodoro');
const anonymousCommand = require('./anonymous');

module.exports = {
  reminder: reminderCommand,
  help: helpCommand,
  weeklyReport: weeklyReportCommand,
  pomodoro: pomodoroCommand,
  anonymous: anonymousCommand,
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code style
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI/CD
        'chore',    // Other changes
        'revert'    // Revert commit
      ]
    ],
    'subject-case': [0], // Don't enforce case
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200]
  }
};

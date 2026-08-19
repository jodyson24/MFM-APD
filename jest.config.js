module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'v1/**/*.js',
    'lib/**/*.js',
    'services/**/*.js',
    'middlewares/**/*.js',
    '!**/tests/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
};
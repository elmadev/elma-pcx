/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+.(ts|tsx|js)$': ['ts-jest', { isolatedModules: true }],
  },
};

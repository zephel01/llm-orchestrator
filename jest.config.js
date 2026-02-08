export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/*.test.mjs'
  ],
  moduleFileExtensions: ['mjs', 'js'],
  testTimeout: 10000
};

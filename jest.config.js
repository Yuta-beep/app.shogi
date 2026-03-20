module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/test/file-mock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  watchman: false,
};

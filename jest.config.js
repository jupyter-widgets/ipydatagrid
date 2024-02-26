module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/?!(@jupyter-widgets)', 'node_modules/bqplot'],
  testPathIgnorePatterns: ['ui-tests-ipw7/', 'ui-tests-ipw8/'],
  setupFiles: ['./tests/js/setupFile.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
    "raw-loader!.*": "jest-raw-loader",
  },
};

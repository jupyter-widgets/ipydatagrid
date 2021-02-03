module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  rootDir: './',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/?!(@jupyter-widgets)'],
  setupFiles: ['./tests/js/setupFile.js'],
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
    'src/(.*)': '<rootDir>/src/$1',
    'tests/(.*)': '<rootDir>/tests/$1',
  },
};

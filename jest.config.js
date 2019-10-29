module.exports = {
  "roots": [
    "<rootDir>/src/tests"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.js$": "babel-jest"
  },
  "transformIgnorePatterns": [
    "node_modules/?!(@jupyter-widgets)",
  ],
  "setupFiles": [
    './src/tests/setupFile.js'
  ],
  "moduleNameMapper":{
    "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js",
}
}
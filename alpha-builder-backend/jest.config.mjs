/**
 * @type {import('jest').Config}
 */
const config = {
  rootDir: "src",
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true
      }
    ]
  },
  extensionsToTreatAsEsm: [".ts"],
  collectCoverageFrom: ["**/*.{ts,js}"],
  coverageDirectory: "../coverage",
  moduleFileExtensions: ["ts", "js", "json"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.[jt]s$": "$1.js"
  }
};

export default config;

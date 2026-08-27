module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^obsidian$": "<rootDir>/__tests__/__mocks__/obsidian.ts",
  },
};

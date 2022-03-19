module.exports = {
  transform: {
    "^.+\\.tsx?$": "esbuild-jest",
  },
  testRegex: "/test/.*\\.test\\.ts$",
  collectCoverageFrom: ["src/**/*.{ts,js}"],
  verbose: true,
  // "setupFiles": ["./test/setupTests.ts"]
};

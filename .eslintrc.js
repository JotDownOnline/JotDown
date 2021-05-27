module.exports =  {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
      node: true,
      es6: true
  },
  plugins: ["@typescript-eslint"],
  extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended"
  ],
  ignorePatterns: ["dist"],
  rules: {
      "@typescript-eslint/no-empty-interface": 0,
      "@typescript-eslint/ban-types": 0,
      "@typescript-eslint/no-explicit-any": 0,
  }
}
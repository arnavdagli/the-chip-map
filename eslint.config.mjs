import { defineConfig, globalIgnores } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...coreWebVitals,
  globalIgnores([".next/**", "node_modules/**", ".npm-cache-tmp/**"]),
]);

export default eslintConfig;

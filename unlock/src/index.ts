import * as core from "@actions/core";
import { main } from "./run";

export { main };

try {
  main();
} catch (error) {
  core.setFailed(
    error instanceof Error ? error.message : JSON.stringify(error),
  );
}

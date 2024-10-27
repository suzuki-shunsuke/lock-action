import * as core from "@actions/core";
import { main } from "unlock";

try {
  if (core.getBooleanInput("post_unlock")) {
    core.info("unlocking...");
    main();
  } else {
    core.info("unlock is disabled.");
  }
} catch (error) {
  core.setFailed(
    error instanceof Error ? error.message : JSON.stringify(error),
  );
}

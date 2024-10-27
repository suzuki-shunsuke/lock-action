import * as core from "@actions/core";
import { unlock } from "lib";

try {
  if (core.getBooleanInput("post_unlock") && core.getState("got_lock") !== "true") {
    core.info("unlocking...");
    unlock();
  } else {
    core.info("unlock is disabled.");
  }
} catch (error) {
  core.setFailed(
    error instanceof Error ? error.message : JSON.stringify(error),
  );
}

import * as core from "@actions/core";
import { unlock } from "lib";

try {
  const gotLock = core.getState("got_lock");
  core.debug(`got_lock: ${gotLock}`);
  if (!core.getBooleanInput("post_unlock")) {
    core.info("unlock is disabled.");
  } else if (gotLock !== "true") {
    core.info("skip unlocking as it failed to get a lock.");
  } else {
    core.info("unlocking...");
    unlock();
  }
} catch (error) {
  core.setFailed(
    error instanceof Error ? error.message : JSON.stringify(error),
  );
}

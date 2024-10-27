import * as core from "@actions/core";
import { unlock } from "lib";

try {
  unlock();
} catch (error) {
  core.setFailed(
    error instanceof Error ? error.message : JSON.stringify(error),
  );
}

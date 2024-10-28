import * as core from "@actions/core";
import { unlock } from "./unlock";
import * as lib from "./lib";

export const post = async (input: lib.Input) => {
    const gotLock = core.getState("got_lock");
    core.debug(`got_lock: ${gotLock}`);
    if (!core.getBooleanInput("post_unlock")) {
        core.info("unlock is disabled.");
    } else if (gotLock !== "true") {
        core.info("skip unlocking as it failed to get a lock.");
    } else {
        core.info("unlocking...");
        input.mode = "unlock";
        unlock(input);
    }
};

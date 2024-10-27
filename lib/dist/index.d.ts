export declare const rootTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
type Input = {
    branch: string;
    historyBranchPrefix: string;
    branchPrefix: string;
    githubToken: string;
    owner: string;
    repo: string;
    message: string;
    disable_history: boolean;
};
export declare const updateHistoryBranch: (input: Input, msg: string) => Promise<any>;
export declare const getMsg: (input: Input) => string;
export declare const unlock: () => Promise<void>;
export {};

export declare const rootTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
type Input = {
    branch: string;
    historyBranchPrefix: string;
    githubToken: string;
    owner: string;
    repo: string;
    disable_history: boolean;
};
export declare const updateHistoryBranch: (input: Input, msg: string) => Promise<any>;
export {};

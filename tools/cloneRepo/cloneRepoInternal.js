import { $ } from "bun";
import simpleGit from "simple-git";
export const cloneRepo = async (url, requestId) => {
    console.log("cloning: ", url, requestId);
    const basePath = `./tmp/${requestId}`;
    const sourceCodePath = `${basePath}/__SOURCE_CODE__`;
    try {
        // Ensure the target directory exists
        await $ `mkdir -p ${basePath}`;
        // Initialize simple-git
        const git = simpleGit();
        // Clone the repository
        console.log(`Cloning ${url} to ${sourceCodePath}`);
        await git.clone(url, sourceCodePath);
        console.log(`Successfully cloned repository to ${sourceCodePath}`);
        return { success: true, path: basePath, sourceCodePath: sourceCodePath };
    }
    catch (error) {
        console.error('Git clone failed:', error);
        return {
            success: false,
            data: error instanceof Error ? error.message : "git_clone_fail"
        };
    }
};

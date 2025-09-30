import { $ } from "bun";
import simpleGit, { SimpleGit, CleanOptions } from "simple-git";
import path from "path";
import os from "os";

export const cloneRepo = async (url: string, requestId: string) => {
    console.log("cloning: ", url, requestId);
    const basePath = `./tmp/${requestId}`;
    const sourceCodePath = `${basePath}/__SOURCE_CODE__`;

    try {
        // Ensure the target directory exists
        await $`mkdir -p ${basePath}`;

        // Set up SSH configuration for git clone
        const sshKnownHosts = path.resolve(`${os.homedir()}/.ssh/known_hosts`);
        const sshKey = path.resolve(`${os.homedir()}/.ssh/id_ecdsa`);
        console.log("ls: ", await $`ls -l ${os.homedir()}/.ssh`.text());
        
        const GIT_SSH_COMMAND = `ssh -o UserKnownHostsFile=${sshKnownHosts} -o StrictHostKeyChecking=no -i ${sshKey}`;

        console.log(`Source directory: ${sourceCodePath}`);

        // Initialize simple-git with SSH configuration
        const git: SimpleGit = simpleGit()
            .env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)
            .clean(CleanOptions.FORCE);

        // Clone the repository
        console.log(`Cloning ${url} to ${sourceCodePath}`);
        
        await git.clone(url, sourceCodePath)
            .then(() => console.log('Repository cloned successfully'))
            .catch((err) => {
                console.error('Git clone failed: ', err);
                throw err;
            });

        console.log(`Successfully cloned repository to ${sourceCodePath}`);
        return { success: true, path: basePath, sourceCodePath: sourceCodePath };

    } catch (error) {
        console.error('Git clone failed:', error);
        return { 
            success: false, 
            data: error instanceof Error ? error.message : "git_clone_fail" 
        };
    }
};
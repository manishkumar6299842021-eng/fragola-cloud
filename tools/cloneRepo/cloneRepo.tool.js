import { tool } from "../types";
import z from "zod";
import { toolFailure, toolSuccess } from "../../fragolaCloud/FragolaCloud";
import { nanoid } from "nanoid";
import { cloneRepo } from "./cloneRepoInternal";
import { allIdToPath, TreeService } from "../../services/treeService";
const formatProjectStructure = (map, sliceLen) => {
    const projectEmpty = "(this project is empty)";
    let result = [];
    if (map.size == 0)
        return projectEmpty;
    for (const [key, value] of map) {
        result.push(`${key}:${value.slice(sliceLen)}`);
    }
    return result.join('\n');
};
export const cloneRepoTool = tool({
    name: "clone_github_repository",
    description: "will clone a github repository in the file system and return a repositoryId in case of success, on an error",
    schema: z.object({
        repo_url: z.string().describe("The github https url to clone")
    }),
    handler: async ({ repo_url }) => {
        const repositoryId = nanoid();
        const cloneResult = await cloneRepo(repo_url, repositoryId);
        if (!cloneResult.success || !cloneResult.sourceCodePath)
            return toolFailure({ message: cloneResult.data });
        if (allIdToPath.has(repositoryId))
            allIdToPath.delete(repositoryId);
        const idToPath = new Map();
        const tree = new TreeService(cloneResult.sourceCodePath, cloneResult.sourceCodePath, (id, path) => {
            idToPath.set(id, path);
        });
        await tree.list();
        allIdToPath.set(repositoryId, idToPath);
        const formatted = formatProjectStructure(idToPath, cloneResult.sourceCodePath.length - 1);
        return toolSuccess({
            instructions: "you can now read files by calling `read_file_by_id` by passing 'repositoryId' in the 'requestToken' field together with the tokenType 'github repository' and any file id present in the 'custom' field of the project sturcture",
            repositoryId,
            repositoryUrl: repo_url,
            projectSturcutre: formatted
        });
    }
});

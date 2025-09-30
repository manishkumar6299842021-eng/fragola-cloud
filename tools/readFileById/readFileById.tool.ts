import { tool } from "../types";
import z from "zod";
import { allIdToPath, TreeService } from "../../services/treeService";
import { toolFailure, toolSuccess } from "../../fragolaCloud";
import { $ } from "bun";

export const readFileById = tool({
    name: "read_file_by_id",
    description: "return the content of a file, a request token is required",
    schema: z.object({
        id: z.string().describe("the id of the file"),
        tokenType: z.enum(["github repository", "local file"]),
        requestToken: z.string().describe("the id to access this file, can be a repositoryId for example")
    }),
    handler: async (parameters) => {
        if (parameters.tokenType == "github repository") {
            const idToPath = allIdToPath.get(parameters.requestToken);
            if (!idToPath)
                return toolFailure({message:
                `The repository with id ${parameters.requestToken}
                no longer exist in the fileSystem, You may want to try again or clone the repository again if the error persist.`});
            
            const filePath = idToPath.get(parameters.id);
            if (!filePath)
                return toolFailure({message: `File with id ${parameters.id} not found in repository ${parameters.requestToken}`});
            
            try {
                const content = await $`cat ${filePath}`.text();
                return toolSuccess({
                    result: {
                        id: parameters.id,
                        path: filePath,
                        content: content
                    }
                });
            } catch (error) {
                return toolFailure({message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`});
            }
        }
        
        return toolFailure({message: `Token type ${parameters.tokenType} not implemented yet`});
    }
});
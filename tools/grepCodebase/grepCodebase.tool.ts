import { tool } from "../types";
import { z } from "zod";
import { toolFailure } from "../../fragolaCloud";
import { grepCodebaseInternal } from "./grepCodebaseInternal";
import { join } from "path";
import { allIdToPath } from "../../services/treeService";

export const grepCodeBaseSchema = z.object({
    content: z.string().describe("The text or pattern to search for in the codebase"),
    includeFile: z.string().describe("Optional glob pattern to include specific file types in the search").optional(),
    excludeFile: z.string().describe("Optional glob pattern to exclude specific file types from the search").optional(),
    tokenType: z.enum(["github repository", "local file"]),
    requestToken: z.string().describe("the id to access this file, can be a repositoryId for example")
});

export const grepCodebaseTool = tool({
    name: "grep_codebase",
    description: "A tool for searching the entire codebase for specific content. Use this when you need to find occurrences of a particular string, function name, or pattern across multiple files. It returns a list of items formatted as \"<file_id>:<match_count>\", allowing you to locate and quantify matches throughout the project.",
    schema: grepCodeBaseSchema,
    handler: (params) => {
        const { tokenType, requestToken } = params;

        if (tokenType == "github repository") {
            const sourceCodePath = join(process.env["PWD"]!, "tmp", requestToken, "__SOURCE_CODE__");
            const ripGrepresult = grepCodebaseInternal(sourceCodePath, params);
            console.log(`res: ${JSON.stringify(ripGrepresult)}, type: ${typeof ripGrepresult}`);
            if (Array.isArray(ripGrepresult)) {
                const idToPath = allIdToPath.get(requestToken);
                if (!idToPath)
                    return toolFailure({
                        message: `The repository with id ${requestToken}
                no longer exist in the fileSystem, You may want to try again or clone the repository again if the error persist.`});
                const formattedRipgrep = ripGrepresult.map((line) => {
                    const [relPath, match] = line.split(':');
                    if (!relPath || !match)
                        return undefined;
                    let fileId: string | undefined;
                    for (const [k, v] of idToPath) {
                        const vRelPath = v.slice((sourceCodePath.length - process.env["PWD"]!.length));
                        if (relPath.trim() == vRelPath.trim()) {
                            fileId = k;
                            break;
                        } else
                            console.log(`relPath: ${relPath}, vRelPath: ${vRelPath}`);
                    }
                    if (!fileId)
                        return undefined;
                    return `${fileId}:${relPath}:${match}`;

                }).filter(line => line != undefined);
                return (formattedRipgrep.length == 0 ? "The search ran successfully but found 0 match" : formattedRipgrep.join("\n"))

            } else
                return toolFailure({ message: "An internal error occured" })
        } else
            return toolFailure({ message: "Supported only for github repositories" })
    }
});

// export function grepCodebase(projectRoot: string, params: z.infer<typeof grepCodeBaseSchema>, postResult?: (result: string) => string): string {
//     const result = (() => {
//         const _result = grepCodebaseInternal(projectRoot, params);
//         if (typeof _result != "string") {
//             return "The search ran succesfully but resulted in 0 match";
//             // if (_result.code == 1)
//             //     return "";
//             // throw new ToolUnexpectedError(_result.message, "grepCodeBase", _result);
//         }
//         return _result;
//     })();
//     const message = (_result: string) => {
//         if (!_result.trim().length)
//             return "The search ran succesfully but resulted in 0 match";
//         return _result;
//     }
//     return postResult ? message(postResult(result)) : message(result);
// }
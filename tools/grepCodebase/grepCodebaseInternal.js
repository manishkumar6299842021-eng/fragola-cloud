import { spawnSync } from "child_process";
import path from "path";
// Function to escape shell special characters
function escapeShellCharacters(str) {
    // Characters that need escaping in shell: ! " # $ & ' ( ) * ; < = > ? [ \ ] ^ ` { | } ~
    // and space, tab, newline
    return str.replace(/[!"#$&'()*;<=>?[\\\]^`{|}~\s]/g, '\\$&');
}
export function grepCodebaseInternal(projectRoot, params) {
    const rgPath = "/usr/bin/rg";
    const { includeFile, excludeFile, content } = params;
    let stdout = "";
    let command = [rgPath, '--count', '--with-filename', '--ignore-case'];
    if (includeFile) {
        command.push('--glob', includeFile);
    }
    if (excludeFile) {
        command.push('--glob', `!${excludeFile}`);
    }
    // Add the search content as a separate argument with proper escaping
    const escapedContent = escapeShellCharacters(content);
    command.push(escapedContent, projectRoot);
    console.log('Original content:', content);
    console.log('Escaped content:', escapedContent);
    console.log('Full command:', command);
    try {
        // Use spawnSync with array of arguments to avoid shell escaping issues
        const result = spawnSync(rgPath, command.slice(1), {
            encoding: 'utf-8',
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        if (result.error) {
            throw result.error;
        }
        if (result.status !== 0) {
            const error = new Error(result.stderr || 'Command failed');
            error.code = result.status || 1;
            throw error;
        }
        stdout = result.stdout;
        // Format output to use relative paths from projectRoot
        const lines = stdout.split('\n').filter(line => line.trim());
        const formattedLines = lines.map(line => {
            const colonIndex = line.lastIndexOf(':');
            if (colonIndex !== -1) {
                const filePath = line.substring(0, colonIndex);
                const count = line.substring(colonIndex + 1);
                const relativePath = path.relative(projectRoot, filePath);
                return `${relativePath}:${count}`;
            }
            return line;
        });
        return formattedLines;
    }
    catch (e) {
        return e;
    }
}

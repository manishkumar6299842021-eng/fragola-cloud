import dirTree from 'directory-tree';
import { nanoid } from 'nanoid';
export const allIdToPath = new Map();
export class TreeService {
    cwd;
    workspaceRoot;
    onCustomIdAssignation;
    constructor(cwd = process.env.PWD, workspaceRoot, onCustomIdAssignation) {
        this.cwd = cwd;
        this.workspaceRoot = workspaceRoot;
        this.onCustomIdAssignation = onCustomIdAssignation;
    }
    setCwd(path) {
        this.cwd = path;
        return this;
    }
    async list() {
        const filteredTree = dirTree(this.cwd, { exclude: [/node_modules/, /\.git/], attributes: ['type'] }, (item) => {
            const id = nanoid();
            item.custom = { id, fullPath: item.path };
            this.onCustomIdAssignation && this.onCustomIdAssignation(id, item.path);
            item.path = item.path.slice(this.workspaceRoot.length);
        }, (dir) => {
            dir.path = dir.path.slice(this.workspaceRoot.length);
            dir.path = dir.path == "" ? "/" : dir.path;
        });
        return filteredTree;
    }
}

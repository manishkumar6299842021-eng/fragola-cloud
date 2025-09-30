import { toSnakeCase } from "../utils/stringUtils";
import { ZodError } from "zod";
import { StatusCode } from 'status-code-enum';
import { FragolaCloudError } from "./exceptions";
export const FragolaCloudDefaultOptions = {
    baseUrl: "/tools"
};
export const toolSuccess = (data) => ({ result: data, success: true });
export const toolFailure = (data) => ({ ...data, success: false });
export const asCloudTool = (tool) => {
    if (typeof tool.handler == 'string')
        throw new FragolaCloudError("tools with dynamic handlers may not be converted into cloud tools");
    return tool;
};
export class FragolaCloud {
    app;
    options;
    exposedTools = [];
    constructor(app, options = FragolaCloudDefaultOptions) {
        this.app = app;
        this.options = options;
    }
    createMiddleWare(tool) {
        return (req, res, next) => {
            try {
                if (tool.schema) {
                    console.log("!body: ", JSON.stringify(req.body));
                    tool.schema.parse(req.body);
                }
                next();
            }
            catch (e) {
                if (e instanceof ZodError) {
                    return res.status(StatusCode.ClientErrorBadRequest).json({
                        error: "FragolaCloud Error: tool parameters from incoming request failed zod validation",
                        data: e
                    });
                }
                next(e);
            }
        };
    }
    logExposedTools() {
        if (this.exposedTools.length === 0) {
            console.info('🔧 No tools exposed');
            return;
        }
        console.info('🔧 FragolaCloud Tools:');
        // Create a formatted table-like output similar to NestJS
        const maxRouteLength = Math.max(...this.exposedTools.map(tool => tool.route.length));
        const maxNameLength = Math.max(...this.exposedTools.map(tool => tool.tool.name.length));
        this.exposedTools.forEach((exposedTool, index) => {
            const { route, tool } = exposedTool;
            const paddedRoute = route.padEnd(maxRouteLength);
            const paddedName = tool.name.padEnd(maxNameLength);
            const method = 'POST';
            // Format similar to NestJS: POST /tools/tool_name -> ToolName
            const logMessage = `   ${method} ${paddedRoute} -> ${paddedName}`;
            if (tool.description) {
                console.info(`${logMessage} (${tool.description})`);
            }
            else {
                console.info(logMessage);
            }
        });
        console.info(`🚀 Total exposed tools: ${this.exposedTools.length}`);
    }
    exposeTool(tool) {
        const snakeCaseName = toSnakeCase(tool.name);
        const route = `${this.options.baseUrl}/${snakeCaseName}`;
        const exist = this.exposedTools.find(e => e.route == route);
        if (exist)
            throw new FragolaCloudError(`tool already exposed: ${route}`);
        const validate = this.createMiddleWare(tool);
        this.app.post(route, validate, async (req, res) => {
            try {
                const toolResult = await tool.handler(req.body, undefined);
                // Return the actual tool result
                res.json(toolResult);
            }
            catch (e) {
                console.error(`Error executing tool ${tool.name}:`, e);
                res.status(StatusCode.ServerErrorInternal).json({
                    success: false,
                    error: `Tool ${tool.name} execution failed`,
                    message: e instanceof Error ? e.message : 'Unknown error occurred'
                });
            }
        });
        this.exposedTools.push({
            route,
            tool
        });
    }
}

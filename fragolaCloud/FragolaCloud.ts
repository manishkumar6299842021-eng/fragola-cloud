import express from "express";
import { Tool, ToolHandlerReturnTypeNonAsync } from "@fragola-ai/agentic";
import { toSnakeCase } from "../utils/stringUtils";
import type { Request, Response, NextFunction } from "express";
import z, { ZodError } from "zod";
import { StatusCode } from 'status-code-enum'
import { AgentContext } from "@fragola-ai/agentic/agent";
import { FragolaCloudError } from "./exceptions";

export interface FragolaCloudOptions {
    baseUrl?: string,
}

export const FragolaCloudDefaultOptions: FragolaCloudOptions = {
    baseUrl: "/tools"
}

export type CloudToolSuccess = {
    success: true,
    result: ToolHandlerReturnTypeNonAsync   
}
export const toolSuccess = (data: ToolHandlerReturnTypeNonAsync) => ({result: data, success: true});

export type CloudToolFailure = {
    success: false,
    error?: string,
    message?: string
}
export const toolFailure = (data: Omit<CloudToolFailure, "success">) => ({...data, success: false});
export type CloudToolResult = CloudToolSuccess | CloudToolFailure;

export type ExposedTool = {
    route: string,
    tool: Omit<Tool<any>, "handler">
}

export type CloudTool = Omit<Tool, "handler"> & { handler: ((parameters: z.infer<any>, context: AgentContext<any, any>) => CloudToolResult) };
export const asCloudTool = (tool: Tool<any>) => {
    if (typeof tool.handler == 'string')
        throw new FragolaCloudError("tools with dynamic handlers may not be converted into cloud tools");
    return tool as unknown as CloudTool;
}

export class FragolaCloud {
    private exposedTools: ExposedTool[] = [];
    constructor(private app: ReturnType<typeof express>, private options: FragolaCloudOptions = FragolaCloudDefaultOptions) {

    }
    private createMiddleWare(tool: Tool<any>): (req: Request, res: Response, next: NextFunction) => void {
        return (req: Request, res: Response, next: NextFunction) => {
            try {
                if (tool.schema) {
                    console.log("!body: ", JSON.stringify(req.body));
                    tool.schema.parse(req.body);
                }
                next();
            } catch (e) {
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
            } else {
                console.info(logMessage);
            }
        });
        
        console.info(`🚀 Total exposed tools: ${this.exposedTools.length}`);
    }

    exposeTool(tool: CloudTool) {
        const snakeCaseName = toSnakeCase(tool.name);
        const route: string = `${this.options.baseUrl}/${snakeCaseName}`;
        const exist = this.exposedTools.find(e => e.route == route);
    
        if (exist)
            throw new FragolaCloudError(`tool already exposed: ${route}`);

        const validate = this.createMiddleWare(tool);

        this.app.post(route, validate, async (req: Request, res: Response) => {
            try {
                const toolResult = await tool.handler(req.body as z.infer<typeof tool.schema>, undefined as any);
                // Return the actual tool result
                res.json(toolResult)
            } catch (e) {
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
        })
    }

}
import z from "zod";

export type ToolHandlerReturnTypeNonAsync = any[] | Record<any, any> | Function | number | bigint | boolean | string;
export type ToolHandlerReturnType = ToolHandlerReturnTypeNonAsync | Promise<ToolHandlerReturnTypeNonAsync>;

export interface Tool<T extends z.ZodType<any, any> = any> {
    /**
     * The name of the tool.
     */
    name: string;
    /**
     * A detailed description of the tool's purpose.
     */
    description: string;
    /**
     * The function that handles the tool's logic, or the string "dynamic" for dynamic handlers.
     */
    handler: ((parameters: z.infer<T>) => ToolHandlerReturnType) | "dynamic";
    /**
     * The Zod schema that validates the parameters for the tool.
     */
    schema?: T;
}

export const tool = <T extends z.ZodType<any, any>>(params: Tool<T>) => params;
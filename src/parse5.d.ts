declare module "parse5" {
    export interface ElementLocation {
        startOffset: number;
        endOffset: number;
        startLine?: number;
        startCol?: number;
        endLine?: number;
        endCol?: number;
        attrs?: Record<string, ElementLocation>;
        [key: string]: unknown;
    }
}

import { z } from 'zod';
export declare const CaptureOptionsResultSchema: z.ZodObject<{
    trace: z.ZodBoolean;
    video: z.ZodBoolean;
    har: z.ZodBoolean;
    console: z.ZodBoolean;
    stepScreenshot: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    trace: boolean;
    video: boolean;
    har: boolean;
    console: boolean;
    stepScreenshot: boolean;
}, {
    trace: boolean;
    video: boolean;
    har: boolean;
    console: boolean;
    stepScreenshot: boolean;
}>;
export declare const StepArtifactsSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const SessionStepResultSchema: z.ZodObject<{
    index: z.ZodNumber;
    name: z.ZodString;
    startedAt: z.ZodString;
    endedAt: z.ZodNullable<z.ZodString>;
    success: z.ZodNullable<z.ZodBoolean>;
    error: z.ZodNullable<z.ZodString>;
    dir: z.ZodString;
    artifacts: z.ZodRecord<z.ZodString, z.ZodString>;
    actionCount: z.ZodOptional<z.ZodNumber>;
    exportedScript: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    dir: string;
    error: string | null;
    index: number;
    startedAt: string;
    endedAt: string | null;
    success: boolean | null;
    artifacts: Record<string, string>;
    actionCount?: number | undefined;
    exportedScript?: string | undefined;
}, {
    name: string;
    dir: string;
    error: string | null;
    index: number;
    startedAt: string;
    endedAt: string | null;
    success: boolean | null;
    artifacts: Record<string, string>;
    actionCount?: number | undefined;
    exportedScript?: string | undefined;
}>;
export declare const SessionResultsSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["open", "closed", "aborted"]>;
    browser: z.ZodNullable<z.ZodString>;
    startedAt: z.ZodString;
    endedAt: z.ZodNullable<z.ZodString>;
    capture: z.ZodObject<{
        trace: z.ZodBoolean;
        video: z.ZodBoolean;
        har: z.ZodBoolean;
        console: z.ZodBoolean;
        stepScreenshot: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    }, {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    }>;
    steps: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        name: z.ZodString;
        startedAt: z.ZodString;
        endedAt: z.ZodNullable<z.ZodString>;
        success: z.ZodNullable<z.ZodBoolean>;
        error: z.ZodNullable<z.ZodString>;
        dir: z.ZodString;
        artifacts: z.ZodRecord<z.ZodString, z.ZodString>;
        actionCount: z.ZodOptional<z.ZodNumber>;
        exportedScript: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }, {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    browser: string | null;
    name: string | null;
    id: string;
    status: "aborted" | "open" | "closed";
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    };
    startedAt: string;
    endedAt: string | null;
    steps: {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }[];
}, {
    browser: string | null;
    name: string | null;
    id: string;
    status: "aborted" | "open" | "closed";
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    };
    startedAt: string;
    endedAt: string | null;
    steps: {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }[];
}>;
export declare function parseSessionResults(value: any): {
    browser: string | null;
    name: string | null;
    id: string;
    status: "aborted" | "open" | "closed";
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    };
    startedAt: string;
    endedAt: string | null;
    steps: {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }[];
};
export declare function validateSessionResults(value: any): z.SafeParseReturnType<{
    browser: string | null;
    name: string | null;
    id: string;
    status: "aborted" | "open" | "closed";
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    };
    startedAt: string;
    endedAt: string | null;
    steps: {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }[];
}, {
    browser: string | null;
    name: string | null;
    id: string;
    status: "aborted" | "open" | "closed";
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    };
    startedAt: string;
    endedAt: string | null;
    steps: {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }[];
}>;
//# sourceMappingURL=results-schema.d.ts.map
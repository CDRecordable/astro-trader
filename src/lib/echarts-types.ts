// ============================================================
// Minimal ECharts helper types — replaces `any` at chart boundaries
// ============================================================
// ECharts callback params and option objects are dynamically shaped;
// these loose-but-named types keep the linter happy without pulling in
// the full echarts type surface.

/** A single series/axis param passed to an ECharts tooltip/label formatter. */
export interface EChartParam {
    axisValue?: string;
    value?: number | string | unknown;
    color?: string;
    seriesName?: string;
    name?: string;
    marker?: string;
    data?: unknown;
    dataIndex?: number;
    seriesIndex?: number;
    componentType?: string;
}

/** A loosely-typed ECharts option/config object (series entry, markArea, etc.). */
export type EChartObj = Record<string, unknown>;

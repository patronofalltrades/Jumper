// The colors of Compare views (issue #202). Each connection of the map has one color, the same in the drawing, on the
// 3D board and on the photo markers. No color here is a button color, a wire swatch (red, black, blue, yellow, green),
// a rail color (red, blue) or the selection color (--probe, amber).

/** The color of each connection, in the order of the map. */
export const CONNECTION_COLORS = ["#0891b2", "#7c3aed", "#ea580c", "#8b5a2b", "#64748b"] as const;

/** The wire that is off from the reference. Nothing else on the screen uses this magenta. */
export const OFF_COLOR = "#ff1fce";

/** The color of a connection by its index in the map. */
export const connectionColor = (index: number) => CONNECTION_COLORS[index % CONNECTION_COLORS.length];

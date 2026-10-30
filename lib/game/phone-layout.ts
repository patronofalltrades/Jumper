/**
 * Whether a side panel (the task list, the connection list) starts open (issue #126).
 * A laptop opens it. A phone starts it closed, as a chip. The code panel closes it too, so the board stays in view.
 */
export function panelStartsOpen(laptop: boolean, codeOpen: boolean): boolean {
  return laptop && !codeOpen;
}

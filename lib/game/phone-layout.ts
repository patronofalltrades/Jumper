/**
 * Whether the connection list starts open (issue #126). A laptop opens it. A phone starts it closed, as a chip. The
 * code panel closes it too, so the board stays in view. The task list always starts closed (issue #218).
 */
export function panelStartsOpen(laptop: boolean, codeOpen: boolean): boolean {
  return laptop && !codeOpen;
}

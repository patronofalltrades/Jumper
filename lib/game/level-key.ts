/** The key of an open level in the board store. It has the user, so a second user on the same tab gets their own board. */
export const levelKey = (user: string, project: string, position: number) => `${user}:${project}/${position}`;

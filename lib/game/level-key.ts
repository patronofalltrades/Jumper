/** The key of an open level in the board store. It has the user, so a second user on the same tab gets their own board. */
export const levelKey = (user: string, project: string, position: number) => `${user}:${project}/${position}`;

/** The key of a level's saved board in this browser (localStorage). The format is fixed: boards that are saved already use it. */
export const saveKey = (user: string, project: string, position: number) => `jumper:${levelKey(user, project, position)}`;

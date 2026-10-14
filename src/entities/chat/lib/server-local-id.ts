/** The `localId` of a message GREEN-API told us about. A message sent from here keeps its own uuid. */
export const toServerLocalId = (idMessage: string) => `srv-${idMessage}`;

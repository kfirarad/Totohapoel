import { createContext, useContext } from 'react';

/** Set by g/[groupId]/_layout; native tab switches don't carry the parent's route params. */
export const GroupIdContext = createContext('');
export const useGroupId = () => useContext(GroupIdContext);

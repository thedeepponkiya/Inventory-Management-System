import { createContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

// Split out from AppContext.tsx so that file can export only the Provider component -
// exporting a non-component (this context object) alongside a component breaks React
// Fast Refresh, forcing a full page reload on every edit instead of a hot swap.
export const AppContext = createContext<any>(DEFAULT_DATA_TYPE_VALUE.NULL);

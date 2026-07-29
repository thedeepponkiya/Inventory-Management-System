import * as React from 'react';
import { createContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

export const AppContext = createContext<any>(DEFAULT_DATA_TYPE_VALUE.NULL);

const AppContextProvider = (props: any) => {
    const [isSidePanelOpen, setIsSidePanelOpen] = React.useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    return (
        <>
            <AppContext.Provider
                value={{
                    setIsSidePanelOpen,
                    isSidePanelOpen,
                }}>
                {props.children}
            </AppContext.Provider >
        </>
    )
};
export default AppContextProvider;
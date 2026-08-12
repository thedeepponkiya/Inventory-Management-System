import { Dialog } from 'primereact/dialog';
import VisibilitySettingsPanel from './VisibilitySettingsPanel';
import './VisibilitySettingsDialog.css';

interface VisibilitySettingsDialogProps {
    visible: boolean;
    onHide: () => void;
    // Called after a successful save so the caller can refetch AppContext's uiVisibility -
    // otherwise the sidebar/FilterBar on the current page wouldn't reflect the change until
    // a full reload.
    onSaved?: () => void;
}

// Thin modal wrapper around VisibilitySettingsPanel (used by SettingsDialog's "Manage
// Visibility" button) - Developer Admin renders VisibilitySettingsPanel directly inline
// instead, with no dialog at all. `{visible && ...}` unmounts the panel while hidden so its
// mount effect (data fetch) reruns fresh every time the dialog is reopened.
const VisibilitySettingsDialog = ({ visible, onHide, onSaved }: VisibilitySettingsDialogProps) => (
    <Dialog
        visible={visible}
        onHide={onHide}
        showHeader={false}
        className="visibility-settings-dialog"
        style={{ width: '640px', maxWidth: '95vw' }}
    >
        {visible && <VisibilitySettingsPanel onCancel={onHide} onSaved={() => { onSaved?.(); onHide(); }} />}
    </Dialog>
);
export default VisibilitySettingsDialog;

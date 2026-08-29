import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import {
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineCheckBadge,
    HiOutlineCloudArrowDown,
    HiOutlinePlusCircle,
    HiOutlineArrowsRightLeft,
    HiOutlineTrash,
    HiOutlineSquare3Stack3D,
    HiOutlineShieldCheck,
    HiOutlineLockOpen,
} from 'react-icons/hi2';
import DialogHeader from '../dialogHeader/DialogHeader';
import { previewDatabaseUpdate, updateDatabase, type PendingSchemaChanges } from '../../../services/databaseUpdateService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { showToast } from '../../commonFunctions/commonFunction';
import './DatabaseUpdatePanel.css';

const CONFIRM_PHRASE = 'UPDATE';

const steps = [
    { label: 'Backup first', detail: 'A full database backup is taken before anything else runs.', icon: HiOutlineCloudArrowDown },
    { label: 'Apply schema changes', detail: 'Only new tables/columns are added - nothing existing is deleted or overwritten.', icon: HiOutlineSquare3Stack3D },
];

function countChanges(changes: PendingSchemaChanges): number {
    return changes.newTables.length + changes.droppedTables.length + changes.newColumns.length + changes.removedColumns.length
        + changes.nullableColumns.length + changes.renamedColumns.length + changes.newIndexes.length;
}

// Inline Developer Admin section (rendered directly, no dialog wrapper - matches
// DatabaseResetPanel's "direct access" convention). Deliberately has no Save/Cancel wiring
// into the page's common toolbar - there's nothing to "save" here, only a single action gated
// behind its own explicit confirm step, same reasoning as DatabaseResetPanel.
const DatabaseUpdatePanel = () => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [confirmOpen, setConfirmOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [confirmText, setConfirmText] = useState('');
    const [updating, setUpdating] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [loadingPreview, setLoadingPreview] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [preview, setPreview] = useState<PendingSchemaChanges | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [previewError, setPreviewError] = useState<string | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    const closeDialog = () => {
        if (updating) return;
        setConfirmOpen(DEFAULT_DATA_TYPE_VALUE.FALSE);
        setConfirmText('');
        setPreview(DEFAULT_DATA_TYPE_VALUE.NULL);
        setPreviewError(DEFAULT_DATA_TYPE_VALUE.NULL);
    };

    // Fetches the pending-changes list BEFORE the dialog's confirm step is even shown, so the
    // admin sees exactly what will happen (which tables/columns are missing on this database)
    // instead of confirming blind.
    const openDialog = async () => {
        setConfirmOpen(DEFAULT_DATA_TYPE_VALUE.TRUE);
        setLoadingPreview(DEFAULT_DATA_TYPE_VALUE.TRUE);
        setPreviewError(DEFAULT_DATA_TYPE_VALUE.NULL);
        try {
            setPreview(await previewDatabaseUpdate());
        } catch (err) {
            setPreviewError(err instanceof Error ? err.message : 'Failed to load the pending changes preview');
        } finally {
            setLoadingPreview(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const handleConfirmUpdate = async () => {
        setUpdating(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            const result = await updateDatabase();
            showToast(toast, 'success', 'Database updated', `Backed up as ${result.backupFile}, then updated successfully.`);
            closeDialog();
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to update database');
        } finally {
            setUpdating(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const changeCount = preview ? countChanges(preview) : 0;

    return (
        <div className="database-update-panel">
            <Toast ref={toast} />

            <div className="database-update-header">
                <h2>Database Update</h2>
                <p>Apply the latest schema changes to the live database - safely, with an automatic backup first.</p>
            </div>

            <div className="database-update-info">
                <HiOutlineShieldCheck size={22} className="database-update-info-icon" />
                <div>
                    <strong>This action never deletes or changes existing data.</strong>
                    <p>It only adds tables/columns that don&apos;t exist yet (or relaxes a column that no longer needs a value) on this database - already-present data is left exactly as it is.</p>
                </div>
            </div>

            <div className="database-update-steps">
                {steps.map((step, index) => (
                    <div className="database-update-step" key={step.label}>
                        <span className="database-update-step-number">{index + 1}</span>
                        <span className="database-update-badge">
                            <step.icon size={18} />
                        </span>
                        <div className="database-update-step-text">
                            <span className="database-update-step-label">{step.label}</span>
                            <span className="database-update-step-detail">{step.detail}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="database-update-action">
                <Button
                    label="Update Database"
                    icon={<HiOutlineArrowPath className="mr-2" />}
                    onClick={openDialog}
                />
            </div>

            <Dialog
                header={<DialogHeader icon={HiOutlineArrowPath} title="Confirm Database Update" />}
                visible={confirmOpen}
                onHide={closeDialog}
                style={{ width: '540px' }}
                breakpoints={{ '640px': '95vw' }}
                closable={!updating}
                closeOnEscape={!updating}
            >
                {loadingPreview ? (
                    <div className="database-update-preview-loading">
                        <ProgressSpinner style={{ width: '32px', height: '32px' }} strokeWidth="4" />
                        <span>Checking what has changed...</span>
                    </div>
                ) : previewError ? (
                    <p className="database-update-dialog-text database-update-preview-error">{previewError}</p>
                ) : preview && changeCount === 0 ? (
                    <div className="database-update-preview-empty">
                        <HiOutlineCheckBadge size={28} />
                        <p>Your database is already up to date - there is nothing to change.</p>
                    </div>
                ) : preview ? (
                    <>
                        <p className="database-update-dialog-text">
                            This database update will make the following changes:
                        </p>
                        <div className="database-update-preview-list">
                            {preview.newTables.map((table) => (
                                <div className="database-update-preview-item" key={`table-${table}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--add"><HiOutlinePlusCircle size={16} /></span>
                                    <span>New table <strong>{table}</strong></span>
                                </div>
                            ))}
                            {preview.newColumns.map(({ table, column }) => (
                                <div className="database-update-preview-item" key={`col-${table}-${column}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--add"><HiOutlinePlusCircle size={16} /></span>
                                    <span>New column <strong>{table}.{column}</strong></span>
                                </div>
                            ))}
                            {preview.renamedColumns.map(({ table, fromColumn, toColumn }) => (
                                <div className="database-update-preview-item" key={`ren-${table}-${fromColumn}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--rename"><HiOutlineArrowsRightLeft size={16} /></span>
                                    <span>Rename <strong>{table}.{fromColumn}</strong> to <strong>{toColumn}</strong> (data kept)</span>
                                </div>
                            ))}
                            {preview.newIndexes.map(({ indexName, table }) => (
                                <div className="database-update-preview-item" key={`idx-${indexName}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--add"><HiOutlinePlusCircle size={16} /></span>
                                    <span>New index <strong>{indexName}</strong> on {table}</span>
                                </div>
                            ))}
                            {preview.nullableColumns.map(({ table, column }) => (
                                <div className="database-update-preview-item" key={`nullable-${table}-${column}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--add"><HiOutlineLockOpen size={16} /></span>
                                    <span><strong>{table}.{column}</strong> no longer requires a value (existing values kept)</span>
                                </div>
                            ))}
                            {preview.removedColumns.map(({ table, column }) => (
                                <div className="database-update-preview-item database-update-preview-item--risky" key={`drop-${table}-${column}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--drop"><HiOutlineTrash size={16} /></span>
                                    <span>Remove column <strong>{table}.{column}</strong> - any data in it will be lost</span>
                                </div>
                            ))}
                            {preview.droppedTables.map((table) => (
                                <div className="database-update-preview-item database-update-preview-item--risky" key={`drop-table-${table}`}>
                                    <span className="database-update-preview-icon database-update-preview-icon--drop"><HiOutlineTrash size={16} /></span>
                                    <span>Remove table <strong>{table}</strong> - all its data will be lost</span>
                                </div>
                            ))}
                        </div>
                        <p className="database-update-dialog-text">
                            Type <strong>{CONFIRM_PHRASE}</strong> below to confirm.
                        </p>
                        <InputText
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={CONFIRM_PHRASE}
                            className="database-update-dialog-input"
                            disabled={updating}
                            autoFocus
                        />
                    </>
                ) : null}
                <div className="database-update-dialog-actions">
                    <Button label={preview && changeCount === 0 ? 'Close' : 'Cancel'} outlined onClick={closeDialog} disabled={updating} />
                    {(!preview || changeCount > 0) && !previewError && (
                        <Button
                            label={updating ? 'Updating...' : 'Confirm Update'}
                            icon={<HiOutlineCheckCircle className="mr-2" />}
                            onClick={handleConfirmUpdate}
                            disabled={loadingPreview || confirmText !== CONFIRM_PHRASE || updating}
                            loading={updating}
                        />
                    )}
                </div>
            </Dialog>
        </div>
    );
};

export default DatabaseUpdatePanel;

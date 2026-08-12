import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlinePlus } from 'react-icons/hi2';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { useStagesQuery, useCreateStage, useUpdateStage, useDeleteStage } from '../hooks/useStagesQuery';
import StageFormDialog from '../components/StageFormDialog';
import StageReorderList from '../components/StageReorderList';
import MetaIntegrationPanel from '../components/MetaIntegrationPanel';
import type { CrmStage, CrmStagePayload } from '../types/stage.types';
import './CrmSettingsPage.css';

const CrmSettingsPage = () => {
    const toast = useRef<Toast>(null);
    const { data: stages = [], isLoading } = useStagesQuery();
    const createStage = useCreateStage();
    const updateStage = useUpdateStage();
    const deleteStage = useDeleteStage();

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<CrmStage | null>(null);

    const openAddDialog = () => {
        setEditing(null);
        setDialogVisible(true);
    };

    const openEditDialog = (stage: CrmStage) => {
        setEditing(stage);
        setDialogVisible(true);
    };

    const handleSave = (payload: Partial<CrmStagePayload>) => {
        if (editing) {
            updateStage.mutate(
                { id: editing.id, payload },
                {
                    onSuccess: () => {
                        showToast(toast, 'success', 'Updated', 'Stage updated successfully');
                        setDialogVisible(false);
                    },
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                },
            );
        } else {
            createStage.mutate(payload, {
                onSuccess: () => {
                    showToast(toast, 'success', 'Created', 'Stage created successfully');
                    setDialogVisible(false);
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            });
        }
    };

    const handleDelete = (stage: CrmStage) => {
        confirmDialog({
            message: `Delete stage "${stage.name}"? This cannot be undone.`,
            header: 'Delete Stage',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                deleteStage.mutate(stage.id, {
                    onSuccess: () => showToast(toast, 'success', 'Deleted', 'Stage deleted successfully'),
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                });
            },
        });
    };

    const swapSortOrder = (a: CrmStage, b: CrmStage) => {
        updateStage.mutate({ id: a.id, payload: { sortOrder: b.sortOrder } });
        updateStage.mutate({ id: b.id, payload: { sortOrder: a.sortOrder } });
    };

    const handleMoveUp = (stage: CrmStage) => {
        const index = stages.findIndex((s) => s.id === stage.id);
        if (index <= 0) return;
        swapSortOrder(stage, stages[index - 1]);
    };

    const handleMoveDown = (stage: CrmStage) => {
        const index = stages.findIndex((s) => s.id === stage.id);
        if (index === -1 || index >= stages.length - 1) return;
        swapSortOrder(stage, stages[index + 1]);
    };

    const nextSortOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.sortOrder)) + 1 : 0;

    return (
        <div className="crm-settings-page">
            <Toast ref={toast} />
            <div className="crm-settings-section">
                <div className="crm-settings-section-header">
                    <h2>Pipeline Stages</h2>
                    <Button label="Add Stage" icon={<HiOutlinePlus className="mr-2" />} onClick={openAddDialog} outlined />
                </div>
                {isLoading ? (
                    <div className="crm-settings-empty">Loading stages...</div>
                ) : (
                    <StageReorderList stages={stages} onEdit={openEditDialog} onDelete={handleDelete} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} />
                )}
            </div>
            <StageFormDialog visible={dialogVisible} editing={editing} nextSortOrder={nextSortOrder} onHide={() => setDialogVisible(false)} onSave={handleSave} />
            <MetaIntegrationPanel />
        </div>
    );
};
export default CrmSettingsPage;

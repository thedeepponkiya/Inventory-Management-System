import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineArrowPath } from 'react-icons/hi2';
import { showToast } from '../../../common/commonFunctions/commonFunction';
import { formatDate } from '../../../common/commonFunctions/dateFormat';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import {
    useMetaStatusQuery,
    useConnectMeta,
    useDisconnectMeta,
    useSyncMetaLeads,
    useSyncMetaCampaigns,
} from '../hooks/useMetaIntegrationQuery';
import './MetaIntegrationPanel.css';

const emptyForm = { pageAccessToken: '', pageId: '', adAccountId: '' };

const MetaIntegrationPanel = () => {
    const toast = useRef<Toast>(null);
    const { dateFormat } = useDateFormatContext();
    const { data: connection, isLoading } = useMetaStatusQuery();
    const connectMeta = useConnectMeta();
    const disconnectMeta = useDisconnectMeta();
    const syncLeads = useSyncMetaLeads();
    const syncCampaigns = useSyncMetaCampaigns();

    const [form, setForm] = useState(emptyForm);

    // Date.now() is impure, so it's read once via this lazy initializer (React's documented
    // escape hatch for one-time impure setup, same rationale as useState(() => new Date()))
    // rather than called directly during render - a snapshot taken at mount is precise enough
    // for a "expires within 7 days" warning banner.
    const [nowSnapshot] = useState(() => Date.now());
    const expiringSoon = connection?.tokenExpiresAt
        ? new Date(connection.tokenExpiresAt).getTime() - nowSnapshot < 7 * 24 * 60 * 60 * 1000
        : false;

    const handleConnect = () => {
        if (!form.pageAccessToken || !form.pageId) {
            showToast(toast, 'error', 'Error', 'Page Access Token and Page ID are required');
            return;
        }
        connectMeta.mutate(
            { pageAccessToken: form.pageAccessToken, pageId: form.pageId, adAccountId: form.adAccountId || undefined },
            {
                onSuccess: () => {
                    showToast(toast, 'success', 'Connected', 'Meta account connected successfully');
                    setForm(emptyForm);
                },
                onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
            },
        );
    };

    const handleDisconnect = () => {
        confirmDialog({
            message: 'Disconnect this Meta account? Lead and campaign syncing will stop until reconnected.',
            header: 'Disconnect Meta Account',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                disconnectMeta.mutate(undefined, {
                    onSuccess: () => showToast(toast, 'success', 'Disconnected', 'Meta account disconnected'),
                    onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
                });
            },
        });
    };

    const handleSyncLeads = () => {
        syncLeads.mutate(undefined, {
            onSuccess: (summary) => showToast(toast, 'success', 'Synced', `${summary.created} new lead(s) imported${summary.errors.length ? `, ${summary.errors.length} error(s)` : ''}`),
            onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
        });
    };

    const handleSyncCampaigns = () => {
        syncCampaigns.mutate(undefined, {
            onSuccess: (summary) => showToast(toast, 'success', 'Synced', `${(summary.created ?? 0) + (summary.updated ?? 0)} campaign(s) synced${summary.errors.length ? `, ${summary.errors.length} error(s)` : ''}`),
            onError: (err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Something went wrong'),
        });
    };

    if (isLoading) {
        return (
            <div className="crm-settings-section">
                <div className="crm-settings-section-header"><h2>Meta Integration</h2></div>
                <div className="crm-settings-empty">Loading...</div>
            </div>
        );
    }

    return (
        <div className="crm-settings-section">
            <Toast ref={toast} />
            <div className="crm-settings-section-header">
                <h2>Meta Integration</h2>
            </div>

            {!connection ? (
                <div className="meta-integration-form">
                    <p className="meta-integration-help">
                        Connect a Facebook Page to automatically import leads from its Lead Ads forms, and (optionally) an
                        Ad Account to pull in campaign spend/performance. Generate a long-lived Page Access Token via Meta's
                        Graph API Explorer or Business Settings, then paste it below.
                    </p>
                    <div className="meta-integration-field">
                        <label>Page Access Token *</label>
                        <Password
                            value={form.pageAccessToken}
                            onChange={(e) => setForm({ ...form, pageAccessToken: e.target.value })}
                            placeholder="Paste your long-lived Page Access Token"
                            toggleMask
                            feedback={false}
                        />
                    </div>
                    <div className="meta-integration-row">
                        <div className="meta-integration-field">
                            <label>Page ID *</label>
                            <InputText value={form.pageId} onChange={(e) => setForm({ ...form, pageId: e.target.value })} placeholder="e.g. 123456789012345" />
                        </div>
                        <div className="meta-integration-field">
                            <label>Ad Account ID (optional)</label>
                            <InputText value={form.adAccountId} onChange={(e) => setForm({ ...form, adAccountId: e.target.value })} placeholder="e.g. act_123456789012345" />
                        </div>
                    </div>
                    <Button
                        label={connectMeta.isPending ? 'Connecting...' : 'Connect'}
                        icon={<HiOutlineCheckCircle className="mr-2" />}
                        onClick={handleConnect}
                        disabled={connectMeta.isPending}
                    />
                </div>
            ) : (
                <div className="meta-integration-connected">
                    <div className="meta-integration-summary">
                        <div className="meta-integration-summary-row">
                            <span>Page</span>
                            <span>{connection.pageName ?? connection.pageId}</span>
                        </div>
                        <div className="meta-integration-summary-row">
                            <span>Ad Account</span>
                            <span>{connection.adAccountName ?? connection.adAccountId ?? 'Not connected'}</span>
                        </div>
                        <div className="meta-integration-summary-row">
                            <span>Last Lead Sync</span>
                            <span>{connection.lastLeadSyncAt ? formatDate(connection.lastLeadSyncAt, dateFormat) : 'Never'}</span>
                        </div>
                        <div className="meta-integration-summary-row">
                            <span>Last Campaign Sync</span>
                            <span>{connection.lastCampaignSyncAt ? formatDate(connection.lastCampaignSyncAt, dateFormat) : 'Never'}</span>
                        </div>
                    </div>

                    {expiringSoon && (
                        <div className="meta-integration-warning">
                            <HiOutlineExclamationTriangle size={16} />
                            <span>This Page Access Token expires soon on {formatDate(connection.tokenExpiresAt, dateFormat)} - reconnect with a fresh token before then to avoid sync failures.</span>
                        </div>
                    )}

                    <div className="meta-integration-actions">
                        <Button
                            label="Sync Leads Now"
                            icon={<HiOutlineArrowPath className="mr-2" />}
                            onClick={handleSyncLeads}
                            outlined
                            disabled={syncLeads.isPending}
                        />
                        <Button
                            label="Sync Campaigns Now"
                            icon={<HiOutlineArrowPath className="mr-2" />}
                            onClick={handleSyncCampaigns}
                            outlined
                            disabled={syncCampaigns.isPending || !connection.adAccountId}
                        />
                        <Button label="Disconnect" severity="danger" text onClick={handleDisconnect} />
                    </div>
                </div>
            )}
        </div>
    );
};
export default MetaIntegrationPanel;

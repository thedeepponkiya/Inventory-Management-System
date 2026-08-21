import { Avatar } from 'primereact/avatar';
import { resolveImageUrl } from '../../../common/commonFunctions/commonFunction';
import { getColorForString, getInitials } from '../utils/cardStyle';
import type { CrmAssignableUser } from '../types/user.types';
import './AssigneeAvatar.css';

interface AssigneeAvatarProps {
    // Matched by user id (a real FK, unlike the ERP side's name-only "Created By" snapshots -
    // see CommonUtilities.tsx's UserAvatarBodyOptions comment for why that one has to fall
    // back to name-matching) - reliable even if the assignee is later renamed.
    userId: string | number | null | undefined;
    // Display name shown next to the avatar - passed separately (not re-derived from `users`)
    // since callers already have it precomputed (e.g. FollowupRow's assignedToName).
    name: string;
    users: CrmAssignableUser[];
}

// Shared "Assigned To" avatar cell for CRM's Leads/Follow-ups tables and the Lead Detail
// drawer's Assigned To dropdown - shows the real uploaded profile photo when the assignee has
// one, falling back to colored initials (same deterministic color as everywhere else in CRM,
// via getColorForString) when they don't.
const AssigneeAvatar = ({ userId, name, users }: AssigneeAvatarProps) => {
    if (!userId || name === '—') return <span>—</span>;
    const user = users.find((u) => String(u.id) === String(userId));
    const photo = user?.profileImage ? resolveImageUrl(user.profileImage) : undefined;

    return (
        <span className="crm-assignee-cell">
            {/* label always set, not cleared just because a photo exists - see
                CommonUtilities.tsx's renderUserAvatar for why: PrimeReact's Avatar only falls
                back to the label once the image 404s/errors, but only if there's a label to
                fall back to. */}
            <Avatar
                label={getInitials(name)}
                image={photo}
                shape="circle"
                className="crm-assignee-avatar"
                style={{ background: getColorForString(String(userId)) }}
            />
            <span className="crm-assignee-name">{name}</span>
        </span>
    );
};
export default AssigneeAvatar;

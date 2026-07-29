import { Message } from 'primereact/message';
import './InfoBanner.css';

interface InfoBannerProps {
    text: string;
    variant?: 'info' | 'warning';
}

const severityMap = { info: 'info', warning: 'warn' } as const;

const InfoBanner = ({ text, variant = 'info' }: InfoBannerProps) => {
    return (
        <Message
            severity={severityMap[variant]}
            text={text}
            className="info-banner"
        />
    );
};

export default InfoBanner;
